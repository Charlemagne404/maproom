import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Country } from '../src/geography/types'
import { adaptiveFlagQuestionSequence, flagAnswerChoices, flagCountryPool, flagRevealOrders, FLAG_REVEAL_SLICES, practiceQuestionSequence, shuffleFlagPool } from '../src/games/flags/questionPool'

const catalog = JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'countries.json'), 'utf8')) as { countries: Country[] }

function randomFrom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 4_294_967_296
  }
}

describe('flag practice question pools', () => {
  it('randomly permutes the pool without omissions or repeats', () => {
    const pool = ['A', 'B', 'C', 'D', 'E', 'F']
    const first = shuffleFlagPool(pool, randomFrom(71))
    const second = shuffleFlagPool(pool, randomFrom(72))

    expect(new Set(first)).toEqual(new Set(pool))
    expect(new Set(second)).toEqual(new Set(pool))
    expect(first).not.toEqual(second)
  })

  it('reveals equal-width flag slices in a stable order balanced across each round', () => {
    for (const eligibility of ['standard', 'extended'] as const) {
      const pool = flagCountryPool(catalog.countries, 'All regions', eligibility)
      const questionCodes = practiceQuestionSequence(pool, 50, randomFrom(2026)).map((country) => country.iso3)
      const orders = flagRevealOrders(questionCodes, `flags:reveal-audit:${eligibility}`)
      const firstSliceCounts = new Map(FLAG_REVEAL_SLICES.map((slice) => [slice, 0]))

      for (const order of orders) {
        expect(order).toHaveLength(3)
        expect(new Set(order)).toEqual(new Set(FLAG_REVEAL_SLICES))
        firstSliceCounts.set(order[0]!, firstSliceCounts.get(order[0]!)! + 1)
      }

      const counts = [...firstSliceCounts.values()]
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
      expect(flagRevealOrders(questionCodes, `flags:reveal-audit:${eligibility}`)).toEqual(orders)
    }

    const mixedDesignCodes = ['FRA', 'ITA', 'IRL', 'NLD', 'AUS', 'GBR', 'CHE', 'NPL', 'USA', 'ZAF']
    const mixedDesignOrders = flagRevealOrders(mixedDesignCodes, 'flags:reveal-mixed-designs')
    const mixedDesignCounts = new Map(FLAG_REVEAL_SLICES.map((slice) => [slice, mixedDesignOrders.filter((order) => order[0] === slice).length]))
    expect([...mixedDesignCounts.values()].sort()).toEqual([3, 3, 4])
  })

  it('gives every eligible bundled country one turn per shuffled deck before cycling', () => {
    const pool = flagCountryPool(catalog.countries, 'All regions')
    expect(pool).toHaveLength(195)
    const extended = flagCountryPool(catalog.countries, 'All regions', 'extended')
    expect(extended.length).toBeGreaterThan(240)
    expect(extended.some((country) => ['CLP', 'ATC', 'CSI', 'ESB', 'WSB'].includes(country.iso3))).toBe(false)

    const questions = practiceQuestionSequence(pool, pool.length * 2 + 7, randomFrom(2026))
    for (const deck of [questions.slice(0, pool.length), questions.slice(pool.length, pool.length * 2)]) {
      expect(deck).toHaveLength(pool.length)
      expect(new Set(deck.map((country) => country.iso3))).toEqual(new Set(pool.map((country) => country.iso3)))
    }
    expect(questions[pool.length - 1]?.iso3).not.toBe(questions[pool.length]?.iso3)
    expect(questions).toHaveLength(pool.length * 2 + 7)
  })

  it('applies region filters before shuffling and represents that region fairly', () => {
    const europe = flagCountryPool(catalog.countries, 'Europe')
    const sequence = practiceQuestionSequence(europe, europe.length, randomFrom(92))

    expect(europe.length).toBeGreaterThan(30)
    expect(sequence.every((country) => country.continent === 'Europe')).toBe(true)
    expect(new Set(sequence.map((country) => country.iso3)).size).toBe(europe.length)
  })

  it('builds four distinct, valid answers and excludes a duplicate image of the correct flag', () => {
    const answer = { iso3: 'AAA', flagCode: 'aa' } as Country
    const pool = [
      answer,
      { iso3: 'BBB', flagCode: 'bb' } as Country,
      { iso3: 'CCC', flagCode: 'cc' } as Country,
      { iso3: 'DDD', flagCode: 'dd' } as Country,
      { iso3: 'EEE', flagCode: 'aa' } as Country,
    ]
    const choices = flagAnswerChoices(pool, answer, randomFrom(4))

    expect(choices).toHaveLength(4)
    expect(choices[0] === answer || choices.some((choice) => choice.iso3 === answer.iso3)).toBe(true)
    expect(new Set(choices.map((choice) => choice.iso3)).size).toBe(4)
    expect(choices.some((choice) => choice.iso3 === 'EEE')).toBe(false)
    expect(choices.every((choice) => pool.some((country) => country.iso3 === choice.iso3))).toBe(true)
  })

  it('prefers same-continent distractors when the region has enough different flags', () => {
    const answer = { iso3: 'AAA', flagCode: 'aa', continent: 'Africa' } as Country
    const pool = [
      answer,
      { iso3: 'BBB', flagCode: 'bb', continent: 'Africa' } as Country,
      { iso3: 'CCC', flagCode: 'cc', continent: 'Africa' } as Country,
      { iso3: 'DDD', flagCode: 'dd', continent: 'Africa' } as Country,
      { iso3: 'EEE', flagCode: 'ee', continent: 'Europe' } as Country,
    ]
    const choices = flagAnswerChoices(pool, answer, randomFrom(18))
    expect(choices).toHaveLength(4)
    expect(choices.every((country) => country.continent === 'Africa')).toBe(true)
  })

  it('puts missed flags first in review practice and avoids repeats within the round', () => {
    const pool = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF'].map((iso3) => ({ iso3, flagCode: iso3.toLowerCase() } as Country))
    const sequence = adaptiveFlagQuestionSequence(pool, ['AAA', 'DDD'], 5, randomFrom(91))
    expect(sequence).toHaveLength(5)
    expect(sequence.slice(0, 2).map((country) => country.iso3).sort()).toEqual(['AAA', 'DDD'])
    expect(new Set(sequence.map((country) => country.iso3)).size).toBe(5)
  })

  it('does not repeat between reshuffled practice decks unless the eligible pool has one country', () => {
    const pool = ['A', 'B', 'C']
    const sequence = practiceQuestionSequence(pool, 20, randomFrom(7))
    expect(sequence.every((country, index) => index === 0 || country !== sequence[index - 1])).toBe(true)
    expect(practiceQuestionSequence(['only'], 3, randomFrom(7))).toEqual(['only', 'only', 'only'])
  })
})
