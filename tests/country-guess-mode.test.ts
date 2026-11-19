import { describe, expect, it } from 'vitest'
import type { Country } from '../src/geography/types'
import { countryGuessFeedback, countryGuessPoints, MULTI_GUESS_LIMIT } from '../src/games/country-map/guessing'

function country(name: string, lat: number, lon: number): Country {
  return { name, coordinates: { lat, lon } } as Country
}

describe('Find the country multi-guess practice', () => {
  it('reports rounded centre distance, direction and remaining tries', () => {
    expect(countryGuessFeedback(country('Alpha', 0, 0), country('Beta', 0, 1), 3))
      .toBe('Not quite. From Alpha, the target is about 100 km east. 3 tries left.')
    expect(countryGuessFeedback(country('Beta', 0, 1), country('Alpha', 0, 0), 1))
      .toBe('Not quite. From Beta, the target is about 100 km west. 1 try left.')
  })

  it('keeps clue feedback useful when a country has no catalogued center', () => {
    const noPoint = { name: 'Alpha', coordinates: null } as Country
    expect(countryGuessFeedback(noPoint, country('Beta', 0, 1), 2))
      .toBe('Not quite. Alpha is not the target. 2 tries left.')
    expect(countryGuessFeedback(country('Alpha', 0, 0), country('Nearby', 0, 0.1), 2))
      .toBe('Not quite. From Alpha, the target is less than 25 km east. 2 tries left.')
  })

  it('rewards earlier correct guesses and caps the four-try attempt budget', () => {
    expect(MULTI_GUESS_LIMIT).toBe(4)
    expect([0, 1, 2, 3, 4].map(countryGuessPoints)).toEqual([100, 75, 50, 25, 25])
  })
})
