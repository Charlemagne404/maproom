import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import { loadGeography, loadMajorCities, resetGeographyCacheForTests } from '../src/geography/data'
import type { City, GeoFeature } from '../src/geography/types'

const countryTopology = {
  type: 'Topology',
  transform: { scale: [1, 1], translate: [0, 0] },
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: [{ type: 'Polygon', id: 'TST', arcs: [[0]], properties: { iso3: 'TST', name: 'Test' } }],
    },
  },
  arcs: [[[0, 0], [2, 0], [0, 2], [-2, 0], [0, -2]]],
} as unknown as Topology
const countryCollection = feature(countryTopology, countryTopology.objects.countries) as GeoJSON.FeatureCollection
const countryFeature = countryCollection.features[0] as unknown as GeoFeature

const majorCity = {
  id: '1001', name: 'Example City', aliases: [], lat: 1, lon: 2,
  countryIso2: 'EX', countryIso3: 'EXA', admin1Code: null,
  population: 50_000, featureCode: 'PPL', capital: false,
} satisfies City

let requests: string[]
let majorCityRows: City[]

beforeEach(() => {
  resetGeographyCacheForTests()
  requests = []
  majorCityRows = [majorCity]
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    requests.push(url)
    const payload = url.endsWith('/data/countries.json')
      ? { schemaVersion: 1, countries: [{ iso3: 'TST', name: 'Test country' }] }
      : url.endsWith('/data/cities-major.json')
        ? { schemaVersion: 1, cities: majorCityRows }
        : countryTopology
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
})

afterEach(() => {
  resetGeographyCacheForTests()
  vi.unstubAllGlobals()
})

describe('geography loader', () => {
  it('loads country facts without requesting boundary geometry', async () => {
    const data = await loadGeography(false)

    expect(requests).toEqual(['/data/countries.json'])
    expect(data.countries.map((country) => country.iso3)).toEqual(['TST'])
    expect(data.features).toEqual([])
    expect(data.featuresByCode.size).toBe(0)
  })

  it('loads and indexes boundaries only when a later caller needs them', async () => {
    const catalogueOnly = await loadGeography(false)
    const withGeometry = await loadGeography()

    expect(requests.sort()).toEqual(['/data/countries.json', '/data/countries.topo.json'])
    expect(catalogueOnly.features).toEqual([])
    expect(withGeometry.features).toEqual([countryFeature])
    expect(withGeometry.featuresByCode.get('TST')).toEqual([countryFeature])
  })

  it('loads the compact city comparison file independently and shares its request', async () => {
    const first = loadMajorCities()
    const second = loadMajorCities()

    await expect(first).resolves.toEqual({ cities: [majorCity], schemaVersion: 1 })
    expect(second).toBe(first)
    expect(requests).toEqual(['/data/cities-major.json'])
  })

  it('rejects out-of-range compact records and retries after a failed request', async () => {
    majorCityRows = [{ ...majorCity, population: 49_999 }]

    await expect(loadMajorCities()).rejects.toThrow('compact city comparison dataset is malformed')

    majorCityRows = [majorCity]
    await expect(loadMajorCities()).resolves.toEqual({ cities: [majorCity], schemaVersion: 1 })
    expect(requests).toEqual(['/data/cities-major.json', '/data/cities-major.json'])
  })
})
