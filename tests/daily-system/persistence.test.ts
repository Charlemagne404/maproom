import { describe, expect, it } from 'vitest'
import type { GameId, GameResult } from '../../src/geography/types'
import { readDailyProgress } from '../../src/daily/progress'
import { getDailyGameLineup } from '../../src/daily/schedule'
import { calculateStatistics } from '../../src/statistics/summary'

function result(gameId: GameId, date: string, mode: 'daily' | 'freeplay' = 'daily'): GameResult {
  return {
    id: `${gameId}:${date}:${mode}`,
    gameId,
    mode,
    puzzleId: `${gameId}:${date}:v2`,
    date,
    startedAt: `${date}T09:00:00.000Z`,
    completedAt: `${date}T10:00:00.000Z`,
    score: 800,
    correct: 4,
    total: 5,
    completed: true,
    elapsedSeconds: 60,
  }
}

describe('Daily history adapter', () => {
  it('counts only selected completed games for that date and leaves historical records untouched', () => {
    const yesterday = '2026-11-17'
    const today = '2026-11-18'
    const yesterdayLineup = getDailyGameLineup(yesterday)
    const todayLineup = getDailyGameLineup(today)
    const legacy = result(yesterdayLineup[0]!, yesterday)
    const history = [legacy, result(todayLineup[0]!, today), result(todayLineup[1]!, today, 'freeplay')]

    const yesterdayProgress = readDailyProgress(yesterday, yesterdayLineup, history)
    const todayProgress = readDailyProgress(today, todayLineup, history)

    expect(yesterdayLineup).not.toEqual(todayLineup)
    expect(yesterdayProgress.completedCount).toBe(1)
    expect(todayProgress.completedCount).toBe(1)
    expect(todayProgress.totalCount).toBe(6)
    expect(todayProgress.completedGameIds.has(todayLineup[0]!)).toBe(true)
    expect(todayProgress.completedGameIds.has(todayLineup[1]!)).toBe(false)
    expect(history).toContain(legacy)
  })

  it('preserves active-day streaks across changing lineups without requiring the full set', () => {
    const firstDate = '2026-11-17'
    const secondDate = '2026-11-18'
    const firstLineup = getDailyGameLineup(firstDate)
    const secondLineup = getDailyGameLineup(secondDate)
    const history = [result(firstLineup[0]!, firstDate), result(secondLineup[0]!, secondDate)]
    const stats = calculateStatistics(history, 'UTC', '2026-11-18')

    expect(firstLineup).not.toEqual(secondLineup)
    expect(readDailyProgress(firstDate, firstLineup, history).completedCount).toBe(1)
    expect(readDailyProgress(secondDate, secondLineup, history).completedCount).toBe(1)
    expect(stats.currentStreak).toBe(2)
    expect(stats.longestStreak).toBe(2)
    expect(stats.dailyCompleted).toBe(2)
  })
})
