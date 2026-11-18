import type { GameId, GameResult } from '../geography/types'

export interface DailyProgress {
  date: string
  selectedGameIds: GameId[]
  completedGameIds: ReadonlySet<GameId>
  completedCount: number
  totalCount: number
  isComplete: boolean
}

/** Reads Daily completion from existing history without introducing a new storage schema. */
export function readDailyProgress(date: string, selectedGameIds: readonly GameId[], history: readonly GameResult[]): DailyProgress {
  const selected = [...selectedGameIds]
  const selectedSet = new Set(selected)
  const completed = new Set<GameId>(history
    .filter((result) => result.mode === 'daily' && result.date === date && result.completed && selectedSet.has(result.gameId))
    .map((result) => result.gameId))

  return {
    date,
    selectedGameIds: selected,
    completedGameIds: completed,
    completedCount: completed.size,
    totalCount: selected.length,
    isComplete: selected.length > 0 && completed.size === selected.length,
  }
}
