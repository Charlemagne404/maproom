import { geoCentroid, geoDistance } from 'd3-geo'
import { merge } from 'topojson-client'
import { topology } from 'topojson-server'
import { territoryRelations, excludedParentRelations } from './territory-relations.mjs'

const toRadians = (degrees) => degrees * Math.PI / 180
// Natural Earth's admin-0 split follows control, while this game asks for the geographic island.
const naturalEarthCyprusIslandParts = new Map([['CYN', 'CYP'], ['CNM', 'CYP']])

export function normalizeNaturalEarthGeometry(collection, countries) {
  const countriesByIso3 = new Map(countries.map((country) => [country.cca3, country]))
  const countriesByName = new Map()
  for (const country of countries) {
    for (const name of [country.name?.common, country.name?.official, ...(country.altSpellings ?? [])]) {
      if (name) countriesByName.set(normalize(name), country)
    }
  }

  const output = []
  const assignments = []
  for (const sourceFeature of collection.features ?? []) {
    const properties = sourceFeature.properties ?? {}
    const candidates = [properties.ADM0_A3, properties.ISO_A3_EH, properties.ISO_A3, properties.GU_A3, properties.SOV_A3]
      .filter((value) => typeof value === 'string' && /^[A-Z]{3}$/.test(value))
    const sourceCountry = candidates.map((code) => countriesByIso3.get(code)).find(Boolean)
      ?? [properties.ADMIN, properties.NAME_EN, properties.NAME, properties.NAME_LONG]
        .map((name) => countriesByName.get(normalize(name)))
        .find(Boolean)
    const sourceIso3 = naturalEarthCyprusIslandParts.get(properties.ADM0_A3) ?? sourceCountry?.cca3 ?? null
    const geometry = sourceFeature.geometry
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) continue
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    const polygonsByCountry = new Map()

    for (const polygon of polygons) {
      const territory = sourceIso3 ? nearestBundledTerritory(polygon, sourceIso3, countriesByIso3) : null
      const targetIso3 = territory?.iso3 ?? sourceIso3
      if (territory) assignments.push({ from: sourceIso3, to: territory.iso3, name: territory.country.name.common, featureId: properties.NE_ID ?? null })
      const bucket = polygonsByCountry.get(targetIso3) ?? []
      bucket.push(polygon)
      polygonsByCountry.set(targetIso3, bucket)
    }

    for (const [iso3, assignedPolygons] of polygonsByCountry) {
      const country = countriesByIso3.get(iso3)
      const sourceGeometry = assignedPolygons.length === 1
        ? { type: 'Polygon', coordinates: assignedPolygons[0] }
        : { type: 'MultiPolygon', coordinates: assignedPolygons }
      output.push({
        type: 'Feature',
        id: `${iso3 ?? `ne-${properties.NE_ID ?? output.length}`}-${properties.NE_ID ?? output.length}`,
        properties: {
          iso3,
          name: country?.name?.common ?? properties.ADMIN ?? properties.NAME_EN ?? properties.NAME ?? 'Unlabelled area',
          nameLong: country?.name?.official ?? properties.NAME_LONG ?? null,
          continent: country ? continentFor(country) : properties.CONTINENT ?? null,
          mapUnit: properties.GEOUNIT ?? properties.ADMIN ?? null,
          naturalEarthId: properties.NE_ID ?? null,
          sourceScale: collection.scale ?? null,
          separatedFrom: iso3 && territoryRelations[iso3]?.parentIso3 === sourceIso3 ? sourceIso3 : null,
        },
        geometry: sourceGeometry,
      })
    }
  }
  return { features: dissolveCyprusIslandFeatures(output), assignments }
}

function dissolveCyprusIslandFeatures(features) {
  const cyprusFeatures = features.filter((feature) => feature.properties.iso3 === 'CYP')
  if (cyprusFeatures.length < 2) return features

  const cyprusTopology = topology({
    cyprus: {
      type: 'GeometryCollection',
      geometries: cyprusFeatures.map((feature) => feature.geometry),
    },
  })
  const geometry = merge(cyprusTopology, cyprusTopology.objects.cyprus.geometries)
  const primaryFeature = cyprusFeatures.find((feature) => feature.properties.mapUnit === 'Cyprus') ?? cyprusFeatures[0]
  const mergedFeature = { ...primaryFeature, id: 'CYP-island-geography', geometry }
  const firstCyprusIndex = features.findIndex((feature) => feature.properties.iso3 === 'CYP')

  return features.flatMap((feature, index) => {
    if (index === firstCyprusIndex) return [mergedFeature]
    return feature.properties.iso3 === 'CYP' ? [] : [feature]
  })
}

