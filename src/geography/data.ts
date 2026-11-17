import type { CityData, Country, GeoFeature, GeographyData, RegionCollection } from './types'
import { geoArea } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'

let geographyPromise: Promise<GeographyData> | undefined
let cityPromise: Promise<CityData> | undefined
const regionPromises = new Map<string, Promise<RegionCollection>>()

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`)
  return response.json() as Promise<T>
}

export function loadGeography(): Promise<GeographyData> {
  geographyPromise ??= Promise.all([
    getJson<{ schemaVersion: number; countries: Country[] }>('/data/countries.json'),
    getJson<{ type: 'FeatureCollection'; features: GeoFeature[] }>('/data/countries.geojson'),
  ]).then(([catalog, collection]) => {
    if (catalog.schemaVersion !== 1 || collection.type !== 'FeatureCollection') {
      throw new Error('The bundled geography data has an unsupported schema version.')
    }
    const countries = catalog.countries.filter((country) => country.iso3 && country.name)
    const countriesByCode = new Map(countries.map((country) => [country.iso3, country]))
    const features = collection.features.filter((feature) => feature.geometry && feature.properties)
    const featuresByCode = new Map<string, GeoFeature[]>()
    for (const feature of features) {
      const code = feature.properties.iso3
      if (!code) continue
      const existing = featuresByCode.get(code) ?? []
      existing.push(feature)
      featuresByCode.set(code, existing)
    }
    return { countries, features, countriesByCode, featuresByCode }
  }).catch((error) => {
    geographyPromise = undefined
    throw error
  })
  return geographyPromise
}

export function loadCities(): Promise<CityData> {
  cityPromise ??= getJson<CityData>('/data/cities.json').then((data) => {
    if (!Array.isArray(data.cities)) throw new Error('The city dataset is malformed.')
    return data
  }).catch((error) => {
    cityPromise = undefined
    throw error
  })
  return cityPromise
}

export function loadRegions(iso3: string): Promise<RegionCollection> {
  const code = iso3.toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return Promise.reject(new Error('Choose a valid country before loading subdivisions.'))
  let request = regionPromises.get(code)
  if (!request) {
    const pending: Promise<RegionCollection> = getJson<Topology & { countryIso3: string; boundaryId: string; year: string }>(`/data/regions/${code}.topo.json`).then((data) => {
      if (data.countryIso3 !== code || !data.objects.regions) {
        throw new Error('The subdivision dataset is malformed.')
      }
      const collection = feature(data, data.objects.regions) as GeoJSON.FeatureCollection
      if (!Array.isArray(collection.features)) throw new Error('The subdivision geometries could not be read.')
      return {
        type: 'FeatureCollection' as const,
        countryIso3: code,
        boundaryId: data.boundaryId,
        year: data.year,
        features: collection.features.map(normalizeRegionFeature) as unknown as GeoFeature[],
      }
    }).catch((error) => {
      regionPromises.delete(code)
      throw error
    })
    request = pending
    regionPromises.set(code, pending)
  }
  return request!
}

export function normalizeRegionFeature(region: GeoJSON.Feature): GeoJSON.Feature {
  const name = region.properties?.name
  const correctedName = typeof name === 'string' ? repairMojibake(name) : name
  const normalized = correctedName && correctedName !== name
    ? { ...region, properties: { ...region.properties, name: correctedName } }
    : region
  const geometry = normalized.geometry
  // geoBoundaries rings can use RFC 7946 winding, which d3-geo reads as the globe's complement.
  if (geometry.type === 'Polygon') {
    const polygon = geometry.coordinates
    if (geoArea({ type: 'Polygon', coordinates: polygon }) <= Math.PI * 2) return normalized
    return { ...normalized, geometry: { ...geometry, coordinates: reverseRings(polygon) } }
  }
  if (geometry.type === 'MultiPolygon') {
    let changed = false
    const polygons = geometry.coordinates.map((polygon) => {
      if (geoArea({ type: 'Polygon', coordinates: polygon }) <= Math.PI * 2) return polygon
      changed = true
      return reverseRings(polygon)
    })
    return changed ? { ...normalized, geometry: { ...geometry, coordinates: polygons } } : normalized
  }
  return normalized
}

function reverseRings(rings: GeoJSON.Position[][]): GeoJSON.Position[][] {
  return rings.map((ring) => [...ring].reverse())
}

function repairMojibake(value: string): string {
  if (!/[ÃÂ]/u.test(value)) return value
  const codePoints = [...value].map((character) => character.codePointAt(0)!)
  if (codePoints.some((codePoint) => codePoint > 0xff)) return value
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(codePoints))
    return /[ÃÂ�]/u.test(decoded) ? value : decoded
  } catch {
    return value
  }
}

export function resetGeographyCacheForTests(): void {
  geographyPromise = undefined
  cityPromise = undefined
  regionPromises.clear()
}
