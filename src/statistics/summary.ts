import type { GameId, GameResult } from '../geography/types'
import { dateInTimeZone } from '../puzzles/engine'

export interface GameSummary {
  gameId: GameId
  played: number
  completed: number
  correct: number
  total: number
  accuracy: number
  bestScore: number
  averageScore: number
}

export interface StatisticsSummary {
  totalPlayed: number
  totalCompleted: number
  accuracy: number
  averageScore: number
  bestScore: number
  bestDailyStreak: number
  currentDailyStreak: number
  byGame: GameSummary[]
  trend: Array<{ date: string; score: number | null }>
}

export function calculateStatistics(history: GameResult[], timeZone = 'Europe/Stockholm', now = new Date()): StatisticsSummary {
  const completed = history.filter((result) => result.completed)
  const totalCorrect = completed.reduce((sum, result) => sum + result.correct, 0)
  const totalQuestions = completed.reduce((sum, result) => sum + result.total, 0)
  const dailyDates = [...new Set(completed.filter((result) => result.mode === 'daily').map((result) => result.date))].sort().reverse()
  const today = dateInTimeZone(now, timeZone)
  const byGame = (['countries', 'outlines', 'routes', 'flags', 'grid', 'cities'] as GameId[]).map((gameId) => {
    const results = completed.filter((result) => result.gameId === gameId)
    const correct = results.reduce((sum, result) => sum + result.correct, 0)
    const total = results.reduce((sum, result) => sum + result.total, 0)
    const score = results.reduce((sum, result) => sum + result.score, 0)
    return {
      gameId,
      played: history.filter((result) => result.gameId === gameId).length,
      completed: results.length,
      correct,
      total,
      accuracy: total ? correct / total : 0,
      bestScore: Math.max(0, ...results.map((result) => result.score)),
      averageScore: results.length ? score / results.length : 0,
    }
  })
  return {
    totalPlayed: history.length,
    totalCompleted: completed.length,
    accuracy: totalQuestions ? totalCorrect / totalQuestions : 0,
    averageScore: completed.length ? completed.reduce((sum, result) => sum + result.score, 0) / completed.length : 0,
    bestScore: Math.max(0, ...completed.map((result) => result.score)),
    bestDailyStreak: longestConsecutive(dailyDates),
    currentDailyStreak: currentConsecutive(dailyDates, today),
    byGame,
    trend: buildTrend(completed, now, timeZone),
  }
}

function longestConsecutive(dates: string[]): number {
  const dateSet = new Set(dates)
  let best = 0
  for (const date of dateSet) {
    if (dateSet.has(previousDate(date))) continue
    let length = 1
    let cursor = nextDate(date)
    while (dateSet.has(cursor)) {
      length += 1
      cursor = nextDate(cursor)
    }
    best = Math.max(best, length)
  }
  return best
}

function currentConsecutive(dates: string[], today: string): number {
  const set = new Set(dates)
  let cursor = set.has(today) ? today : previousDate(today)
  if (!set.has(cursor)) return 0
  let length = 0
  while (set.has(cursor)) {
    length += 1
    cursor = previousDate(cursor)
  }
  return length
}

function buildTrend(history: GameResult[], now: Date, timeZone: string): StatisticsSummary['trend'] {
  const today = dateInTimeZone(now, timeZone)
  const groups = new Map<string, number[]>()
  for (const result of history.filter((item) => item.mode === 'daily')) {
    const scores = groups.get(result.date) ?? []
    scores.push(result.score)
    groups.set(result.date, scores)
  }
  const trend: StatisticsSummary['trend'] = []
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset)
    const scores = groups.get(date)
    trend.push({ date, score: scores?.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null })
  }
  return trend
}

function shiftDate(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

function previousDate(date: string): string {
  return shiftDate(date, -1)
}

function nextDate(date: string): string {
  return shiftDate(date, 1)
}
