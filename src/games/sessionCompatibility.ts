import type { GameMode, GameSessionSnapshot } from '../geography/types'

export function isCompatibleGameSession(session: GameSessionSnapshot, mode: GameMode, puzzleId: string): boolean {
  return session.version === 1 && session.mode === mode && session.puzzleId === puzzleId
}
