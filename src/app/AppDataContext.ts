import { createContext } from 'react'
import type { AppState, GameId, GameResult, GameSessionSnapshot, UserSettings } from '../geography/types'

export interface AppDataValue {
  state: AppState
  ready: boolean
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>
  toggleFavorite: (gameId: GameId) => Promise<void>
  completeGame: (result: GameResult) => Promise<void>
  saveSession: (snapshot: GameSessionSnapshot) => Promise<void>
  deleteSession: (gameId: GameId, mode: 'daily' | 'practice', date: string, keepPuzzleId?: string) => Promise<void>
  exportData: () => Promise<string>
  importData: (input: string) => Promise<void>
  resetData: () => Promise<void>
}

export const AppDataContext = createContext<AppDataValue | null>(null)