function nearestBundledTerritory(polygon, parentIso3, countriesByIso3) {
  const centroid = geoCentroid({ type: 'Polygon', coordinates: polygon })
  if (!centroid.every(Number.isFinite)) return null
  let best = null
  for (const [iso3, relation] of Object.entries(territoryRelations)) {
    if (relation.parentIso3 !== parentIso3 || excludedParentRelations.has(iso3)) continue
    const country = countriesByIso3.get(iso3)
    const defaultAnchor = country?.latlng?.length === 2
      ? { lat: country.latlng[0], lon: country.latlng[1] }
      : null
    const anchors = [...(relation.anchors ?? []), ...(defaultAnchor ? [defaultAnchor] : [])]
    const radiusKm = relation.radiusKm ?? 100
    for (const anchor of anchors) {
      const distanceKm = geoDistance(centroid, [anchor.lon, anchor.lat]) * 6371.0088
      if (distanceKm > radiusKm) continue
      if (!best || distanceKm < best.distanceKm) best = { iso3, country, distanceKm }
    }
  }
  return best
}

export function mergeDetailedFallback(worldFeatures, detailedFeatures) {
  const existing = new Set(worldFeatures.map((feature) => feature.properties.iso3).filter(Boolean))
  const added = detailedFeatures.filter((feature) => feature.properties.iso3 && !existing.has(feature.properties.iso3))
  return [...worldFeatures, ...added]
}

export function territoryParentIso3(iso3) {
  return excludedParentRelations.has(iso3) ? null : territoryRelations[iso3]?.parentIso3 ?? null
}

function normalize(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
}

function continentFor(country) {
  if (country.continents?.[0]) return country.continents[0]
  if (country.region !== 'Americas') return country.region ?? null
  if (country.subregion === 'South America') return 'South America'
  if (['North America', 'Central America', 'Caribbean'].includes(country.subregion)) return 'North America'
  return 'Americas'
}

export function geometryCoordinateCount(feature) {
  let count = 0
  const visit = (value) => {
    if (!Array.isArray(value)) return
    if (typeof value[0] === 'number' && typeof value[1] === 'number') count += 1
    else for (const item of value) visit(item)
  }
  visit(feature.geometry?.coordinates)
  return count
}

export function validatePolygonFeature(feature) {
  const geometry = feature.geometry
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return 'geometry must be Polygon or MultiPolygon'
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  if (!polygons.length) return 'geometry has no polygons'
  for (const [polygonIndex, polygon] of polygons.entries()) {
    if (!Array.isArray(polygon) || !polygon.length) return `polygon ${polygonIndex} has no rings`
    for (const [ringIndex, ring] of polygon.entries()) {
      if (!Array.isArray(ring) || ring.length < 4) return `polygon ${polygonIndex} ring ${ringIndex} has fewer than four positions`
      for (const [positionIndex, pair] of ring.entries()) {
        if (!Array.isArray(pair) || pair.length < 2 || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) {
          return `polygon ${polygonIndex} ring ${ringIndex} position ${positionIndex} is invalid`
        }
        if (pair[0] < -180 || pair[0] > 180 || pair[1] < -90 || pair[1] > 90) {
          return `polygon ${polygonIndex} ring ${ringIndex} position ${positionIndex} is out of range`
        }
      }
      const first = ring[0]
      const last = ring.at(-1)
      if (first[0] !== last[0] || first[1] !== last[1]) return `polygon ${polygonIndex} ring ${ringIndex} is not closed`
      for (let index = 1; index < ring.length; index += 1) {
        if (Math.abs(ring[index][0] - ring[index - 1][0]) > 180) return `polygon ${polygonIndex} ring ${ringIndex} crosses the longitude wrap without a split`
      }
    }
  }
  return null
}

export function wrappedLongitudeDelta(from, to) {
  let delta = ((to - from + 540) % 360) - 180
  if (delta === -180) delta = 180
  return toRadians(delta)
}
