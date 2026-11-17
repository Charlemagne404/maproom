import { describe, expect, it } from 'vitest'
import { DAILY_GAME_IDS, games, isDailyGame } from '../src/games/catalog'

describe('curated daily game catalogue', () => {
  it('keeps exactly the six original game families in the daily set', () => {
    expect(DAILY_GAME_IDS).toEqual(['countries', 'outlines', 'routes', 'flags', 'grid', 'cities'])
    expect(games).toHaveLength(10)
    for (const game of games) expect(isDailyGame(game.id)).toBe(DAILY_GAME_IDS.includes(game.id))
  })
})
