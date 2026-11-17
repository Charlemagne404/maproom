import { openDB, type IDBPDatabase } from 'idb'
import type { AppState, GameId, GameResult, UserSettings } from '../geography/types'
import { GAME_IDS } from '../puzzles/engine'

const DB_NAME = 'maproom-progress'
const DB_VERSION = 1
const FALLBACK_KEY = 'maproom-progress-v1'
const DEFAULT_SETTINGS: UserSettings = {
  timeZone: 'Europe/Stockholm',
  mapLabels: true,
  sound: false,
  hasSeenInstallHelp: false,
}

interface PersistedData {
  settings: UserSettings
  favorites: GameId[]
  history: GameResult[]
}

let database: Promise<IDBPDatabase> | undefined

function openDatabase(): Promise<IDBPDatabase> {
  database ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
      if (!db.objectStoreNames.contains('history')) {
        const history = db.createObjectStore('history', { keyPath: 'id' })
        history.createIndex('by-date', 'completedAt')
        history.createIndex('by-game', 'gameId')
      }
    },
  }).catch((error) => {
    database = undefined
    throw error
  })
  return database
}

export async function loadAppData(): Promise<AppState> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(['settings', 'history'], 'readonly')
    const [settings, favorites, history] = await Promise.all([
      transaction.objectStore('settings').get('settings') as Promise<UserSettings | undefined>,
      transaction.objectStore('settings').get('favorites') as Promise<GameId[] | undefined>,
      transaction.objectStore('history').getAll() as Promise<GameResult[]>,
    ])
    await transaction.done
    return {
      settings: sanitizeSettings(settings),
      favorites: sanitizeFavorites(favorites),
      history: history.filter(isGameResult).sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
      storageAvailable: true,
    }
  } catch {
    try {
      const saved = readFallback()
      return { ...saved, storageAvailable: Boolean(window.localStorage) }
    } catch {
      return { settings: DEFAULT_SETTINGS, favorites: [], history: [], storageAvailable: false }
    }
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const clean = sanitizeSettings(settings)
  try {
    const db = await openDatabase()
    await db.put('settings', clean, 'settings')
  } catch {
    const saved = readFallback()
    writeFallback({ ...saved, settings: clean })
  }
}

export async function saveFavorites(favorites: GameId[]): Promise<void> {
  const clean = sanitizeFavorites(favorites)
  try {
    const db = await openDatabase()
    await db.put('settings', clean, 'favorites')
  } catch {
    const saved = readFallback()
    writeFallback({ ...saved, favorites: clean })
  }
}

export async function saveGameResult(result: GameResult): Promise<void> {
  if (!isGameResult(result)) throw new Error('This game result could not be saved because it is incomplete.')
  try {
    const db = await openDatabase()
    await db.put('history', result)
  } catch {
    const saved = readFallback()
    const history = [result, ...saved.history.filter((item) => item.id !== result.id)].slice(0, 2500)
    writeFallback({ ...saved, history })
  }
}

export async function resetProgress(): Promise<void> {
  let indexedDbError: unknown
  try {
    const db = await openDatabase()
    const transaction = db.transaction(['settings', 'history'], 'readwrite')
    await Promise.all([transaction.objectStore('settings').clear(), transaction.objectStore('history').clear()])
    await transaction.done
  } catch (error) {
    indexedDbError = error
  }
  try {
    window.localStorage.removeItem(FALLBACK_KEY)
  } catch (error) {
    throw new Error('Browser storage could not be cleared. Close private tabs or check available storage.', { cause: error })
  }
  if (indexedDbError) throw new Error('IndexedDB could not be cleared. Close other Maproom tabs and try again.', { cause: indexedDbError })
}

export async function exportProgress(): Promise<string> {
  const state = await loadAppData()
  return JSON.stringify({
    format: 'maproom-progress',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    favorites: state.favorites,
    history: state.history,
  }, null, 2)
}

