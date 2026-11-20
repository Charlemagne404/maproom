import { describe, expect, it } from 'vitest'
import { dateInTimeZone } from '../../src/puzzles/engine'
import { DAILY_GAME_ELIGIBILITY, getEligibleDailyGameIds, isDailyEligible } from '../../src/daily/eligibility'
import { DAILY_CHALLENGE_COUNT, DAILY_SCHEDULE_EPOCH, getDailyGameLineup } from '../../src/daily/schedule'

function dateAt(offset: number): string {
  const timestamp = Date.parse(`${DAILY_SCHEDULE_EPOCH}T12:00:00.000Z`) + offset * 86_400_000
  return new Date(timestamp).toISOString().slice(0, 10)
}

describe('versioned Daily rotation', () => {
  it('returns six distinct games and ignores eligible-list ordering', () => {
    const date = '2026-11-18'
    const forward = getDailyGameLineup(date)
    const reversed = getDailyGameLineup(date, [...DAILY_GAME_ELIGIBILITY].reverse())

    expect(forward).toHaveLength(DAILY_CHALLENGE_COUNT)
    expect(new Set(forward).size).toBe(DAILY_CHALLENGE_COUNT)
    expect(reversed).toEqual(forward)
  })

  it('keeps the same six-game set but varies deterministic card order by date', () => {
    const sixEligible = DAILY_GAME_ELIGIBILITY.filter((entry) => entry.eligible).slice(0, 6)
    const first = getDailyGameLineup('2026-11-18', sixEligible)
    const sameDay = getDailyGameLineup('2026-11-18', sixEligible)
    const nextDay = getDailyGameLineup('2026-11-19', sixEligible)

    expect(sameDay).toEqual(first)
    expect([...first].sort()).toEqual([...nextDay].sort())
    expect(nextDay).not.toEqual(first)
  })

  it('uses every six-game lineup once per 28-day balancing window', () => {
    const lineups = Array.from({ length: 28 }, (_, index) => getDailyGameLineup(dateAt(index)))
    const signatures = lineups.map((lineup) => [...lineup].sort().join('|'))
    const counts = new Map(getEligibleDailyGameIds().map((id) => [id, 0]))

    for (const lineup of lineups) for (const id of lineup) counts.set(id, counts.get(id)! + 1)

    expect(new Set(signatures).size).toBe(28)
    expect([...counts.values()]).toEqual(Array(8).fill(21))
  })

  it('keeps every eligible game nearly even over a full year and prevents frequent lineup repeats', () => {
    const lineups = Array.from({ length: 365 }, (_, index) => getDailyGameLineup(dateAt(index)))
    const gameCounts = new Map(getEligibleDailyGameIds().map((id) => [id, 0]))
    const lastSeen = new Map<string, number>()

    for (let index = 0; index < lineups.length; index += 1) {
      const lineup = lineups[index]!
      expect(lineup).toHaveLength(6)
      expect(new Set(lineup).size).toBe(6)
      for (const id of lineup) gameCounts.set(id, gameCounts.get(id)! + 1)
      const signature = [...lineup].sort().join('|')
      const previousIndex = lastSeen.get(signature)
      if (previousIndex !== undefined) expect(index - previousIndex).toBeGreaterThanOrEqual(28)
      lastSeen.set(signature, index)
    }

    expect(Math.max(...gameCounts.values()) - Math.min(...gameCounts.values())).toBe(1)
    expect([...gameCounts.values()].every((count) => count === 273 || count === 274)).toBe(true)
  })

  it('is stable for equal civil-date keys across timezones and changes only when the date key changes', () => {
    const sameInstant = new Date('2026-11-18T12:00:00.000Z')
    const utcDate = dateInTimeZone(sameInstant, 'UTC')
    const stockholmDate = dateInTimeZone(sameInstant, 'Europe/Stockholm')
    const losAngelesDate = dateInTimeZone(sameInstant, 'America/Los_Angeles')

    expect(utcDate).toBe(stockholmDate)
    expect(stockholmDate).toBe(losAngelesDate)
    expect(getDailyGameLineup(utcDate)).toEqual(getDailyGameLineup(stockholmDate))
    expect(getDailyGameLineup('2026-02-28')).not.toEqual(getDailyGameLineup('2026-03-01'))
    expect(getDailyGameLineup('2028-02-29')).toHaveLength(6)
    expect(getDailyGameLineup('2028-03-01')).toHaveLength(6)
  })

  it('rejects an invalid date key and a pool too small to fill all six slots', () => {
    expect(() => getDailyGameLineup('2026-02-30')).toThrow(RangeError)
    expect(() => getDailyGameLineup('2026/11/18')).toThrow(RangeError)
    expect(() => getDailyGameLineup('2026-11-18', DAILY_GAME_ELIGIBILITY.filter((entry) => !['cities', 'rivers', 'latitude-ladder'].includes(entry.gameId)))).toThrow(RangeError)
  })

  it('keeps all historical games out of Daily until separately reviewed', () => {
    for (const gameId of ['historical-geography', 'historical-flags', 'historical-states']) {
      expect(isDailyEligible(gameId)).toBe(false)
      expect(getEligibleDailyGameIds()).not.toContain(gameId)
      expect(DAILY_GAME_ELIGIBILITY.find((entry) => entry.gameId === gameId)).toMatchObject({ eligible: false })
    }
    expect(DAILY_GAME_ELIGIBILITY.find((entry) => entry.gameId === 'historical-geography')?.reason).toContain('Excluded from Daily')
  })
})
