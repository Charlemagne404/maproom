import { feature } from 'topojson-client'
import { describe, expect, it } from 'vitest'
import type { Country, GeoFeature, RiverFeature } from '../geography/types'
import type { Topology } from 'topojson-specification'
import countriesRaw from '../../public/data/countries.json?raw'
import countriesTopologyRaw from '../../public/data/countries.topo.json?raw'
import riversRaw from '../../public/data/rivers.json?raw'
import { buildRiverQuestionPool, pickRiverQuestion, riverCentreCountry, riverCentreProximity, riverRankLimit } from './rivers'

function river(id: string, name: string, nameAlt: string | null, scaleRank = 2, nameEnglish: string | null = null): RiverFeature {
  return {
    type: 'Feature',
    id,
    properties: { id, name, nameAlt, nameEnglish, scaleRank, iso3: null, nameLong: null, continent: null, mapUnit: null, naturalEarthId: null },
    geometry: { type: 'LineString', coordinates: [[10, 20], [11, 21]] },
  }
}

describe('river question data', () => {
  it('combines Natural Earth segments that share an English alternate name', () => {
    const pool = buildRiverQuestionPool([
      river('one', 'Donau', 'Danube', 2, 'Danube'),
      river('two', 'Danube', null, 3, 'Danube'),
      river('three', 'Rhein', 'Rhine', 2, 'Rhine'),
    ])
    const danube = pool.find((question) => question.name === 'Danube')
    expect(danube).toBeDefined()
    expect(danube?.aliases).toContain('Donau')
    expect(danube?.feature.geometry.type).toBe('MultiLineString')
    expect(danube?.feature.geometry.type === 'MultiLineString' ? danube.feature.geometry.coordinates : []).toHaveLength(2)
    expect(pool.map((question) => question.name)).toEqual(['Danube', 'Rhine'])
  })

  it('does not let a shared short alias select the wrong river', () => {
    const pool = buildRiverQuestionPool([
      river('yellow-river', 'Huang', 'Yellow River; Yellow', 2, 'Yellow River'),
      river('yellow-creek', 'Yellow', null, 4, 'Yellow'),
    ])
    const main = pool.find((question) => question.name === 'Yellow River')
    const other = pool.find((question) => question.name === 'Yellow')
    expect(main?.aliases).not.toContain('Yellow')
    expect(other?.aliases).toContain('Yellow')
    expect(main?.aliases).toContain('Huang')
  })

  it('keeps each canonical question name answerable when another river shares it as an alias', () => {
    const pool = buildRiverQuestionPool([
      river('river-a', 'River A', null, 2, 'River A'),
      river('river-b', 'River B', 'River A', 3, 'River B'),
    ])
    expect(pool.find((question) => question.name === 'River A')?.aliases).toContain('River A')
    expect(pool.find((question) => question.name === 'River B')?.aliases).not.toContain('River A')
  })

  it('picks reproducible, distinct questions and applies the intended rank bands', () => {
    const pool = buildRiverQuestionPool([
      river('one', 'Amazonas', 'Amazon', 1),
      river('two', 'Ganges', null, 3),
      river('three', 'Yukon', null, 4),
    ])
    expect(pickRiverQuestion(pool, 'river-seed')?.id).toBe(pickRiverQuestion(pool, 'river-seed')?.id)
    const first = pickRiverQuestion(pool, 'river-seed')
    expect(first).toBeDefined()
    expect(pickRiverQuestion(pool, 'river-seed', [first!.id])?.id).not.toBe(first!.id)
    expect(pickRiverQuestion(pool, 'river-seed', pool.map((item) => item.id))).toBeUndefined()
    expect(riverRankLimit('easy')).toBe(2)
    expect(riverRankLimit('medium')).toBe(3)
    expect(riverRankLimit('hard')).toBe(4)
  })

  it('compares generalized river centres with rounded distance and compass direction', () => {
    const target = river('target', 'Target', null, 1, 'Target')
    const guess = river('guess', 'Guess', null, 1, 'Guess')
    target.geometry.coordinates = [[0, 0], [1, 0]]
    guess.geometry.coordinates = [[10, 0], [11, 0]]
    expect(riverCentreProximity(guess, target)).toEqual({ distanceKm: 1_100, direction: 'east' })

    guess.geometry.coordinates = [[0.6, 0], [0.8, 0]]
    expect(riverCentreProximity(guess, target)).toEqual({ distanceKm: 0, direction: null })
  })

  it('identifies the country containing a river trace centre for the second-miss clue', () => {
    const riverFeature = river('inside', 'Inside', null)
    riverFeature.geometry.coordinates = [[0, 0], [1, 1]]
    const country: Country = {
      iso3: 'TST', parentIso3: null, iso2: 'TS', name: 'Testland', officialName: 'Testland', aliases: [],
      continent: 'Africa', subregion: 'Test Region', capital: null, capitals: [], capitalCoordinates: null, coordinates: null,
      population: null, populationYear: null, lifeExpectancyYears2023: null, areaKm2: null, landlocked: false, borders: [], independent: true,
      flagCode: 'ts', hasGeometry: true, regionCount: 0, regionSource: null,
    }
    const polygon: GeoFeature = {
      type: 'Feature',
      properties: { iso3: country.iso3, name: country.name, nameLong: null, continent: country.continent, mapUnit: null, naturalEarthId: null },
      geometry: { type: 'Polygon', coordinates: [[[-20, -20], [-20, 20], [20, 20], [20, -20], [-20, -20]]] },
    }
    const countryIndex = new Map([[country.iso3, country]])
    expect(riverCentreCountry(riverFeature, [polygon], countryIndex)).toBe(country.name)
    expect(riverCentreCountry(riverFeature, [], countryIndex)).toBeNull()
  })

  it('can locate the calculated centre of every authored river question', () => {
    const riverData = JSON.parse(riversRaw) as { features: RiverFeature[] }
    const catalog = JSON.parse(countriesRaw) as { countries: Country[] }
    const topology = JSON.parse(countriesTopologyRaw) as Topology
    const collection = feature(topology, topology.objects.countries!)
    const countryFeatures = collection.type === 'FeatureCollection' ? collection.features as unknown as GeoFeature[] : []
    const countriesByCode = new Map(catalog.countries.map((country) => [country.iso3, country]))
    const questions = buildRiverQuestionPool(riverData.features)
    const missingHints = questions.filter((question) => !riverCentreCountry(question.feature, countryFeatures, countriesByCode))
    expect(questions).toHaveLength(134)
    expect(missingHints.map((question) => question.name)).toEqual([])
  })
})
