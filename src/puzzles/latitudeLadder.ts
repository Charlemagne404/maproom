import type { City } from '../geography/types'
import { isCurrentWholeSettlement } from '../geography/cityRecords'
import { normalizeAnswer, seededShuffle } from './engine'

export type LadderAxis = 'latitude' | 'longitude'

export interface CityOrderQuestion {
  startingOrder: City[]
  correctOrder: City[]
}

export function createCityOrderQuestion(cities: City[], axis: LadderAxis, seed: string, count = 5): CityOrderQuestion | undefined {
  if (!Number.isInteger(count) || count < 2) return undefined
  const eligible = cities
    .filter((city) => typeof city.id === 'string'
      && typeof city.name === 'string'
      && city.name.trim().length > 0
      && isCurrentWholeSettlement(city)
      && city.population >= 100_000
      && Number.isFinite(city.lat)
      && Number.isFinite(city.lon)
      && Math.abs(city.lat) <= 90
      && Math.abs(city.lon) <= 180)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
  if (eligible.length < count) return undefined

  const chosen = seededShuffle(eligible, `${seed}:cities`).slice(0, count)
  const correctOrder = chosen.slice().sort((left, right) => {
    const difference = axis === 'latitude' ? right.lat - left.lat : left.lon - right.lon
    return difference || normalizeAnswer(left.name).localeCompare(normalizeAnswer(right.name)) || left.id.localeCompare(right.id)
  })
  let startingOrder = seededShuffle(chosen, `${seed}:cards`)
  if (startingOrder.every((city, index) => city.id === correctOrder[index]?.id)) {
    startingOrder = [...startingOrder.slice(1), startingOrder[0]!]
  }
  return { startingOrder, correctOrder }
}

export function moveCity(values: readonly string[], index: number, direction: -1 | 1): string[] {
  const nextIndex = index + direction
  if (!Number.isInteger(index) || index < 0 || index >= values.length || nextIndex < 0 || nextIndex >= values.length) return [...values]
  const next = [...values]
  ;[next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!]
  return next
}

export function countCorrectCityPositions(actual: readonly string[], correct: readonly City[]): number {
  return actual.reduce((total, id, index) => total + (id === correct[index]?.id ? 1 : 0), 0)
}