export async function importProgress(input: string): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  if (!isExport(parsed)) throw new Error('This file is not a valid Maproom progress export.')
  const data: PersistedData = {
    settings: sanitizeSettings(parsed.settings),
    favorites: sanitizeFavorites(parsed.favorites),
    history: parsed.history.filter(isGameResult).slice(0, 2500),
  }
  try {
    const db = await openDatabase()
    const transaction = db.transaction(['settings', 'history'], 'readwrite')
    const settings = transaction.objectStore('settings')
    await Promise.all([
      settings.put(data.settings, 'settings'),
      settings.put(data.favorites, 'favorites'),
      transaction.objectStore('history').clear(),
    ])
    for (const result of data.history) transaction.objectStore('history').put(result)
    await transaction.done
  } catch {
    writeFallback(data)
  }
}

export function defaultSettings(): UserSettings {
  return { ...DEFAULT_SETTINGS }
}

function isExport(value: unknown): value is PersistedData & { format: string; version: number } {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return candidate.format === 'maproom-progress'
    && candidate.version === 1
    && typeof candidate.settings === 'object'
    && candidate.settings !== null
    && Array.isArray(candidate.favorites)
    && candidate.favorites.every(isGameId)
    && Array.isArray(candidate.history)
    && candidate.history.every(isGameResult)
}

function isGameId(value: unknown): value is GameId {
  return GAME_IDS.includes(String(value) as GameId)
}

function isGameResult(value: unknown): value is GameResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<GameResult>
  return typeof result.id === 'string'
    && isGameId(result.gameId)
    && (result.mode === 'daily' || result.mode === 'practice')
    && typeof result.puzzleId === 'string'
    && typeof result.date === 'string'
    && typeof result.startedAt === 'string'
    && typeof result.completedAt === 'string'
    && Number.isFinite(result.score)
    && Number.isFinite(result.correct)
    && Number.isFinite(result.total)
    && typeof result.completed === 'boolean'
    && Number.isFinite(result.elapsedSeconds)
}

function sanitizeSettings(value?: Partial<UserSettings>): UserSettings {
  const settings = value ?? {}
  let timeZone = DEFAULT_SETTINGS.timeZone
  if (typeof settings.timeZone === 'string') {
    try {
      new Intl.DateTimeFormat('en', { timeZone: settings.timeZone })
      timeZone = settings.timeZone
    } catch {
      timeZone = DEFAULT_SETTINGS.timeZone
    }
  }
  return {
    timeZone,
    mapLabels: typeof settings.mapLabels === 'boolean' ? settings.mapLabels : DEFAULT_SETTINGS.mapLabels,
    sound: typeof settings.sound === 'boolean' ? settings.sound : DEFAULT_SETTINGS.sound,
    hasSeenInstallHelp: typeof settings.hasSeenInstallHelp === 'boolean'
      ? settings.hasSeenInstallHelp
      : DEFAULT_SETTINGS.hasSeenInstallHelp,
  }
}

function sanitizeFavorites(value?: GameId[]): GameId[] {
  return [...new Set((value ?? []).filter(isGameId))]
}

function readFallback(): PersistedData {
  try {
    const data = window.localStorage.getItem(FALLBACK_KEY)
    if (!data) return { settings: DEFAULT_SETTINGS, favorites: [], history: [] }
    const parsed: unknown = JSON.parse(data)
    if (!parsed || typeof parsed !== 'object') return { settings: DEFAULT_SETTINGS, favorites: [], history: [] }
    const fallback = parsed as Partial<PersistedData>
    return {
      settings: sanitizeSettings(fallback.settings),
      favorites: sanitizeFavorites(fallback.favorites),
      history: Array.isArray(fallback.history) ? fallback.history.filter(isGameResult).slice(0, 2500) : [],
    }
  } catch {
    return { settings: DEFAULT_SETTINGS, favorites: [], history: [] }
  }
}

function writeFallback(data: PersistedData): void {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(data))
  } catch {
    throw new Error('Browser storage is full or unavailable. Export progress before clearing stored data.')
  }
}
