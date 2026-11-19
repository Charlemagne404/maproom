import { describe, expect, it } from 'vitest'
import { DAILY_GAME_IDS, games, isDailyGame } from './catalog'
import { GAME_IDS } from '../geography/types'

describe('game catalogue', () => {
  it('registers each stable game once and keeps Population Pyramid Sort outside Daily', () => {
    expect(games.map(({ id }) => id).sort()).toEqual([...GAME_IDS].sort())
    expect(games.filter(({ id }) => id === 'population-pyramid')).toHaveLength(1)
    expect(isDailyGame('population-pyramid')).toBe(false)
    expect(DAILY_GAME_IDS).not.toContain('population-pyramid')
    expect(games.find(({ id }) => id === 'population-pyramid')).toMatchObject({
      title: 'Population Pyramid Sort',
      path: '/games/population-pyramid',
      requiresCountryGeometry: false,
    })
  })
})
