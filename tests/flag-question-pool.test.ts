import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Country } from '../src/geography/types'
import { flagAnswerChoices, flagCountryPool, practiceQuestionSequence, shuffleFlagPool } from '../src/games/flags/questionPool'

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

  it('gives every eligible bundled country one turn per shuffled deck before cycling', () => {
    const pool = flagCountryPool(catalog.countries, 'All regions')
    expect(pool.length).toBeGreaterThan(240)

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

  it('does not repeat between reshuffled practice decks unless the eligible pool has one country', () => {
    const pool = ['A', 'B', 'C']
    const sequence = practiceQuestionSequence(pool, 20, randomFrom(7))
    expect(sequence.every((country, index) => index === 0 || country !== sequence[index - 1])).toBe(true)
    expect(practiceQuestionSequence(['only'], 3, randomFrom(7))).toEqual(['only', 'only', 'only'])
  })
})
