import { describe, expect, it } from 'vitest'
import { uniqueCitySuggestions } from './citySuggestions'

describe('city identification suggestions', () => {
  it('shows one highest-population suggestion for a normalized name within a country', () => {
    const cities = [
      { id: 'smaller', name: 'Abilene', countryIso3: 'USA', population: 6_558 },
      { id: 'larger', name: 'Abilene', countryIso3: 'USA', population: 125_182 },
      { id: 'other-country', name: 'Abilene', countryIso3: 'KEN', population: 2_000 },
      { id: 'accented', name: 'Café-Nord', countryIso3: 'USA', population: 100 },
      { id: 'normalized-duplicate', name: 'Cafe Nord', countryIso3: 'USA', population: 200 },
    ]

    expect(uniqueCitySuggestions(cities).map((city) => city.id)).toEqual([
      'larger',
      'other-country',
      'normalized-duplicate',
    ])
  })
})
