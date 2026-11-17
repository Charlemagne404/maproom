import { describe, expect, it } from 'vitest'
import { isCompatibleGameSession } from '../src/games/sessionCompatibility'
import type { GameSessionSnapshot } from '../src/geography/types'

const snapshot: GameSessionSnapshot = {
  id: 'flags:2026-11-17',
  gameId: 'flags',
  mode: 'daily',
  puzzleId: 'flags:2026-11-17:v2',
  seed: 'flags:2026-11-17:v2',
  date: '2026-11-17',
  startedAt: '2026-11-17T10:00:00.000Z',
  updatedAt: '2026-11-17T10:01:00.000Z',
  version: 1,
  payload: { index: 2, answers: ['SWE'] },
}

describe('daily session compatibility', () => {
  it('restores a session only for its original daily puzzle identity', () => {
    expect(isCompatibleGameSession(snapshot, 'daily', 'flags:2026-11-17:v2')).toBe(true)
    expect(isCompatibleGameSession(snapshot, 'daily', 'flags:2026-11-17:v1')).toBe(false)
  })

  it('rejects unsupported save versions and leaves practice seeds scoped by session lookup', () => {
    expect(isCompatibleGameSession({ ...snapshot, version: 2 }, 'daily', snapshot.puzzleId)).toBe(false)
    const practice = { ...snapshot, mode: 'practice' as const, puzzleId: 'flags:practice:round-1' }
    expect(isCompatibleGameSession(practice, 'practice', 'flags:practice:round-1')).toBe(true)
    expect(isCompatibleGameSession(practice, 'practice', 'flags:practice:round-2')).toBe(false)
  })
})
