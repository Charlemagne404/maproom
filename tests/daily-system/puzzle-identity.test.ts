import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { City, RiverFeature } from '../../src/geography/types'
import { isCurrentWholeSettlement } from '../../src/geography/cityRecords'
import { buildRiverQuestionPool } from '../../src/puzzles/rivers'
import { createCityOrderQuestion } from '../../src/puzzles/latitudeLadder'
import { dailyPuzzleId, dailyPuzzleSeed, seededShuffle } from '../../src/puzzles/engine'

const dataDirectory = join(process.cwd(), 'public', 'data')
const riverFeatures = (JSON.parse(readFileSync(join(dataDirectory, 'rivers.json'), 'utf8')) as { features: RiverFeature[] }).features
const majorCities = (JSON.parse(readFileSync(join(dataDirectory, 'cities-major.json'), 'utf8')) as { cities: City[] }).cities
const riverPool = buildRiverQuestionPool(riverFeatures).filter((river) => river.scaleRank <= 3)
const cityPool = majorCities.filter((city) => city.population >= 100_000 && isCurrentWholeSettlement(city))

function dateAt(offset: number): string {
  const date = new Date('2026-01-01T12:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

describe('Daily puzzle identities and seeds', () => {
  it('uses stable, game-specific identities for every scheduled game', () => {
    const date = '2026-11-18'
    for (const gameId of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'rivers', 'latitude-ladder'] as const) {
      const identity = dailyPuzzleId(gameId, date)
      expect(dailyPuzzleSeed(gameId, date)).toBe(identity)
      expect(dailyPuzzleId(gameId, date)).toBe(identity)
      expect(dailyPuzzleSeed(gameId, date)).toContain(`${gameId}:${date}:v`)
    }
    expect(dailyPuzzleSeed('rivers', date)).not.toBe(dailyPuzzleSeed('latitude-ladder', date))
  })

  it('restores the same Riverways target and changes targets across dates', () => {
    expect(riverPool.length).toBeGreaterThanOrEqual(50)
    const targets = Array.from({ length: 30 }, (_, index) => {
      const seed = `${dailyPuzzleSeed('rivers', dateAt(index))}:riverways:medium:0`
      return seededShuffle(riverPool, seed)[0]?.id
    })
    const sameDaySeed = `${dailyPuzzleSeed('rivers', dateAt(0))}:riverways:medium:0`

    expect(seededShuffle(riverPool, sameDaySeed)[0]?.id).toBe(targets[0])
    expect(new Set(targets).size).toBeGreaterThan(10)
  })

  it('restores the same Latitude Ladder challenge and varies the city order by date', () => {
    expect(cityPool.length).toBeGreaterThan(100)
    const questions = Array.from({ length: 30 }, (_, index) => createCityOrderQuestion(
      cityPool,
      'latitude',
      `${dailyPuzzleSeed('latitude-ladder', dateAt(index))}:World:latitude:0`,
    ))
    const firstSeed = `${dailyPuzzleSeed('latitude-ladder', dateAt(0))}:World:latitude:0`

    expect(questions.every((question) => question !== undefined)).toBe(true)
    expect(createCityOrderQuestion(cityPool, 'latitude', firstSeed)).toEqual(questions[0])
    expect(new Set(questions.map((question) => question!.correctOrder.map((city) => city.id).join('|'))).size).toBeGreaterThan(20)
  })
})
