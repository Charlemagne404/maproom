import { openDB, type IDBPDatabase } from 'idb'
import type { AppState, GameId, GameResult, GameSessionSnapshot, UserSettings } from '../geography/types'
import { GAME_IDS } from '../puzzles/engine'

const DB_NAME = 'maproom-progress'
const DB_VERSION = 2
const FALLBACK_KEY = 'maproom-progress-v1'
const SESSION_FALLBACK_KEY = 'maproom-sessions-v1'
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
  sessions: GameSessionSnapshot[]
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
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' })
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
    const transaction = db.transaction(['settings', 'history', 'sessions'], 'readonly')
    const [settings, favorites, history, sessions] = await Promise.all([
      transaction.objectStore('settings').get('settings') as Promise<UserSettings | undefined>,
      transaction.objectStore('settings').get('favorites') as Promise<GameId[] | undefined>,
      transaction.objectStore('history').getAll() as Promise<GameResult[]>,
      transaction.objectStore('sessions').getAll() as Promise<GameSessionSnapshot[]>,
    ])
    await transaction.done
    const savedHistory = history.filter(isGameResult).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    const completedDaily = new Set(savedHistory
      .filter((result) => result.mode === 'daily' && result.completed)
      .map((result) => `${result.gameId}:${result.date}`))
    const savedSessions = mergeSessionSnapshots(sessions, readAllSessionMirrors())
      .filter((session) => session.mode !== 'daily' || !completedDaily.has(`${session.gameId}:${session.date}`))
    return {
      settings: sanitizeSettings(settings),
      favorites: sanitizeFavorites(favorites),
      history: savedHistory,
      sessions: savedSessions,
      storageAvailable: true,
    }
  } catch {
    try {
      const saved = readFallback()
      return { ...saved, storageAvailable: Boolean(window.localStorage) }
    } catch {
      return { settings: DEFAULT_SETTINGS, favorites: [], history: [], sessions: [], storageAvailable: false }
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

export async function saveGameResult(result: GameResult): Promise<boolean> {
  if (!isGameResult(result)) throw new Error('This game result could not be saved because it is incomplete.')
  try {
    const db = await openDatabase()
    const transaction = db.transaction(['history', 'sessions'], 'readwrite')
    if (result.mode === 'daily') {
      const history = await transaction.objectStore('history').getAll() as GameResult[]
      const completed = history.find((item) => item.mode === 'daily' && item.completed && item.gameId === result.gameId && item.date === result.date)
      if (completed && completed.id !== result.id) {
        const sessions = await transaction.objectStore('sessions').getAll() as GameSessionSnapshot[]
        for (const session of sessions) if (session.gameId === result.gameId && session.mode === 'daily' && session.date === result.date) transaction.objectStore('sessions').delete(session.id)
        await transaction.done
        removeSessionMirror(result.gameId, result.mode, result.date)
        return false
      }
    }
    await transaction.objectStore('history').put(result)
    const sessions = await transaction.objectStore('sessions').getAll() as GameSessionSnapshot[]
    for (const session of sessions) {
      if (session.gameId === result.gameId && session.mode === result.mode && session.date === result.date) {
        transaction.objectStore('sessions').delete(session.id)
      }
    }
    await transaction.done
  } catch {
    const saved = readFallback()
    const completed = result.mode === 'daily'
      ? saved.history.find((item) => item.mode === 'daily' && item.completed && item.gameId === result.gameId && item.date === result.date)
      : undefined
    if (completed && completed.id !== result.id) {
      removeSessionMirror(result.gameId, result.mode, result.date)
      return false
    }
    const history = [result, ...saved.history.filter((item) => item.id !== result.id)].slice(0, 2500)
    writeFallback({ ...saved, history, sessions: saved.sessions.filter((session) => !(session.gameId === result.gameId && session.mode === result.mode && session.date === result.date)) })
  }
  removeSessionMirror(result.gameId, result.mode, result.date)
  return true
}

export async function saveGameSession(snapshot: GameSessionSnapshot): Promise<boolean> {
  if (!isGameSessionSnapshot(snapshot)) throw new Error('This session could not be saved because its state is invalid.')
  try {
    const db = await openDatabase()
    const transaction = db.transaction(['history', 'sessions'], 'readwrite')
    if (snapshot.mode === 'daily') {
      const history = await transaction.objectStore('history').getAll() as GameResult[]
      const alreadyComplete = history.some((result) => result.gameId === snapshot.gameId && result.mode === 'daily' && result.date === snapshot.date && result.completed)
      if (alreadyComplete) {
        await transaction.done
        removeSessionMirror(snapshot.gameId, snapshot.mode, snapshot.date)
        return false
      }
    }
    await transaction.objectStore('sessions').put(snapshot)
    await transaction.done
  } catch {
    const saved = readFallback()
    if (snapshot.mode === 'daily' && saved.history.some((result) => result.gameId === snapshot.gameId && result.mode === 'daily' && result.date === snapshot.date && result.completed)) {
      removeSessionMirror(snapshot.gameId, snapshot.mode, snapshot.date)
      return false
    }
    writeFallback({ ...saved, sessions: [snapshot, ...saved.sessions.filter((session) => session.id !== snapshot.id)].slice(0, 100) })
  }
  writeSessionMirror(snapshot)
  return true
}

export function readSessionMirror(gameId: GameId, mode: 'daily' | 'practice', date: string, seed?: string): GameSessionSnapshot | undefined {
  return readAllSessionMirrors().find((session) => session.gameId === gameId && session.mode === mode && session.date === date && (!seed || session.seed === seed))
}

export async function deleteGameSession(gameId: GameId, mode: 'daily' | 'practice', date: string, keepPuzzleId?: string): Promise<void> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction('sessions', 'readwrite')
    const sessions = await transaction.store.getAll() as GameSessionSnapshot[]
    for (const session of sessions) {
      const matches = session.gameId === gameId && session.mode === mode && session.date === date
      const keep = session.puzzleId === keepPuzzleId && session.version === 1
      if (matches && !keep) transaction.store.delete(session.id)
    }
    await transaction.done
  } catch {
    const saved = readFallback()
    writeFallback({ ...saved, sessions: saved.sessions.filter((session) => !(session.gameId === gameId && session.mode === mode && session.date === date && !(session.puzzleId === keepPuzzleId && session.version === 1))) })
  }
  removeSessionMirror(gameId, mode, date, keepPuzzleId)
}

