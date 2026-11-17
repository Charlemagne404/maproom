// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { indexedDB } from 'fake-indexeddb'
import {
  defaultSettings,
  exportProgress,
  importProgress,
  loadAppData,
  resetProgress,
  saveFavorites,
  saveGameResult,
  saveSettings,
} from './store'
import type { GameResult } from '../geography/types'

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
    await saveFavorites(['flags', 'flags', 'cities'])
    await saveGameResult(result('daily-result'))
    await saveGameResult(result('daily-result'))

    let state = await loadAppData()
    expect(state.storageAvailable).toBe(true)
    expect(state.settings.timeZone).toBe('Europe/London')
    expect(state.settings.mapLabels).toBe(false)
    expect(state.favorites).toEqual(['flags', 'cities'])
    expect(state.history).toHaveLength(1)

    const backup = await exportProgress()
    expect(JSON.parse(backup)).toMatchObject({ format: 'maproom-progress', version: 1 })
    await expect(importProgress('{')).rejects.toThrow('valid JSON')
    await expect(importProgress(JSON.stringify({ format: 'maproom-progress', version: 1, settings: {}, favorites: ['bogus'], history: [] })))
      .rejects.toThrow('valid Maproom progress export')
    expect((await loadAppData()).history).toHaveLength(1)

    await saveSettings({ ...defaultSettings(), timeZone: 'Invalid/Timezone' })
    expect((await loadAppData()).settings.timeZone).toBe('Europe/Stockholm')
    await importProgress(backup)
    state = await loadAppData()
    expect(state.settings.timeZone).toBe('Europe/London')
    expect(state.favorites).toEqual(['flags', 'cities'])
    expect(state.history).toHaveLength(1)

    await resetProgress()
    state = await loadAppData()
    expect(state.settings).toEqual(defaultSettings())
    expect(state.favorites).toEqual([])
    expect(state.history).toEqual([])
  })
})
