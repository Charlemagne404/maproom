import type { GameMode, GameSessionSnapshot } from '../geography/types'

export function isCompatibleGameSession(session: GameSessionSnapshot, mode: GameMode, puzzleId: string): boolean {
  if (session.version !== 1 || session.mode !== mode) return false
  if (session.puzzleId === puzzleId) return true

  // Outline v2 progress already stores the active target code. Carry that
  // in-progress question into v3, then write it back under the new identity.
  return mode === 'daily'
    && session.gameId === 'outlines'
    && session.puzzleId.endsWith(':v2')
    && puzzleId.endsWith(':v3')
    && session.puzzleId.slice(0, -3) === puzzleId.slice(0, -3)
    && typeof session.payload.targetCode === 'string'
}
