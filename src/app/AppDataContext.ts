import { createContext } from 'react'
import type { AppState, GameId, GameResult, UserSettings } from '../geography/types'

export interface AppDataValue {
  state: AppState
  ready: boolean
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>
  toggleFavorite: (gameId: GameId) => Promise<void>
  completeGame: (result: GameResult) => Promise<void>
  exportData: () => Promise<string>
  importData: (input: string) => Promise<void>
  resetData: () => Promise<void>
}

export const AppDataContext = createContext<AppDataValue | null>(null)
