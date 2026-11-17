import type { Country } from '../geography/types'
import { buildAdjacency, seededShuffle } from './engine'

export type NeighbourDifficulty = 'all' | 'dense'

export interface NeighbourQuestion {
  country: Country
  neighbourCodes: string[]
}

export function makeNeighbourQuestions(countries: Country[], seed: string, count: number, scope = 'World', difficulty: NeighbourDifficulty = 'all'): NeighbourQuestion[] {
  const adjacency = buildAdjacency(countries)
  const pool = countries.filter((country) => {
    if (!country.hasGeometry || (scope !== 'World' && country.continent !== scope)) return false
    const count = adjacency.get(country.iso3)?.length ?? 0
    return difficulty === 'dense' ? count >= 5 : count >= 2
  })
  return seededShuffle(pool, seed).slice(0, count).map((country) => ({ country, neighbourCodes: adjacency.get(country.iso3) ?? [] }))
}

export function scoreNeighbourAnswer(expected: readonly string[], selected: readonly string[]): { points: number; exact: boolean; matched: number; missed: number; extra: number } {
  const expectedSet = new Set(expected)
  const selectedSet = new Set(selected)
  const matched = [...selectedSet].filter((code) => expectedSet.has(code)).length
  const missed = expectedSet.size - matched
  const extra = selectedSet.size - matched
  const points = Math.max(0, Math.round(1000 * matched / Math.max(1, expectedSet.size)) - extra * 100)
  return { points, exact: missed === 0 && extra === 0, matched, missed, extra }
}
