import type { GameId, GameResult } from '../geography/types'
import { dateInTimeZone, GAME_IDS } from '../puzzles/engine'

export interface GameSummary {
  gameId: GameId
  completed: number
  dailyCompleted: number
  freeplayCompleted: number
  correct: number
  total: number
  accuracy: number
  bestScore: number
  averageScore: number
}

export interface StatisticsSummary {
  totalCompleted: number
  totalPoints: number
  accuracy: number
  bestScore: number
  longestStreak: number
  currentStreak: number
  dailyCompleted: number
  freeplayCompleted: number
  activeDays: number
  activity: Map<string, number>
  byGame: GameSummary[]
  trend: Array<{ date: string; accuracy: number | null; completed: number }>
}

export function calculateStatistics(history: GameResult[], timeZone = 'Europe/Stockholm', now?: Date | string): StatisticsSummary {
  const completed = history.filter((result) => result.completed)
  const totalCorrect = completed.reduce((sum, result) => sum + result.correct, 0)
  const totalQuestions = completed.reduce((sum, result) => sum + result.total, 0)
  const activity = countCompletedByDay(completed, timeZone)
  const today = typeof now === 'string' ? now : dateInTimeZone(now ?? new Date(), timeZone)
  const streaks = calculateStreaks([...activity.keys()], today)
  const activityWindow = summarizeActivityWindow(activity, today)
  const byGame = GAME_IDS.map((gameId) => {
    const results = completed.filter((result) => result.gameId === gameId)
    const correct = results.reduce((sum, result) => sum + result.correct, 0)
    const total = results.reduce((sum, result) => sum + result.total, 0)
    const score = results.reduce((sum, result) => sum + result.score, 0)
    return {
      gameId,
      completed: results.length,
      dailyCompleted: results.filter((result) => result.mode === 'daily').length,
      freeplayCompleted: results.filter((result) => result.mode === 'freeplay').length,
      correct,
      total,
      accuracy: total > 0 ? correct / total : 0,
      bestScore: Math.max(0, ...results.map((result) => result.score)),
      averageScore: results.length ? score / results.length : 0,
    }
  }).filter((game) => game.completed > 0)

  return {
    totalCompleted: completed.length,
    totalPoints: completed.reduce((sum, result) => sum + result.score, 0),
    accuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
    bestScore: Math.max(0, ...completed.map((result) => result.score)),
    longestStreak: streaks.longest,
    currentStreak: streaks.current,
    dailyCompleted: completed.filter((result) => result.mode === 'daily').length,
    freeplayCompleted: completed.filter((result) => result.mode === 'freeplay').length,
    activeDays: activityWindow.activeDays,
    activity,
    byGame,
    trend: buildTrend(completed, today, timeZone),
  }
}

export function countCompletedByDay(history: GameResult[], timeZone: string): Map<string, number> {
  const activity = new Map<string, number>()
  for (const result of history) {
    if (!result.completed) continue
    const timestamp = Date.parse(result.completedAt)
    const day = Number.isFinite(timestamp) ? dateInTimeZone(new Date(timestamp), timeZone) : result.date
    activity.set(day, (activity.get(day) ?? 0) + 1)
  }
  return activity
}

export function calculateStreaks(activeDates: string[], today: string): { current: number; longest: number } {
  const dates = new Set(activeDates)
  let longest = 0
  for (const date of dates) {
    if (dates.has(shiftDate(date, -1))) continue
    let length = 1
    let cursor = shiftDate(date, 1)
    while (dates.has(cursor)) {
      length += 1
      cursor = shiftDate(cursor, 1)
    }
    longest = Math.max(longest, length)
  }

  let cursor = dates.has(today) ? today : shiftDate(today, -1)
  let current = 0
  while (dates.has(cursor)) {
    current += 1
    cursor = shiftDate(cursor, -1)
  }
  return { current, longest }
}

function buildTrend(history: GameResult[], today: string, timeZone: string): StatisticsSummary['trend'] {
  const groups = countCompletedByDay(history, timeZone)
  const questions = new Map<string, { correct: number; total: number }>()
  for (const result of history) {
    const timestamp = Date.parse(result.completedAt)
    const day = Number.isFinite(timestamp) ? dateInTimeZone(new Date(timestamp), timeZone) : result.date
    const group = questions.get(day) ?? { correct: 0, total: 0 }
    group.correct += result.correct
    group.total += result.total
    questions.set(day, group)
  }
  const trend: StatisticsSummary['trend'] = []
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset)
    const group = questions.get(date)
    trend.push({
      date,
      accuracy: group && group.total > 0 ? group.correct / group.total : null,
      completed: groups.get(date) ?? 0,
    })
  }
  return trend
}

export function shiftDate(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

export function summarizeActivityWindow(activity: Map<string, number>, today: string): { start: string; activeDays: number; completed: number } {
  const rollingStart = shiftDate(today, -363)
  const rollingWeekday = new Date(`${rollingStart}T12:00:00Z`).getUTCDay()
  const start = shiftDate(rollingStart, -rollingWeekday)
  let activeDays = 0
  let completed = 0
  for (const [date, count] of activity) {
    if (date < start || date > today) continue
    if (count > 0) activeDays += 1
    completed += count
  }
  return { start, activeDays, completed }
}
