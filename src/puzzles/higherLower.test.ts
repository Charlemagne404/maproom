import { describe, expect, it } from 'vitest'
import type { Country } from '../geography/types'
import { countryMeasure, formatCountryMeasure, makeHigherLowerQuestions } from './higherLower'

function country(iso3: string, lifeExpectancyYears2023: number | null): Country {
  return {
    iso3,
    parentIso3: null,
    iso2: iso3.slice(0, 2),
    name: iso3,
    officialName: iso3,
    aliases: [],
    continent: 'Europe',
    subregion: null,
    capital: null,
    capitals: [],
    capitalCoordinates: null,
    coordinates: null,
    population: 100_000,
    populationYear: '2023',
    lifeExpectancyYears2023,
    areaKm2: 1_000,
    landlocked: false,
    borders: [],
    independent: true,
    flagCode: iso3.toLowerCase(),
    hasGeometry: true,
    regionCount: 0,
    regionSource: null,
  }
}

describe('Higher or Lower life expectancy', () => {
  it('uses the exact 2023 value and excludes missing observations', () => {
    expect(countryMeasure(country('AAA', 72.46), 'life-expectancy')).toBe(72.46)
    expect(countryMeasure(country('BBB', null), 'life-expectancy')).toBeNull()
    expect(formatCountryMeasure(72.46, 'life-expectancy')).toBe('72.5 years')
  })

  it('uses absolute year gaps for close and standard comparisons', () => {
    const oneYearApart = [country('AAA', 70), country('BBB', 71)]
    const fourYearsApart = [country('CCC', 70), country('DDD', 74)]
    const lessThanOneYearApart = [country('EEE', 70), country('FFF', 70.9)]

    expect(makeHigherLowerQuestions(oneYearApart, 'life-expectancy', 'one-year-close', 1, 'close')).toHaveLength(1)
    expect(makeHigherLowerQuestions(oneYearApart, 'life-expectancy', 'one-year-standard', 1, 'standard')).toHaveLength(0)
    expect(makeHigherLowerQuestions(fourYearsApart, 'life-expectancy', 'four-year-close', 1, 'close')).toHaveLength(0)
    expect(makeHigherLowerQuestions(fourYearsApart, 'life-expectancy', 'four-year-standard', 1, 'standard')).toHaveLength(1)
    expect(makeHigherLowerQuestions(lessThanOneYearApart, 'life-expectancy', 'sub-year-close', 1, 'close')).toHaveLength(0)
  })

  it('keeps the existing ratio bands for other measures', () => {
    const countries = [
      { ...country('AAA', null), population: 100 },
      { ...country('BBB', null), population: 110 },
    ]
    expect(makeHigherLowerQuestions(countries, 'population', 'population-close', 1, 'close')).toHaveLength(1)
    expect(makeHigherLowerQuestions(countries, 'population', 'population-standard', 1, 'standard')).toHaveLength(0)
  })
})
