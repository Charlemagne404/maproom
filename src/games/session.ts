import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppData } from '../app/useAppData'
import type { GameId, GameMode, GameResult, GameSessionSnapshot } from '../geography/types'
import { dailyPuzzleId, dailyPuzzleSeed } from '../puzzles/engine'
import { isCompatibleGameSession } from './sessionCompatibility'

export function useGameSession(gameId: GameId, mode: GameMode, date: string, seed: string) {
  const { state, completeGame, saveSession, deleteSession } = useAppData()
  const session = useRef<SessionIdentity | null>(null)
  const saved = useRef(false)
  const [saveErrorState, setSaveErrorState] = useState({ puzzleId: '', message: '' })
  const existingSession = useMemo(() => state.sessions
    .filter((item) => item.gameId === gameId && item.mode === mode && item.date === date && (mode === 'daily' || item.seed === seed))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0], [state.sessions, gameId, mode, date, seed])
  const currentPuzzleId = mode === 'daily' ? dailyPuzzleId(gameId, date) : `${gameId}:practice:${seed}`
  const compatibleSession = existingSession && isCompatibleGameSession(existingSession, mode, currentPuzzleId) ? existingSession : undefined
  const puzzleId = compatibleSession?.puzzleId ?? currentPuzzleId
  const storedSeed = mode === 'daily' ? compatibleSession?.seed ?? dailyPuzzleSeed(gameId, date) : seed
  const existingSessionId = compatibleSession?.id
  const existingStartedAt = compatibleSession?.startedAt
  const saveError = saveErrorState.puzzleId === puzzleId ? saveErrorState.message : ''
  const progress = compatibleSession?.payload ?? null

  const resetSession = useCallback(() => {
    session.current = createSessionIdentity()
    saved.current = false
    setSaveErrorState({ puzzleId, message: '' })
    void deleteSession(gameId, mode, date)
  }, [deleteSession, date, gameId, mode, puzzleId])

  useEffect(() => {
    session.current = existingSessionId && existingStartedAt
      ? { id: existingSessionId, startedAt: existingStartedAt, startedAtMs: Date.parse(existingStartedAt) || Date.now() }
      : createSessionIdentity()
    saved.current = false
  }, [puzzleId, existingSessionId, existingStartedAt])

  useEffect(() => {
    if (existingSession && !isCompatibleGameSession(existingSession, mode, currentPuzzleId)) {
      void deleteSession(gameId, mode, date, currentPuzzleId)
    }
  }, [existingSession, deleteSession, gameId, mode, date, currentPuzzleId])

  const saveProgress = useCallback(async (payload: Record<string, unknown>) => {
    if (saved.current) return
    const identity = session.current ?? createSessionIdentity()
    const snapshot: GameSessionSnapshot = {
      id: mode === 'daily' ? `${gameId}:${date}` : `${gameId}:${date}:${seed}`,
      gameId,
      mode,
      puzzleId,
      seed: storedSeed,
      date,
      startedAt: identity.startedAt,
      updatedAt: new Date().toISOString(),
      version: 1,
      payload,
    }
    try {
      await saveSession(snapshot)
    } catch (error) {
      setSaveErrorState({ puzzleId, message: error instanceof Error ? error.message : 'Your progress could not be saved.' })
    }
  }, [date, gameId, mode, puzzleId, saveSession, seed, storedSeed])

  const clearProgress = useCallback(async () => {
    await deleteSession(gameId, mode, date)
  }, [deleteSession, date, gameId, mode])

  const save = useCallback(async (score: number, correct: number, total: number, detail?: Record<string, unknown>) => {
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
      setSaveErrorState({ puzzleId, message: error instanceof Error ? error.message : 'This result could not be saved.' })
    }
  }, [completeGame, date, gameId, mode, puzzleId])

  return { puzzleId, save, saveError, resetSession, progress, saveProgress, clearProgress }
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
