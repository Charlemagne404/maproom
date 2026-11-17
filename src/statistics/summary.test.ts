import { describe, expect, it } from 'vitest'
import type { GameResult } from '../geography/types'
import { calculateStatistics } from './summary'

function result(date: string, score: number, correct = 2, total = 4): GameResult {
  return {
    id: `flags:${date}`,
    gameId: 'flags',
    mode: 'daily',
    puzzleId: `flags:${date}:v1`,
    date,
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T10:01:00.000Z`,
    score,
    correct,
    total,
    completed: true,
    elapsedSeconds: 60,
  }
}

describe('calculateStatistics', () => {
  it('aggregates overall and per-game results, streaks, averages and trend points', () => {
    const history = [
      result('2026-03-29', 600, 3),
      result('2026-03-30', 900, 4),
      { ...result('2026-03-30', 100, 0), id: 'practice', mode: 'practice' as const },
    ]
    const summary = calculateStatistics(history, 'Europe/Stockholm', new Date('2026-03-30T12:00:00Z'))
    expect(summary.totalPlayed).toBe(3)
    expect(summary.totalCompleted).toBe(3)
    expect(summary.accuracy).toBeCloseTo(7 / 12)
    expect(summary.averageScore).toBe(1600 / 3)
    expect(summary.bestScore).toBe(900)
    expect(summary.bestDailyStreak).toBe(2)
    expect(summary.currentDailyStreak).toBe(2)
    expect(summary.byGame.find((item) => item.gameId === 'flags')).toMatchObject({
      played: 3,
      completed: 3,
      correct: 7,
      total: 12,
      bestScore: 900,
    })
    expect(summary.trend).toHaveLength(14)
    expect(summary.trend.at(-1)).toEqual({ date: '2026-03-30', score: 900 })
  })

  it('treats yesterday as an active streak and leaves empty history at zero', () => {
    const yesterday = result('2026-03-29', 100)
    expect(calculateStatistics([yesterday], 'Europe/Stockholm', new Date('2026-03-30T12:00:00Z')).currentDailyStreak).toBe(1)
    const empty = calculateStatistics([], 'Europe/Stockholm', new Date('2026-03-30T12:00:00Z'))
    expect(empty.totalPlayed).toBe(0)
    expect(empty.accuracy).toBe(0)
    expect(empty.bestDailyStreak).toBe(0)
    expect(empty.trend.every((point) => point.score === null)).toBe(true)
  })

  it('includes new game families in per-game accuracy and personal bests', () => {
    const connections = { ...result('2026-03-30', 900, 4, 4), id: 'connections:2026-03-30', gameId: 'connections' as const }
    const distance = { ...result('2026-03-30', 540, 5, 10), id: 'distance:practice', gameId: 'distance' as const, mode: 'practice' as const }
    const summary = calculateStatistics([connections, distance], 'Europe/Stockholm', new Date('2026-03-30T12:00:00Z'))

    expect(summary.byGame.find((item) => item.gameId === 'connections')).toMatchObject({ played: 1, correct: 4, total: 4, accuracy: 1, bestScore: 900 })
    expect(summary.byGame.find((item) => item.gameId === 'distance')).toMatchObject({ played: 1, correct: 5, total: 10, accuracy: 0.5, bestScore: 540 })
  })
})
