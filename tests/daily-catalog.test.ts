import { describe, expect, it } from 'vitest'
import { DAILY_GAME_IDS, games, isDailyGame } from '../src/games/catalog'
import { GAME_IDS } from '../src/geography/types'

describe('curated daily game catalogue', () => {
  it('keeps exactly the six original game families in the daily set', () => {
    expect(DAILY_GAME_IDS).toEqual(['countries', 'outlines', 'routes', 'flags', 'grid', 'cities'])
    expect(games.map((game) => game.id).sort()).toEqual([...GAME_IDS].sort())
    expect(new Set(games.map((game) => game.path)).size).toBe(games.length)
    expect(games).toHaveLength(12)
    for (const game of games) expect(isDailyGame(game.id)).toBe(DAILY_GAME_IDS.includes(game.id))
  })

  it('declares which games need country boundary geometry', () => {
    expect(games.filter((game) => game.requiresCountryGeometry).map((game) => game.id)).toEqual([
      'countries', 'outlines', 'routes', 'cities', 'neighbours', 'rivers', 'latitude-ladder',
    ])
    expect(games.filter((game) => !game.requiresCountryGeometry).map((game) => game.id)).toEqual([
      'flags', 'grid', 'connections', 'higher-lower', 'distance',
    ])
  })
})
