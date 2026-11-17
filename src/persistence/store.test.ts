// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { indexedDB } from 'fake-indexeddb'
import {
  defaultSettings,
  deleteGameSession,
  exportProgress,
  importProgress,
  loadAppData,
  resetProgress,
  saveGameSession,
  saveFavorites,
  saveGameResult,
  saveSettings,
} from './store'
import type { GameResult, GameSessionSnapshot } from '../geography/types'

function result(id: string): GameResult {
  return {
    id,
    gameId: 'countries',
    mode: 'daily',
    puzzleId: 'countries:2026-11-16:v1',
    date: '2026-11-16',
    startedAt: '2026-11-16T10:00:00.000Z',
    completedAt: '2026-11-16T10:03:00.000Z',
    score: 700,
    correct: 7,
    total: 8,
    completed: true,
    elapsedSeconds: 180,
  }
}

describe('local progress storage', () => {
  beforeAll(() => {
    vi.stubGlobal('indexedDB', indexedDB)
    window.localStorage.clear()
  })

  afterAll(() => vi.unstubAllGlobals())

  it('stores settings, favorites and results, validates imports, and resets safely', async () => {
    await saveSettings({ ...defaultSettings(), timeZone: 'Europe/London', mapLabels: false })
    await saveFavorites(['flags', 'flags', 'cities', 'connections', 'distance'])
    await saveGameResult(result('daily-result'))
    await saveGameResult(result('daily-result'))
    await saveGameResult({ ...result('connections-result'), gameId: 'connections', puzzleId: 'connections:2026-11-16:v1' })

    let state = await loadAppData()
    expect(state.storageAvailable).toBe(true)
    expect(state.settings.timeZone).toBe('Europe/London')
    expect(state.settings.mapLabels).toBe(false)
    expect(state.favorites).toEqual(['flags', 'cities', 'connections', 'distance'])
    expect(state.history).toHaveLength(2)
    expect(state.history.find((item) => item.gameId === 'connections')?.score).toBe(700)
    expect(state.history.find((item) => item.id === 'daily-result')?.puzzleId).toBe('countries:2026-11-16:v1')

    const session: GameSessionSnapshot = {
      id: 'flags:2026-11-17',
      gameId: 'flags',
      mode: 'daily',
      puzzleId: 'flags:2026-11-17:v2',
      seed: 'flags:2026-11-17:v2',
      date: '2026-11-17',
      startedAt: '2026-11-17T10:00:00.000Z',
      updatedAt: '2026-11-17T10:01:00.000Z',
      version: 1,
      payload: { questionIndex: 2, answers: ['SWE', 'NOR'], score: 100 },
    }
    await saveGameSession(session)
    await saveGameSession({ ...session, id: `${session.id}:legacy`, puzzleId: 'flags:2026-11-17:v1', seed: 'flags:2026-11-17:v1' })
    await deleteGameSession('flags', 'daily', session.date, session.puzzleId)
    state = await loadAppData()
    expect(state.sessions).toEqual([session])

    const backup = await exportProgress()
    expect(JSON.parse(backup)).toMatchObject({ format: 'maproom-progress', version: 2, sessions: [session] })
    await expect(importProgress('{')).rejects.toThrow('valid JSON')
    await expect(importProgress(JSON.stringify({ format: 'maproom-progress', version: 1, settings: {}, favorites: ['bogus'], history: [] })))
      .rejects.toThrow('valid Maproom progress export')
    expect((await loadAppData()).history).toHaveLength(2)

    await saveSettings({ ...defaultSettings(), timeZone: 'Invalid/Timezone' })
    expect((await loadAppData()).settings.timeZone).toBe('Europe/Stockholm')
    await importProgress(backup)
    state = await loadAppData()
    expect(state.settings.timeZone).toBe('Europe/London')
    expect(state.favorites).toEqual(['flags', 'cities', 'connections', 'distance'])
    expect(state.history).toHaveLength(2)
    expect(state.sessions).toEqual([session])

    await saveGameResult({ ...result('flags-result'), gameId: 'flags', puzzleId: session.puzzleId, date: session.date })
    expect((await loadAppData()).sessions).toEqual([])
    expect(await saveGameResult({ ...result('flags-next-version'), gameId: 'flags', puzzleId: 'flags:2026-11-17:v3', date: session.date })).toBe(false)
    expect((await loadAppData()).history.filter((item) => item.mode === 'daily' && item.gameId === 'flags' && item.date === session.date)).toHaveLength(1)
    expect(await saveGameSession({ ...session, payload: { questionIndex: 7 } })).toBe(false)
    expect((await loadAppData()).sessions).toEqual([])

    await importProgress(JSON.stringify({
      format: 'maproom-progress',
      version: 1,
      settings: defaultSettings(),
      favorites: [],
      history: [],
    }))
    expect((await loadAppData()).sessions).toEqual([])

    const recovered = { ...session, updatedAt: '2026-11-17T10:02:00.000Z', payload: { questionIndex: 3, score: 250 } }
    window.localStorage.setItem('maproom-sessions-v1', JSON.stringify([recovered]))
    expect((await loadAppData()).sessions).toEqual([recovered])
    await saveGameResult({ ...result('flags-result-after-recovery'), gameId: 'flags', puzzleId: session.puzzleId, date: session.date })
    window.localStorage.setItem('maproom-sessions-v1', JSON.stringify([recovered]))
    expect((await loadAppData()).sessions).toEqual([])

    await resetProgress()
    state = await loadAppData()
    expect(state.settings).toEqual(defaultSettings())
    expect(state.favorites).toEqual([])
    expect(state.history).toEqual([])
    expect(state.sessions).toEqual([])
  })
})