export async function resetProgress(): Promise<void> {
  let indexedDbError: unknown
  try {
    const db = await openDatabase()
    const transaction = db.transaction(['settings', 'history', 'sessions'], 'readwrite')
    await Promise.all([transaction.objectStore('settings').clear(), transaction.objectStore('history').clear(), transaction.objectStore('sessions').clear()])
    await transaction.done
  } catch (error) {
    indexedDbError = error
  }
  try {
    window.localStorage.removeItem(FALLBACK_KEY)
    window.localStorage.removeItem(SESSION_FALLBACK_KEY)
  } catch (error) {
    throw new Error('Browser storage could not be cleared. Close private tabs or check available storage.', { cause: error })
  }
  if (indexedDbError) throw new Error('IndexedDB could not be cleared. Close other Maproom tabs and try again.', { cause: indexedDbError })
}

export async function exportProgress(): Promise<string> {
  const state = await loadAppData()
  return JSON.stringify({
    format: 'maproom-progress',
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    favorites: state.favorites,
    history: state.history,
    sessions: state.sessions,
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
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions.filter(isGameSessionSnapshot).slice(0, 100) : [],
  }
  try {
    const db = await openDatabase()
    const transaction = db.transaction(['settings', 'history', 'sessions'], 'readwrite')
    const settings = transaction.objectStore('settings')
    await Promise.all([
      settings.put(data.settings, 'settings'),
      settings.put(data.favorites, 'favorites'),
      transaction.objectStore('history').clear(),
      transaction.objectStore('sessions').clear(),
    ])
    for (const result of data.history) transaction.objectStore('history').put(result)
    for (const session of data.sessions) transaction.objectStore('sessions').put(session)
    await transaction.done
  } catch {
    writeFallback(data)
  }
  replaceSessionMirror(data.sessions)
}

export function defaultSettings(): UserSettings {
  return { ...DEFAULT_SETTINGS }
}

function isExport(value: unknown): value is PersistedData & { format: string; version: number } {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return candidate.format === 'maproom-progress'
    && (candidate.version === 1 || candidate.version === 2)
    && typeof candidate.settings === 'object'
    && candidate.settings !== null
    && Array.isArray(candidate.favorites)
    && candidate.favorites.every(isGameId)
    && Array.isArray(candidate.history)
    && candidate.history.every(isGameResult)
    && (candidate.version === 1 || candidate.sessions === undefined || (Array.isArray(candidate.sessions) && candidate.sessions.every(isGameSessionSnapshot)))
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

function isGameSessionSnapshot(value: unknown): value is GameSessionSnapshot {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<GameSessionSnapshot>
  return typeof session.id === 'string'
    && isGameId(session.gameId)
    && (session.mode === 'daily' || session.mode === 'practice')
    && typeof session.puzzleId === 'string'
    && typeof session.seed === 'string'
    && typeof session.date === 'string'
    && typeof session.startedAt === 'string'
    && typeof session.updatedAt === 'string'
    && Number.isInteger(session.version)
    && Boolean(session.payload && typeof session.payload === 'object' && !Array.isArray(session.payload))
    && JSON.stringify(session.payload).length < 1_000_000
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
    if (!data) return { settings: DEFAULT_SETTINGS, favorites: [], history: [], sessions: readAllSessionMirrors() }
    const parsed: unknown = JSON.parse(data)
    if (!parsed || typeof parsed !== 'object') return { settings: DEFAULT_SETTINGS, favorites: [], history: [], sessions: readAllSessionMirrors() }
    const fallback = parsed as Partial<PersistedData>
    return {
      settings: sanitizeSettings(fallback.settings),
      favorites: sanitizeFavorites(fallback.favorites),
      history: Array.isArray(fallback.history) ? fallback.history.filter(isGameResult).slice(0, 2500) : [],
      sessions: Array.isArray(fallback.sessions) ? fallback.sessions.filter(isGameSessionSnapshot).slice(0, 100) : readAllSessionMirrors(),
    }
  } catch {
    return { settings: DEFAULT_SETTINGS, favorites: [], history: [], sessions: readAllSessionMirrors() }
  }
}

function writeFallback(data: PersistedData): void {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(data))
  } catch {
    throw new Error('Browser storage is full or unavailable. Export progress before clearing stored data.')
  }
}

