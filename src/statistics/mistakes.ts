import type { GameId, GameResult } from '../geography/types'

export function missedCountryCodes(history: GameResult[], gameId: GameId): string[] {
  const counts = new Map<string, { count: number; latest: string }>()
  for (const result of history) {
    if (!result.completed || result.gameId !== gameId) continue
    const values = result.detail?.missedCountries
    if (!Array.isArray(values)) continue
    for (const raw of values) {
      if (typeof raw !== 'string' || !/^[A-Z]{3}$/.test(raw)) continue
      const current = counts.get(raw) ?? { count: 0, latest: result.completedAt }
      counts.set(raw, { count: current.count + 1, latest: current.latest > result.completedAt ? current.latest : result.completedAt })
    }
  }
  return [...counts]
    .sort((left, right) => right[1].count - left[1].count || right[1].latest.localeCompare(left[1].latest) || left[0].localeCompare(right[0]))
    .map(([code]) => code)
}
