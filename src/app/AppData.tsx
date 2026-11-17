import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { AppState, GameId, GameResult, UserSettings } from '../geography/types'
import { defaultSettings, exportProgress, importProgress, loadAppData, resetProgress, saveFavorites, saveGameResult, saveSettings } from '../persistence/store'
import { AppDataContext, type AppDataValue } from './AppDataContext'

export function AppDataProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>({
    settings: defaultSettings(),
    favorites: [],
    history: [],
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
    await saveGameResult(result)
    setState((current) => ({
      ...current,
      history: [result, ...current.history.filter((item) => item.id !== result.id)]
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 2500),
    }))
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
    exportData: () => exportProgress(),
    importData,
    resetData,
  }), [state, ready, updateSettings, toggleFavorite, completeGame, importData, resetData])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