function readAllSessionMirrors(): GameSessionSnapshot[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SESSION_FALLBACK_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isGameSessionSnapshot).slice(0, 100) : []
  } catch { return [] }
}

function mergeSessionSnapshots(primary: GameSessionSnapshot[], mirror: GameSessionSnapshot[]): GameSessionSnapshot[] {
  const sessions = new Map<string, GameSessionSnapshot>()
  for (const session of [...primary, ...mirror]) {
    if (!isGameSessionSnapshot(session)) continue
    const previous = sessions.get(session.id)
    if (!previous || session.updatedAt.localeCompare(previous.updatedAt) > 0) sessions.set(session.id, session)
  }
  return [...sessions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100)
}

function writeSessionMirror(snapshot: GameSessionSnapshot): void {
  const sessions = readAllSessionMirrors().filter((session) => session.id !== snapshot.id)
  try { window.localStorage.setItem(SESSION_FALLBACK_KEY, JSON.stringify([snapshot, ...sessions].slice(0, 100))) } catch { /* IndexedDB remains the primary store. */ }
}

function replaceSessionMirror(sessions: GameSessionSnapshot[]): void {
  try { window.localStorage.setItem(SESSION_FALLBACK_KEY, JSON.stringify(sessions.slice(0, 100))) } catch { /* IndexedDB or the progress fallback remains available. */ }
}

function removeSessionMirror(gameId: GameId, mode: 'daily' | 'practice', date: string, keepPuzzleId?: string): void {
  const sessions = readAllSessionMirrors().filter((session) => !(session.gameId === gameId && session.mode === mode && session.date === date && !(session.puzzleId === keepPuzzleId && session.version === 1)))
  try { window.localStorage.setItem(SESSION_FALLBACK_KEY, JSON.stringify(sessions)) } catch { /* A completed result is already committed in IndexedDB. */ }
}
