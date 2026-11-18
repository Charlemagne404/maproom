import type { City, CityData, Country, GeoFeature, GeographyData, RegionCollection, RiverFeature } from './types'
import type { Topology } from 'topojson-specification'

let geographyPromise: Promise<GeographyData> | undefined
let countryCatalogPromise: Promise<Pick<GeographyData, 'countries' | 'countriesByCode'>> | undefined
let countryFeaturesPromise: Promise<GeoFeature[]> | undefined
let outlineFeaturesPromise: Promise<GeoFeature[]> | undefined
let cityPromise: Promise<CityData> | undefined
let majorCityPromise: Promise<CityData> | undefined
let riversPromise: Promise<RiverFeature[]> | undefined
const regionPromises = new Map<string, Promise<RegionCollection>>()

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`)
  return response.json() as Promise<T>
}

export function loadGeography(includeCountryGeometry = true): Promise<GeographyData> {
  if (!includeCountryGeometry) {
    return loadCountryCatalog().then((catalog) => ({ ...catalog, features: [], featuresByCode: new Map() }))
  }
  geographyPromise ??= Promise.all([loadCountryCatalog(), loadCountryFeatures()]).then(([catalog, features]) => ({
    ...catalog,
    features,
    featuresByCode: indexFeaturesByCode(features),
  })).catch((error) => {
    geographyPromise = undefined
    throw error
  })
  return geographyPromise
}

function loadCountryCatalog(): Promise<Pick<GeographyData, 'countries' | 'countriesByCode'>> {
  countryCatalogPromise ??= getJson<{ schemaVersion: number; countries: Country[] }>('/data/countries.json').then((catalog) => {
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.countries)) {
      throw new Error('The bundled geography data has an unsupported schema version.')
    }
    const countries = catalog.countries.filter((country) => country.iso3 && country.name)
    const countriesByCode = new Map(countries.map((country) => [country.iso3, country]))
    return { countries, countriesByCode }
  }).catch((error) => {
    countryCatalogPromise = undefined
    throw error
  })
  return countryCatalogPromise
}

function loadCountryFeatures(): Promise<GeoFeature[]> {
  countryFeaturesPromise ??= loadTopologicalFeatures('/data/countries.topo.json', 'The bundled country geometry is malformed.').catch((error) => {
    countryFeaturesPromise = undefined
    throw error
  })
  return countryFeaturesPromise
}

async function loadTopologicalFeatures(url: string, malformedMessage: string): Promise<GeoFeature[]> {
  const [data, topojson] = await Promise.all([getJson<Topology>(url), import('topojson-client')])
  const object = data?.objects?.countries
  if (!data || data.type !== 'Topology' || !object || object.type !== 'GeometryCollection' || !Array.isArray(object.geometries)) {
    throw new Error(malformedMessage)
  }
  const collection = topojson.feature(data, object)
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error(malformedMessage)
  }
  return collection.features.filter((feature) => feature.geometry && feature.properties) as GeoFeature[]
}

function indexFeaturesByCode(features: GeoFeature[]): Map<string, GeoFeature[]> {
  const featuresByCode = new Map<string, GeoFeature[]>()
  for (const feature of features) {
    const code = feature.properties.iso3
    if (!code) continue
    const existing = featuresByCode.get(code) ?? []
    existing.push(feature)
    featuresByCode.set(code, existing)
  }
  return featuresByCode
}

export function loadOutlineFeatures(): Promise<GeoFeature[]> {
  outlineFeaturesPromise ??= loadTopologicalFeatures('/data/countries-outline.topo.json', 'The detailed country outline data is malformed.').catch((error) => {
    outlineFeaturesPromise = undefined
    throw error
  })
  return outlineFeaturesPromise
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

export function loadMajorCities(): Promise<CityData> {
  majorCityPromise ??= getJson<{ schemaVersion: number; cities: City[] }>('/data/cities-major.json').then((data) => {
    if (data.schemaVersion !== 1 || !Array.isArray(data.cities) || data.cities.some((city) => city.population < 50_000)) {
      throw new Error('The compact city comparison dataset is malformed.')
    }
    return data
  }).catch((error) => {
    majorCityPromise = undefined
    throw error
  })
  return majorCityPromise
}

export function loadRivers(): Promise<RiverFeature[]> {
  riversPromise ??= getJson<{ schemaVersion: number; features: RiverFeature[] }>('/data/rivers.json').then((data) => {
    if (data.schemaVersion !== 1 || !Array.isArray(data.features)) throw new Error('The river atlas has an unsupported data format.')
    const features = data.features.filter((item) => item.type === 'Feature'
      && typeof item.id === 'string'
      && typeof item.properties?.name === 'string'
      && Number.isInteger(item.properties?.scaleRank)
      && item.properties.scaleRank >= 1
      && item.properties.scaleRank <= 4
      && item.geometry
      && (item.geometry.type === 'LineString' || item.geometry.type === 'MultiLineString'))
    if (features.length < 50) throw new Error('The river atlas does not have enough valid river lines.')
    return features
  }).catch((error) => {
    riversPromise = undefined
    throw error
  })
  return riversPromise
}

export function loadRegions(iso3: string): Promise<RegionCollection> {
  const code = iso3.toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return Promise.reject(new Error('Choose a valid country before loading subdivisions.'))
  let request = regionPromises.get(code)
  if (!request) {
    const pending: Promise<RegionCollection> = Promise.all([
      getJson<Topology & { countryIso3: string; boundaryId: string; year: string }>(`/data/regions/${code}.topo.json`),
      import('topojson-client'),
      import('./regionGeometry'),
    ]).then(([data, topojson, regionGeometry]) => {
      if (data.countryIso3 !== code || !data.objects.regions) {
        throw new Error('The subdivision dataset is malformed.')
      }
      const collection = topojson.feature(data, data.objects.regions) as GeoJSON.FeatureCollection
      if (!Array.isArray(collection.features)) throw new Error('The subdivision geometries could not be read.')
      return {
        type: 'FeatureCollection' as const,
        countryIso3: code,
        boundaryId: data.boundaryId,
        year: data.year,
        features: collection.features.map(regionGeometry.normalizeRegionFeature) as unknown as GeoFeature[],
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

export function resetGeographyCacheForTests(): void {
  geographyPromise = undefined
  countryCatalogPromise = undefined
  countryFeaturesPromise = undefined
  outlineFeaturesPromise = undefined
  cityPromise = undefined
  majorCityPromise = undefined
  riversPromise = undefined
  regionPromises.clear()
}
