import { describe, expect, it } from 'vitest'
import type { GameResult } from '../geography/types'
import { calculateStatistics, calculateStreaks, summarizeActivityWindow } from './summary'

function result(date: string, score: number, correct = 2, total = 4, mode: GameResult['mode'] = 'daily', completedAt = `${date}T10:01:00.000Z`, completed = true): GameResult {
  return {
    id: `flags:${date}:${score}:${mode}:${completedAt}`,
    gameId: 'flags',
    mode,
    puzzleId: `flags:${date}:v1`,
    date,
    startedAt: `${date}T10:00:00.000Z`,
    completedAt,
    score,
    correct,
    total,
    completed,
    elapsedSeconds: 60,
  }
}

describe('calculateStatistics', () => {
  it('aggregates completed Daily and Free play results without treating sessions as streak days', () => {
    const history = [
      result('2026-03-29', 600, 3),
      result('2026-03-30', 900, 4),
      result('2026-03-30', 100, 0, 4, 'freeplay', '2026-03-30T12:00:00.000Z'),
      result('2026-03-30', 500, 4, 4, 'freeplay', '2026-03-30T13:00:00.000Z', false),
    ]
    const summary = calculateStatistics(history, 'Europe/Stockholm', new Date('2026-03-30T12:00:00Z'))
    expect(summary.totalCompleted).toBe(3)
    expect(summary.totalPoints).toBe(1600)
    expect(summary.accuracy).toBeCloseTo(7 / 12)
    expect(summary.bestScore).toBe(900)
    expect(summary.longestStreak).toBe(2)
    expect(summary.currentStreak).toBe(2)
    expect(summary.dailyCompleted).toBe(2)
    expect(summary.freeplayCompleted).toBe(1)
    expect(summary.activeDays).toBe(2)
    expect(summary.activity.get('2026-03-30')).toBe(2)
    expect(summary.byGame.find((item) => item.gameId === 'flags')).toMatchObject({
      completed: 3,
      dailyCompleted: 2,
      freeplayCompleted: 1,
      correct: 7,
      total: 12,
      bestScore: 900,
    })
    expect(summary.trend).toHaveLength(14)
    expect(summary.trend.at(-1)).toEqual({ date: '2026-03-30', accuracy: 0.5, completed: 2 })
  })

  it('keeps a streak active through today and counts completion in the selected timezone', () => {
    const resultCrossingUtcMidnight = result('2026-03-30', 400, 3, 4, 'freeplay', '2026-03-30T22:30:00.000Z')
    const today = new Date('2026-03-30T22:45:00.000Z')
    const stockholm = calculateStatistics([resultCrossingUtcMidnight], 'Europe/Stockholm', today)
    const utc = calculateStatistics([resultCrossingUtcMidnight], 'UTC', today)
    expect(stockholm.activity.get('2026-03-31')).toBe(1)
    expect(stockholm.currentStreak).toBe(1)
    expect(utc.activity.get('2026-03-30')).toBe(1)
    expect(utc.currentStreak).toBe(1)
    expect(calculateStatistics([resultCrossingUtcMidnight], 'Europe/Stockholm', new Date('2026-04-01T22:00:00Z')).currentStreak).toBe(0)
  })

  it('keeps activity panel totals aligned with the visible year while preserving older history', () => {
    const history = [
      result('2025-01-01', 300),
      result('2026-03-30', 600),
    ]
    const summary = calculateStatistics(history, 'UTC', '2026-03-30')
    expect(summary.activity.get('2025-01-01')).toBe(1)
    expect(summary.activeDays).toBe(1)
    expect(summarizeActivityWindow(summary.activity, '2026-03-30')).toMatchObject({
      activeDays: 1,
      completed: 1,
    })
  })

  it('uses any completed mode for the current streak, even when today has not been played', () => {
    const yesterday = result('2026-03-29', 100, 1, 2, 'freeplay')
    expect(calculateStatistics([yesterday], 'Europe/Stockholm', new Date('2026-03-30T12:00:00Z')).currentStreak).toBe(1)
    const empty = calculateStatistics([], 'Europe/Stockholm', new Date('2026-03-30T12:00:00Z'))
    expect(empty.totalCompleted).toBe(0)
    expect(empty.totalPoints).toBe(0)
    expect(empty.accuracy).toBe(0)
    expect(empty.longestStreak).toBe(0)
    expect(empty.trend.every((point) => point.accuracy === null && point.completed === 0)).toBe(true)
  })

  it('calculates longest and current streaks from unique consecutive calendar dates', () => {
    expect(calculateStreaks([
      '2026-03-01', '2026-03-02', '2026-03-02', '2026-03-03', '2026-03-06', '2026-03-07',
    ], '2026-03-08')).toEqual({ current: 2, longest: 3 })
  })
})
