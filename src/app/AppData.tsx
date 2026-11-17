import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { AppState, GameId, GameResult, GameSessionSnapshot, UserSettings } from '../geography/types'
import { defaultSettings, deleteGameSession, exportProgress, importProgress, loadAppData, resetProgress, saveFavorites, saveGameResult, saveGameSession, saveSettings } from '../persistence/store'
import { AppDataContext, type AppDataValue } from './AppDataContext'

export function AppDataProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>({
    settings: defaultSettings(),
    favorites: [],
    history: [],
    sessions: [],
    storageAvailable: true,
  })
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const next = await loadAppData()
    setState(next)
  }, [])

  useEffect(() => {
    let active = true
    loadAppData().then((next) => {
      if (active) {
        setState(next)
        setReady(true)
      }
    })
    return () => { active = false }
  }, [])

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    const next = { ...state.settings, ...patch }
    setState((current) => ({ ...current, settings: next }))
    await saveSettings(next)
  }, [state.settings])

  const toggleFavorite = useCallback(async (gameId: GameId) => {
    const favorites = state.favorites.includes(gameId)
      ? state.favorites.filter((id) => id !== gameId)
      : [...state.favorites, gameId]
    setState((current) => ({ ...current, favorites }))
    await saveFavorites(favorites)
  }, [state.favorites])

  const completeGame = useCallback(async (result: GameResult) => {
    if (!await saveGameResult(result)) return
    setState((current) => ({
      ...current,
      history: [result, ...current.history.filter((item) => item.id !== result.id)]
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 2500),
      sessions: current.sessions.filter((session) => !(session.gameId === result.gameId && session.mode === result.mode && session.date === result.date)),
    }))
  }, [])

  const saveSession = useCallback(async (snapshot: GameSessionSnapshot) => {
    if (!await saveGameSession(snapshot)) return
    setState((current) => {
      const previous = current.sessions.find((session) => session.id === snapshot.id)
      if (previous && sameSessionProgress(previous, snapshot)) return current
      return {
        ...current,
        sessions: [snapshot, ...current.sessions.filter((session) => session.id !== snapshot.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100),
      }
    })
  }, [])

  const deleteSession = useCallback(async (gameId: GameId, mode: 'daily' | 'practice', date: string, keepPuzzleId?: string) => {
    await deleteGameSession(gameId, mode, date, keepPuzzleId)
    setState((current) => ({ ...current, sessions: current.sessions.filter((session) => !(session.gameId === gameId && session.mode === mode && session.date === date && !(session.puzzleId === keepPuzzleId && session.version === 1))) }))
  }, [])

  const importData = useCallback(async (input: string) => {
    await importProgress(input)
    await refresh()
  }, [refresh])

  const resetData = useCallback(async () => {
    await resetProgress()
    await refresh()
  }, [refresh])

  const value = useMemo<AppDataValue>(() => ({
    state,
    ready,
    updateSettings,
    toggleFavorite,
    completeGame,
    saveSession,
    deleteSession,
    exportData: () => exportProgress(),
    importData,
    resetData,
  }), [state, ready, updateSettings, toggleFavorite, completeGame, saveSession, deleteSession, importData, resetData])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

function sameSessionProgress(left: GameSessionSnapshot, right: GameSessionSnapshot): boolean {
  return left.gameId === right.gameId
    && left.mode === right.mode
    && left.puzzleId === right.puzzleId
    && left.seed === right.seed
    && left.date === right.date
    && left.version === right.version
    && left.startedAt === right.startedAt
    && JSON.stringify(left.payload) === JSON.stringify(right.payload)
}
