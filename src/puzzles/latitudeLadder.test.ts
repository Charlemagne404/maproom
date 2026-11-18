import { describe, expect, it } from 'vitest'
import type { City } from '../geography/types'
import { countCorrectCityPositions, createCityOrderQuestion, moveCity } from './latitudeLadder'

const cities: City[] = [
  { id: '1', name: 'A', aliases: [], lat: 60, lon: 10, countryIso2: 'AA', countryIso3: 'AAA', admin1Code: null, population: 200_000, featureCode: 'P', capital: false },
  { id: '2', name: 'B', aliases: [], lat: 30, lon: -20, countryIso2: 'BB', countryIso3: 'BBB', admin1Code: null, population: 300_000, featureCode: 'P', capital: false },
  { id: '3', name: 'C', aliases: [], lat: 0, lon: 40, countryIso2: 'CC', countryIso3: 'CCC', admin1Code: null, population: 400_000, featureCode: 'P', capital: false },
  { id: '4', name: 'D', aliases: [], lat: -30, lon: -100, countryIso2: 'DD', countryIso3: 'DDD', admin1Code: null, population: 500_000, featureCode: 'P', capital: false },
  { id: '5', name: 'E', aliases: [], lat: -60, lon: 150, countryIso2: 'EE', countryIso3: 'EEE', admin1Code: null, population: 600_000, featureCode: 'P', capital: false },
]

describe('Latitude Ladder puzzle logic', () => {
  it('creates reproducible north-to-south and west-to-east answer orders', () => {
    const northSouth = createCityOrderQuestion(cities, 'latitude', 'stable-seed')!
    expect(northSouth.correctOrder.map((city) => city.id)).toEqual(['1', '2', '3', '4', '5'])
    expect(createCityOrderQuestion(cities, 'latitude', 'stable-seed')).toEqual(northSouth)
    const westEast = createCityOrderQuestion(cities, 'longitude', 'stable-seed')!
    expect(westEast.correctOrder.map((city) => city.id)).toEqual(['4', '2', '1', '3', '5'])
  })

  it('keeps a solvable scrambled order and scores positions without mutating the list', () => {
    const question = createCityOrderQuestion(cities, 'latitude', 'shuffle-seed')!
    expect(question.startingOrder.map((city) => city.id)).not.toEqual(question.correctOrder.map((city) => city.id))
    expect(countCorrectCityPositions(question.correctOrder.map((city) => city.id), question.correctOrder)).toBe(5)
    const original = question.startingOrder.map((city) => city.id)
    expect(moveCity(original, 0, 1)).toEqual([original[1], original[0], ...original.slice(2)])
    expect(original).toEqual(question.startingOrder.map((city) => city.id))
  })

  it('does not move items past the ends and rejects undersized pools', () => {
    expect(moveCity(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(moveCity(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
    expect(createCityOrderQuestion(cities.slice(0, 4), 'latitude', 'small-pool')).toBeUndefined()
  })

  it('excludes GeoNames sections of populated places from city ordering', () => {
    const section = { ...cities[0]!, id: 'section', featureCode: 'PPLX' }
    expect(createCityOrderQuestion([...cities.slice(1), section], 'latitude', 'section-pool')).toBeUndefined()
  })
})
