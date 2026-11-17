import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { geoArea, geoContains, geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import { normalizeRegionFeature } from '../src/geography/data'
import type { City, Country, GeoFeature } from '../src/geography/types'
import { generateRoutePuzzle, gridCandidates, validGridPresets, buildAdjacency, directionFromTo, normalizeAnswer } from '../src/puzzles/engine'
import { classifyGeography, eligibleCountries, eligibleFeatures, isStandardCountry, standardCountryCount } from '../src/geography/eligibility'
import { validatePolygonFeature } from '../scripts/data/country-geometry.mjs'
import { territoryRelations, excludedParentRelations } from '../scripts/data/territory-relations.mjs'

const dataDir = join(process.cwd(), 'public', 'data')
const catalog = JSON.parse(readFileSync(join(dataDir, 'countries.json'), 'utf8')) as { schemaVersion: number; countries: Country[] }
const collection = JSON.parse(readFileSync(join(dataDir, 'countries.geojson'), 'utf8')) as { type: string; features: GeoFeature[] }
const cityData = JSON.parse(readFileSync(join(dataDir, 'cities.json'), 'utf8')) as { schemaVersion: number; cities: City[] }
const coverage = JSON.parse(readFileSync(join(dataDir, 'coverage.json'), 'utf8')) as { countryCatalogCount: number; countryCodesWithGeometry: number; countryGeometryFeatureCount?: number; outlineGeometryFeatureCount?: number; admin1CountriesIncluded: number; admin1UnitsIncluded: number; cityCount: number }
const outlineCollection = JSON.parse(readFileSync(join(dataDir, 'countries-outline.geojson'), 'utf8')) as { type: string; features: GeoFeature[] }
const regionIndex = JSON.parse(readFileSync(join(dataDir, 'region-index.json'), 'utf8')) as Array<{
  iso3: string; count: number; status: string; license: string; artifactSha256: string; artifactBytes: number
}>
const manifest = JSON.parse(readFileSync(join(dataDir, 'data-manifest.json'), 'utf8')) as {
  sources: Array<{ name: string; sha256?: string; licenseSha256?: string; retrievedAt: string; license: string }>
  artifacts: { countriesGeoJSONSha256: string; countriesOutlineGeoJSONSha256: string; countriesCatalogSha256: string; citiesSha256: string; coverageSha256: string; regionIndexSha256: string; regionPackages: Array<{ iso3: string; sha256: string; bytes: number }> }
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function coordinatePairs(value: unknown, pairs: number[][] = []): number[][] {
  if (!Array.isArray(value)) return pairs
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    pairs.push(value as number[])
    return pairs
  }
  for (const child of value) coordinatePairs(child, pairs)
  return pairs
}

describe('bundled geography data', () => {
  it('has unique country identities, valid flags, coordinates and neighbor references', () => {
    expect(catalog.schemaVersion).toBe(1)
    expect(catalog.countries.length).toBeGreaterThan(240)
    expect(catalog.countries.length).toBe(coverage.countryCatalogCount)
    expect(new Set(catalog.countries.map((country) => country.iso3)).size).toBe(catalog.countries.length)
    const byCode = new Map(catalog.countries.map((country) => [country.iso3, country]))
    for (const [iso3, relation] of Object.entries(territoryRelations)) {
      expect(byCode.get(iso3)?.parentIso3, `${iso3} has an explicit parent`).toBe(relation.parentIso3)
    }
    for (const iso3 of excludedParentRelations) expect(byCode.get(iso3)?.parentIso3, `${iso3} sovereignty is not inferred`).toBeNull()
    for (const country of catalog.countries) {
      expect(country.independent || country.parentIso3 || excludedParentRelations.has(country.iso3), `${country.iso3} is classified without inventing sovereignty`).toBeTruthy()
      if (country.parentIso3) expect(country.independent, `${country.iso3} remains a territory`).toBe(false)
    }
    const flagsCss = readFileSync(join(process.cwd(), 'node_modules', 'flag-icons', 'css', 'flag-icons.min.css'), 'utf8')
    for (const country of catalog.countries) {
      expect(country.iso3).toMatch(/^[A-Z]{3}$/)
      if (country.iso2) expect(country.iso2).toMatch(/^[A-Z]{2}$/)
      if (country.iso2) expect(country.flagCode).toBe(country.iso2.toLowerCase())
      expect(flagsCss).toContain(`.fi-${country.flagCode}.`)
      expect(country.aliases.map(normalizeAnswer)).toContain(normalizeAnswer(country.name))
      if (country.population !== null) expect(country.populationYear).toBe('2023')
      if (country.capitalCoordinates) {
        expect(country.capitalCoordinates.lat).toBeGreaterThanOrEqual(-90)
        expect(country.capitalCoordinates.lat).toBeLessThanOrEqual(90)
        expect(country.capitalCoordinates.lon).toBeGreaterThanOrEqual(-180)
        expect(country.capitalCoordinates.lon).toBeLessThanOrEqual(180)
      }
      for (const border of country.borders) {
        expect(byCode.has(border)).toBe(true)
        expect(byCode.get(border)?.borders).toContain(country.iso3)
      }
    }
  })

  it('contains valid world geometry and supports every advertised country code', () => {
    expect(collection.type).toBe('FeatureCollection')
    expect(collection.features.length).toBeGreaterThan(230)
    const codes = new Set(catalog.countries.filter((country) => country.hasGeometry).map((country) => country.iso3))
    expect(codes.size).toBe(coverage.countryCodesWithGeometry)
    expect(outlineCollection.type).toBe('FeatureCollection')
    expect(coverage.countryGeometryFeatureCount).toBe(collection.features.length)
    expect(coverage.outlineGeometryFeatureCount).toBe(outlineCollection.features.length)
    const projectedByFeatures = new Map<GeoFeature[], (feature: GeoJSON.Feature) => string | null>()
    for (const features of [collection.features, outlineCollection.features]) {
      const source = { type: 'FeatureCollection', features: features as unknown as GeoJSON.Feature[] } as GeoJSON.FeatureCollection
      projectedByFeatures.set(features, geoPath(geoEqualEarth().fitExtent([[24, 24], [936, 456]], source)))
    }
    const allFeatures = [...collection.features, ...outlineCollection.features]
    for (const item of allFeatures) {
      expect(item.type).toBe('Feature')
      expect(item.properties.name.length).toBeGreaterThan(0)
      expect(['Polygon', 'MultiPolygon']).toContain(item.geometry.type)
      const error = validatePolygonFeature(item)
      expect(error, `${item.properties.iso3 ?? item.id}: ${error ?? ''}`).toBeNull()
      const pairs = coordinatePairs((item.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates)
      expect(pairs.length).toBeGreaterThan(0)
      for (const [lon, lat] of pairs) {
        expect(Number.isFinite(lon)).toBe(true)
        expect(Number.isFinite(lat)).toBe(true)
        expect(lon).toBeGreaterThanOrEqual(-180)
        expect(lon).toBeLessThanOrEqual(180)
        expect(lat).toBeGreaterThanOrEqual(-90)
        expect(lat).toBeLessThanOrEqual(90)
      }
      const featureSet = collection.features.includes(item) ? collection.features : outlineCollection.features
      const projected = projectedByFeatures.get(featureSet)?.(item as unknown as GeoJSON.Feature)
      expect(projected, `${item.properties.iso3 ?? item.id} projection path`).toBeTruthy()
      expect(projected).not.toMatch(/NaN|Infinity|undefined/)
      const geometry = item.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
      const ringCount = polygons.reduce((count, polygon) => count + polygon.length, 0)
      expect(projected?.match(/M/g)?.length ?? 0, `${item.properties.iso3 ?? item.id} keeps every polygon ring in its own path`).toBeGreaterThanOrEqual(ringCount)
      expect(geoArea(item as unknown as GeoJSON.Feature)).toBeLessThan(Math.PI * 2)
    }
    for (const code of ['AIA', 'NLD', 'BES', 'IDN', 'JPN', 'PHL', 'SJM', 'UMI', 'CLP']) {
      const features = outlineCollection.features.filter((item) => item.properties.iso3 === code)
      const grouped = { type: 'FeatureCollection', features: features as unknown as GeoJSON.Feature[] } as GeoJSON.FeatureCollection
      const projection = geoEqualEarth().fitExtent([[24, 24], [936, 456]], grouped)
      const paths = features.map((item) => geoPath(projection)(item as unknown as GeoJSON.Feature))
      expect(paths.every((path) => path && path.startsWith('M') && !/NaN|Infinity/.test(path)), `${code} local fitted outline`).toBe(true)
    }
    expect(new Set(collection.features.map((item) => item.properties.iso3).filter(Boolean))).toEqual(codes)
    expect(new Set(outlineCollection.features.map((item) => item.properties.iso3).filter(Boolean))).toEqual(codes)
    const anguillaOutline = outlineCollection.features.filter((item) => item.properties.iso3 === 'AIA')
    const anguillaGeometry = anguillaOutline[0]?.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
    expect(anguillaGeometry.type).toBe('MultiPolygon')
    expect(anguillaGeometry.coordinates).toHaveLength(6)
    expect(anguillaOutline.reduce((count, item) => count + coordinatePairs((item.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates).length, 0)).toBeGreaterThan(50)
  }, 60_000)

  it('keeps overseas components separate and preserves domestic archipelagos', () => {
    const byCode = new Map(catalog.countries.map((country) => [country.iso3, country]))
    for (const country of catalog.countries) {
      if (country.parentIso3) {
        expect(byCode.has(country.parentIso3), `${country.iso3} parent is in the catalog`).toBe(true)
        expect(country.independent).toBe(false)
      }
    }
    for (const feature of [...collection.features, ...outlineCollection.features]) {
      const code = feature.properties.iso3
      if (feature.properties.separatedFrom) {
        expect(code).toBeTruthy()
        expect(byCode.get(code!)?.parentIso3, `${code} detached from its named parent`).toBe(feature.properties.separatedFrom)
      }
    }
    for (const [iso3, relation] of Object.entries(territoryRelations)) {
      const territory = byCode.get(iso3)
      const ownFeatures = outlineCollection.features.filter((feature) => feature.properties.iso3 === iso3)
      const parentFeatures = outlineCollection.features.filter((feature) => feature.properties.iso3 === relation.parentIso3)
      expect(territory, `${iso3} has a catalogue identity`).toBeDefined()
      expect(ownFeatures.length, `${iso3} has its own detailed geometry`).toBeGreaterThan(0)
      expect(parentFeatures.length, `${relation.parentIso3} parent has detailed geometry`).toBeGreaterThan(0)
      const representativePoints = [territory!.coordinates, ...(relation.anchors ?? []).map((anchor) => ({ lat: anchor.lat, lon: anchor.lon }))].filter((point) => point !== null)
      for (const point of representativePoints) {
        expect(parentFeatures.some((feature) => geoContains(feature as unknown as GeoJSON.Feature, [point!.lon, point!.lat])), `${iso3} representative geography is not duplicated in ${relation.parentIso3}`).toBe(false)
      }
    }
    const inCountry = (features: GeoFeature[], iso3: string, lat: number, lon: number) =>
      features.filter((item) => item.properties.iso3 === iso3)
        .some((item) => geoContains(item as unknown as GeoJSON.Feature, [lon, lat]))
    const bounds = (features: GeoFeature[], iso3: string) => {
      const coordinates = features.filter((item) => item.properties.iso3 === iso3).flatMap((item) => coordinatePairs((item.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates))
      return [Math.min(...coordinates.map(([lon]) => lon)), Math.min(...coordinates.map(([, lat]) => lat)), Math.max(...coordinates.map(([lon]) => lon)), Math.max(...coordinates.map(([, lat]) => lat))]
    }

    expect(inCountry(outlineCollection.features, 'NLD', 52, 5)).toBe(true)
    for (const [code, lat, lon] of [['BES', 12.15, -68.27], ['BES', 17.63, -63.24], ['BES', 17.49, -62.97], ['ABW', 12.5, -69.96], ['CUW', 12.12, -68.93], ['SXM', 18.03, -63.05]] as const) {
      expect(inCountry(outlineCollection.features, 'NLD', lat, lon), `Netherlands excludes ${code} (${lat},${lon})`).toBe(false)
      expect(inCountry(outlineCollection.features, code, lat, lon), `${code} owns its component`).toBe(true)
    }
    expect(bounds(outlineCollection.features, 'NLD')[0]).toBeGreaterThan(3)
    expect(bounds(outlineCollection.features, 'NLD')[2]).toBeLessThan(8)

    expect(inCountry(outlineCollection.features, 'FRA', 47, 2)).toBe(true)
    for (const [code, lat, lon] of [['GUF', 4, -53], ['GLP', 16.25, -61.58], ['MTQ', 14.67, -61], ['MYT', -12.83, 45.17], ['REU', -21.15, 55.5], ['CLP', 10.297324, -109.22045]] as const) {
      expect(inCountry(outlineCollection.features, 'FRA', lat, lon), `France excludes ${code}`).toBe(false)
      expect(inCountry(outlineCollection.features, code, lat, lon), `${code} owns its component`).toBe(true)
    }
    for (const [code, lat, lon] of [['CXR', -10.5, 105.67], ['CCK', -12.195, 96.845], ['ATC', -12.4326, 123.5864], ['CSI', -21.029285, 154.390366]] as const) {
      expect(inCountry(outlineCollection.features, 'AUS', lat, lon), `Australia excludes ${code}`).toBe(false)
      expect(inCountry(outlineCollection.features, code, lat, lon), `${code} owns its component`).toBe(true)
    }
    for (const [code, lat, lon] of [['WSB', 34.631818, 32.934038], ['ESB', 35.017794, 33.792986]] as const) {
      expect(inCountry(outlineCollection.features, 'CYP', lat, lon), `Cyprus excludes ${code}`).toBe(false)
      expect(inCountry(outlineCollection.features, code, lat, lon), `${code} owns its territory geometry`).toBe(true)
    }
    expect(inCountry(outlineCollection.features, 'NOR', 78.2, 15.6)).toBe(false)
    expect(inCountry(outlineCollection.features, 'SJM', 78.2, 15.6)).toBe(true)
    expect(inCountry(outlineCollection.features, 'NOR', -54.43, 3.4)).toBe(false)
    expect(inCountry(outlineCollection.features, 'BVT', -54.43, 3.4)).toBe(true)
    expect(inCountry(outlineCollection.features, 'NZL', -9.34614, -171.19458)).toBe(false)
    expect(inCountry(outlineCollection.features, 'TKL', -9.34614, -171.19458)).toBe(true)

    expect(inCountry(outlineCollection.features, 'IDN', -7.3, 110.3)).toBe(true)
    expect(inCountry(outlineCollection.features, 'IDN', -0.5, 101)).toBe(true)
    expect(inCountry(outlineCollection.features, 'JPN', 35.6, 139.7)).toBe(true)
    expect(inCountry(outlineCollection.features, 'JPN', 43, 142)).toBe(true)
    expect(inCountry(outlineCollection.features, 'JPN', 26.2, 127.7)).toBe(true)
    expect(inCountry(outlineCollection.features, 'PHL', 14.6, 120.98)).toBe(true)
    expect(inCountry(outlineCollection.features, 'PHL', 9.8, 118.7)).toBe(true)
    expect(bounds(outlineCollection.features, 'IDN')[3] - bounds(outlineCollection.features, 'IDN')[1]).toBeGreaterThan(15)
    expect(bounds(outlineCollection.features, 'JPN')[2] - bounds(outlineCollection.features, 'JPN')[0]).toBeGreaterThan(25)
    expect(bounds(outlineCollection.features, 'PHL')[3] - bounds(outlineCollection.features, 'PHL')[1]).toBeGreaterThan(15)
  })

  it('uses the entire Cyprus island outline and keeps Akrotiri and Dhekelia separate', () => {
    for (const [layer, features] of [['world', collection.features], ['outline', outlineCollection.features]] as const) {
      const cyprusFeatures = features.filter((feature) => feature.properties.iso3 === 'CYP')
      expect(cyprusFeatures, `${layer} has one dissolved Cyprus outline`).toHaveLength(1)
      const cyprus = cyprusFeatures[0]!
      const contains = (iso3: string, lat: number, lon: number) => features
        .filter((feature) => feature.properties.iso3 === iso3)
        .some((feature) => geoContains(feature as unknown as GeoJSON.Feature, [lon, lat]))
      const coordinates = coordinatePairs(cyprus.geometry.coordinates)
      expect(Math.max(...coordinates.map(([, latitude]) => latitude)), `${layer} reaches the northern coast`).toBeGreaterThan(35.6)
      expect(Math.max(...coordinates.map(([longitude]) => longitude)), `${layer} reaches the Karpas peninsula`).toBeGreaterThan(34.5)
      expect(geoContains(cyprus as unknown as GeoJSON.Feature, [33.6, 35.3])).toBe(true)
      expect(geoContains(cyprus as unknown as GeoJSON.Feature, [33.94, 35.12])).toBe(true)
    }

    const outlineContains = (iso3: string, lat: number, lon: number) => outlineCollection.features
      .filter((feature) => feature.properties.iso3 === iso3)
      .some((feature) => geoContains(feature as unknown as GeoJSON.Feature, [lon, lat]))
    for (const [code, lat, lon] of [['WSB', 34.631818, 32.934038], ['ESB', 35.017794, 33.792986]] as const) {
      expect(outlineContains('CYP', lat, lon), `Detailed Cyprus outline excludes ${code}`).toBe(false)
      expect(outlineContains(code, lat, lon), `${code} retains its separate outline`).toBe(true)
    }
  })

  it('keeps Standard, ordinary Extended, and special geographic catalogue records distinct', () => {
    expect(standardCountryCount()).toBe(195)
    const standard = eligibleCountries(catalog.countries, 'standard')
    const extended = eligibleCountries(catalog.countries, 'extended')
    const standardMap = eligibleFeatures(collection.features, 'standard')
    const extendedMap = eligibleFeatures(collection.features, 'extended')
    expect(standard).toHaveLength(195)
    expect(extended).toHaveLength(243)
    expect(catalog.countries).toHaveLength(255)
    expect(standard.every((country) => isStandardCountry(country.iso3))).toBe(true)
    expect(standard.some((country) => country.parentIso3 !== null)).toBe(false)
    for (const code of ['BES', 'ABW', 'CUW', 'SXM', 'CYM', 'BMU', 'GRL']) {
      expect(standard.some((country) => country.iso3 === code)).toBe(false)
      expect(extended.some((country) => country.iso3 === code && country.hasGeometry)).toBe(true)
      expect(standardMap.some((feature) => feature.properties.iso3 === code)).toBe(false)
      expect(extendedMap.some((feature) => feature.properties.iso3 === code)).toBe(true)
    }
    for (const code of ['ATA', 'ATC', 'ATF', 'BVT', 'CLP', 'CSI', 'ESB', 'HMD', 'IOT', 'SJM', 'UMI', 'WSB']) {
      expect(classifyGeography(catalog.countries.find((country) => country.iso3 === code)!)).toBe('special-geographic-entity')
      expect(extended.some((country) => country.iso3 === code)).toBe(false)
      expect(extendedMap.some((feature) => feature.properties.iso3 === code)).toBe(false)
    }
    expect(classifyGeography(catalog.countries.find((country) => country.iso3 === 'GGY')!)).toBe('separately-represented-territory')
    expect(classifyGeography(catalog.countries.find((country) => country.iso3 === 'UNK')!)).toBe('additional-identity')

    const outlineCodes = new Set(outlineCollection.features.map((feature) => feature.properties.iso3).filter(Boolean))
    expect(outlineCodes).toEqual(new Set(catalog.countries.map((country) => country.iso3)))
    const unassignedOutlineFeatures = outlineCollection.features.filter((feature) => !feature.properties.iso3)
    expect(unassignedOutlineFeatures).toHaveLength(11)
    expect(new Set(unassignedOutlineFeatures.map((feature) => feature.properties.name))).toEqual(new Set([
      'Somaliland', 'US Naval Base Guantanamo Bay', 'Northern Cyprus', 'Cyprus No Mans Area', 'Siachen Glacier',
      'Southern Patagonian Ice Field', 'Bir Tawil', 'Spratly Islands', 'Bajo Nuevo Bank (Petrel Is.)', 'Serranilla Bank', 'Scarborough Reef',
    ]))
    expect(eligibleFeatures(unassignedOutlineFeatures, 'extended')).toHaveLength(0)
  })

  it('has no ambiguous normalized country aliases', () => {
    const aliases = new Map<string, Set<string>>()
    for (const country of catalog.countries) {
      for (const alias of [country.name, country.officialName, ...country.aliases]) {
        const normalized = normalizeAnswer(alias)
        if (!normalized) continue
        const owners = aliases.get(normalized) ?? new Set<string>()
        owners.add(country.iso3)
        aliases.set(normalized, owners)
      }
    }
    const collisions = [...aliases].filter(([, owners]) => owners.size > 1)
    expect(collisions).toEqual([])
  })

  it('gives directional hints relative to the target using stored country coordinates', () => {
    const byCode = new Map(catalog.countries.map((country) => [country.iso3, country]))
    const unitedStates = byCode.get('USA')!.coordinates!
    const turkmenistan = byCode.get('TKM')!.coordinates!
    const sweden = byCode.get('SWE')!.coordinates!
    expect(directionFromTo(unitedStates, turkmenistan)).toBe('east')
    expect(directionFromTo(turkmenistan, unitedStates)).toBe('west')
    expect(directionFromTo(unitedStates, sweden)).toBe('east')
    expect(directionFromTo(sweden, unitedStates)).toBe('west')
  })

  it('has a substantial, valid city gazetteer and national-capital coordinates', () => {
    expect(cityData.schemaVersion).toBe(1)
    expect(cityData.cities.length).toBeGreaterThan(30_000)
    expect(cityData.cities.length).toBe(coverage.cityCount)
    const countryCodes = new Set(catalog.countries.map((country) => country.iso3))
    expect(new Set(cityData.cities.map((city) => city.id)).size).toBe(cityData.cities.length)
    const capitalCodes = new Set<string>()
    for (const city of cityData.cities) {
      expect(countryCodes.has(city.countryIso3)).toBe(true)
      expect(city.lat).toBeGreaterThanOrEqual(-90)
      expect(city.lat).toBeLessThanOrEqual(90)
      expect(city.lon).toBeGreaterThanOrEqual(-180)
      expect(city.lon).toBeLessThanOrEqual(180)
      if (city.capital) capitalCodes.add(city.countryIso3)
    }
    expect(capitalCodes.size).toBeGreaterThan(150)
    expect(catalog.countries.filter((country) => country.capital && country.capitalCoordinates).length).toBeGreaterThanOrEqual(240)
    expect(catalog.countries.filter((country) => country.population !== null && country.populationYear === '2023').length).toBeGreaterThan(200)
  })

  it('has one licensed, hashed TopoJSON package per supported country', () => {
    const included = regionIndex.filter((entry) => entry.status === 'included')
    expect(included.length).toBe(coverage.admin1CountriesIncluded)
    expect(new Set(included.map((entry) => entry.iso3)).size).toBe(included.length)
    const directory = join(dataDir, 'regions')
    const files = readdirSync(directory).filter((name) => name.endsWith('.topo.json')).sort()
    expect(files.length).toBe(included.length)
    const packageMetadata = new Map(manifest.artifacts.regionPackages.map((item) => [item.iso3, item]))
    for (const entry of included) {
      expect(entry.license.length).toBeGreaterThan(0)
      const filename = `${entry.iso3}.topo.json`
      const path = join(directory, filename)
      const raw = readFileSync(path)
      expect(raw.length).toBe(entry.artifactBytes)
      expect(createHash('sha256').update(raw).digest('hex')).toBe(entry.artifactSha256)
      const topo = JSON.parse(raw.toString('utf8')) as Topology & { countryIso3: string; objects: Record<string, unknown> }
      expect(topo.countryIso3).toBe(entry.iso3)
      expect(topo.objects.regions).toBeDefined()
      const decoded = feature(topo, topo.objects.regions as Topology['objects'][string]) as GeoJSON.FeatureCollection
      expect(decoded.features.length).toBe(entry.count)
      const featureIds = new Set<string>()
      for (const item of decoded.features) {
        expect(typeof item.properties?.name).toBe('string')
        expect(item.properties?.name).not.toBe('')
        expect(item.properties?.countryIso3).toBe(entry.iso3)
        expect(item.geometry).toBeTruthy()
        const id = String(item.id ?? item.properties?.id ?? '')
        if (!item.geometry || (item.geometry.type !== 'Polygon' && item.geometry.type !== 'MultiPolygon')) {
          throw new Error(`Region ${id} has no polygon geometry.`)
        }
        expect(id).not.toBe('')
        expect(featureIds.has(id)).toBe(false)
        featureIds.add(id)
        const pairs = coordinatePairs(item.geometry.coordinates)
        expect(pairs.length).toBeGreaterThan(0)
        let coordinatesAreValid = true
        for (const [longitude, latitude] of pairs) {
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
            || longitude < -180.01 || longitude > 180.01
            || latitude < -90.01 || latitude > 90.01) coordinatesAreValid = false
        }
        expect(coordinatesAreValid, `Region ${id} coordinates are in range`).toBe(true)
        const drawable = normalizeRegionFeature(item)
        expect(drawable.properties?.name).not.toMatch(/[ÃÂ�]/u)
        expect(geoArea(drawable), `${entry.iso3} ${id} has a regional outline, not a globe-sized complement`).toBeLessThan(Math.PI * 2)
      }
      expect(packageMetadata.get(entry.iso3)).toMatchObject({ sha256: entry.artifactSha256, bytes: entry.artifactBytes })
    }
  })

  it('records checksums and license evidence for each data source and artifact', () => {
    expect(manifest.sources.length).toBeGreaterThanOrEqual(5)
    expect(manifest.sources.every((source) => source.retrievedAt && source.license)).toBe(true)
    for (const source of manifest.sources.filter((item) => item.sha256)) expect(source.sha256).toMatch(/^[a-f0-9]{64}$/)
    const countrySource = manifest.sources.find((source) => source.name === 'World country metadata')!
    expect(countrySource.licenseSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(sha256(join(dataDir, 'countries.geojson'))).toBe(manifest.artifacts.countriesGeoJSONSha256)
    expect(sha256(join(dataDir, 'countries-outline.geojson'))).toBe(manifest.artifacts.countriesOutlineGeoJSONSha256)
    expect(sha256(join(dataDir, 'countries.json'))).toBe(manifest.artifacts.countriesCatalogSha256)
    expect(sha256(join(dataDir, 'cities.json'))).toBe(manifest.artifacts.citiesSha256)
    expect(sha256(join(dataDir, 'coverage.json'))).toBe(manifest.artifacts.coverageSha256)
    expect(sha256(join(dataDir, 'region-index.json'))).toBe(manifest.artifacts.regionIndexSha256)
  })

  it('can generate a solvable route and has nine non-empty cells in every grid', () => {
    const puzzle = generateRoutePuzzle(catalog.countries, 'data-integrity')
    const adjacency = buildAdjacency(catalog.countries)
    expect(puzzle.shortest[0]).toBe(puzzle.start)
    expect(puzzle.shortest.at(-1)).toBe(puzzle.end)
    for (let index = 1; index < puzzle.shortest.length; index += 1) {
      expect(adjacency.get(puzzle.shortest[index - 1])).toContain(puzzle.shortest[index])
    }
    const presets = validGridPresets(catalog.countries)
    expect(presets.length).toBeGreaterThan(0)
    for (const preset of presets) {
      expect(preset.rows).toHaveLength(3)
      expect(preset.columns).toHaveLength(3)
      for (const row of preset.rows) for (const column of preset.columns) {
        expect(gridCandidates(catalog.countries, row, column).length).toBeGreaterThan(0)
      }
    }
  })
})
