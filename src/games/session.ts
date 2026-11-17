import { useEffect, useRef, useState } from 'react'
import { useAppData } from '../app/useAppData'
import type { GameId, GameMode, GameResult } from '../geography/types'
import { dailyPuzzleId } from '../puzzles/engine'

export function useGameSession(gameId: GameId, mode: GameMode, date: string, seed: string) {
  const { completeGame } = useAppData()
  const session = useRef<SessionIdentity | null>(null)
  const saved = useRef(false)
  const [saveError, setSaveError] = useState('')
  const puzzleId = mode === 'daily' ? dailyPuzzleId(gameId, date) : `${gameId}:practice:${seed}`

  useEffect(() => {
    session.current = createSessionIdentity()
  }, [puzzleId])

  async function save(score: number, correct: number, total: number, detail?: Record<string, unknown>) {
    if (saved.current) return
    saved.current = true
    const identity = session.current ?? createSessionIdentity()
    const result: GameResult = {
      id: mode === 'daily' ? puzzleId : `${gameId}:${identity.id}`,
      gameId,
      mode,
      puzzleId,
      date,
      startedAt: identity.startedAt,
      completedAt: new Date().toISOString(),
      score: Math.max(0, Math.round(score)),
      correct,
      total,
      completed: true,
      elapsedSeconds: Math.max(0, Math.round((Date.now() - identity.startedAtMs) / 1000)),
      detail,
    }
    try {
      await completeGame(result)
    } catch (error) {
      saved.current = false
      setSaveError(error instanceof Error ? error.message : 'This result could not be saved.')
    }
  }

  return { puzzleId, save, saveError }
}

interface SessionIdentity { id: string; startedAt: string; startedAtMs: number }

function createSessionIdentity(): SessionIdentity {
  const startedAtMs = Date.now()
  return {
    id: crypto.randomUUID?.() ?? `${startedAtMs}-${Math.random().toString(36).slice(2)}`,
    startedAt: new Date(startedAtMs).toISOString(),
    startedAtMs,
  }
}
