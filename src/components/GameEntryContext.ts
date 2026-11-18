import { createContext, useContext } from 'react'
import type { GameId } from '../geography/types'

export interface GameEntryRequest {
  gameId: GameId
  href: string
  from: string
  returnFocusKey: string
}

export type BeginGameEntry = (request: GameEntryRequest) => void

export const GameEntryContext = createContext<BeginGameEntry>(() => undefined)

export function useBeginGameEntry(): BeginGameEntry {
  return useContext(GameEntryContext)
}
