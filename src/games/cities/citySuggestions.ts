import type { City } from '../../geography/types'
import { normalizeAnswer } from '../../puzzles/engine'

type CityNameRecord = Pick<City, 'id' | 'name' | 'countryIso3' | 'population'>

export function uniqueCitySuggestions<T extends CityNameRecord>(cities: readonly T[]): T[] {
  const byCountryAndName = new Map<string, T>()

  for (const city of cities) {
    const key = `${city.countryIso3}:${normalizeAnswer(city.name)}`
    const existing = byCountryAndName.get(key)
    if (!existing || city.population > existing.population) byCountryAndName.set(key, city)
  }

  return [...byCountryAndName.values()]
}
