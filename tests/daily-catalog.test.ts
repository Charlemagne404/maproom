import { describe, expect, it } from 'vitest'
import { DAILY_GAME_IDS, games, isDailyGame } from '../src/games/catalog'
import { DAILY_GAME_ELIGIBILITY, getEligibleDailyGameIds } from '../src/daily/eligibility'
import { GAME_IDS } from '../src/geography/types'

describe('curated daily game catalogue', () => {
  it('registers all eighteen games and keeps the eight-game Daily allowlist explicit', () => {
    expect(DAILY_GAME_IDS).toEqual(['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'rivers', 'latitude-ladder'])
    expect(games.map((game) => game.id).sort()).toEqual([...GAME_IDS].sort())
    expect(new Set(games.map((game) => game.path)).size).toBe(games.length)
    expect(games).toHaveLength(18)
    for (const game of games) expect(isDailyGame(game.id)).toBe(DAILY_GAME_IDS.includes(game.id))
    expect(getEligibleDailyGameIds()).toEqual(DAILY_GAME_IDS)
    expect(DAILY_GAME_ELIGIBILITY.find((entry) => entry.gameId === 'historical-geography')).toMatchObject({ eligible: false })
    expect(DAILY_GAME_ELIGIBILITY.find((entry) => entry.gameId === 'historical-flags')).toMatchObject({ eligible: false })
    expect(DAILY_GAME_ELIGIBILITY.find((entry) => entry.gameId === 'historical-states')).toMatchObject({ eligible: false })
    expect(DAILY_GAME_ELIGIBILITY.filter((entry) => !entry.eligible).map((entry) => entry.gameId).sort()).toEqual([
      'connections', 'distance', 'higher-lower', 'historical-flags', 'historical-geography', 'historical-states', 'neighbours', 'population-pyramid', 'projection-match', 'watershed-match',
    ])
  })

  it('declares which games need country boundary geometry', () => {
    expect(games.filter((game) => game.requiresCountryGeometry).map((game) => game.id)).toEqual([
      'countries', 'outlines', 'routes', 'cities', 'neighbours', 'rivers', 'latitude-ladder', 'projection-match',
    ])
    expect(games.filter((game) => !game.requiresCountryGeometry).map((game) => game.id)).toEqual([
      'flags', 'grid', 'connections', 'higher-lower', 'distance', 'historical-geography', 'historical-flags', 'historical-states', 'population-pyramid', 'watershed-match',
    ])
  })
})
