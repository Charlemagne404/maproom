import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { geoArea } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import { normalizeRegionFeature } from '../src/geography/data'
import type { City, Country, GeoFeature } from '../src/geography/types'
import { generateRoutePuzzle, gridCandidates, validGridPresets, buildAdjacency, normalizeAnswer } from '../src/puzzles/engine'

const dataDir = join(process.cwd(), 'public', 'data')
const catalog = JSON.parse(readFileSync(join(dataDir, 'countries.json'), 'utf8')) as { schemaVersion: number; countries: Country[] }
const collection = JSON.parse(readFileSync(join(dataDir, 'countries.geojson'), 'utf8')) as { type: string; features: GeoFeature[] }
const cityData = JSON.parse(readFileSync(join(dataDir, 'cities.json'), 'utf8')) as { schemaVersion: number; cities: City[] }
const coverage = JSON.parse(readFileSync(join(dataDir, 'coverage.json'), 'utf8')) as { countryCodesWithGeometry: number; admin1CountriesIncluded: number; admin1UnitsIncluded: number; cityCount: number }
const regionIndex = JSON.parse(readFileSync(join(dataDir, 'region-index.json'), 'utf8')) as Array<{
  iso3: string; count: number; status: string; license: string; artifactSha256: string; artifactBytes: number
}>
const manifest = JSON.parse(readFileSync(join(dataDir, 'data-manifest.json'), 'utf8')) as {
  sources: Array<{ name: string; sha256?: string; licenseSha256?: string; retrievedAt: string; license: string }>
  artifacts: { countriesGeoJSONSha256: string; countriesCatalogSha256: string; citiesSha256: string; coverageSha256: string; regionIndexSha256: string; regionPackages: Array<{ iso3: string; sha256: string; bytes: number }> }
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
    expect(new Set(catalog.countries.map((country) => country.iso3)).size).toBe(catalog.countries.length)
    const byCode = new Map(catalog.countries.map((country) => [country.iso3, country]))
    const flagsCss = readFileSync(join(process.cwd(), 'node_modules', 'flag-icons', 'css', 'flag-icons.min.css'), 'utf8')
    for (const country of catalog.countries) {
      expect(country.iso3).toMatch(/^[A-Z]{3}$/)
      expect(country.iso2).toMatch(/^[A-Z]{2}$/)
      expect(country.flagCode).toBe(country.iso2.toLowerCase())
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
    for (const item of collection.features) {
      expect(item.type).toBe('Feature')
      expect(item.properties.name.length).toBeGreaterThan(0)
      expect(['Polygon', 'MultiPolygon']).toContain(item.geometry.type)
      if (item.geometry.type === 'GeometryCollection') throw new Error('Country map features must contain polygon geometry.')
      const pairs = coordinatePairs(item.geometry.coordinates)
      expect(pairs.length).toBeGreaterThan(0)
      for (const [lon, lat] of pairs) {
        expect(Number.isFinite(lon)).toBe(true)
        expect(Number.isFinite(lat)).toBe(true)
        expect(lon).toBeGreaterThanOrEqual(-180.001)
        expect(lon).toBeLessThanOrEqual(180.001)
        expect(lat).toBeGreaterThanOrEqual(-90.001)
        expect(lat).toBeLessThanOrEqual(90.001)
      }
    }
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
