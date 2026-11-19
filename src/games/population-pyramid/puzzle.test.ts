import { describe, expect, it } from 'vitest'
import ageProfileData from '../../../public/data/population-age-profiles.json'
import { isPopulationAgeProfiles, type PopulationAgeProfile } from './data'
import { createPopulationPyramidDeck, POPULATION_PYRAMID_ROUND_GAPS, scorePopulationPyramidOrder } from './puzzle'

const profiles = (ageProfileData as { profiles: PopulationAgeProfile[] }).profiles

describe('Population Pyramid Sort', () => {
  it('uses the checked 2023 source data and keeps the gender cohorts expressed as total-population shares', () => {
    expect(isPopulationAgeProfiles(ageProfileData)).toBe(true)
    expect(profiles).toHaveLength(194)
    expect(profiles.every((profile) => profile.male.length === 17 && profile.female.length === 17)).toBe(true)
    expect(profiles.find(({ iso3 }) => iso3 === 'VAT')).toBeUndefined()
  })

  it('builds five repeatable rounds with closer share gaps and no country reuse', () => {
    const first = createPopulationPyramidDeck(profiles, 'population-seed')
    expect(createPopulationPyramidDeck(profiles, 'population-seed')).toEqual(first)
    expect(createPopulationPyramidDeck(profiles, 'population-seed', 1)).not.toEqual(first)
    expect(first).toHaveLength(5)
    expect(new Set(first.flatMap((round) => round.profiles.map(({ iso3 }) => iso3))).size).toBe(15)

    for (const [index, round] of first.entries()) {
      const values = round.profiles.map(({ age65Plus }) => age65Plus)
      expect(values).toEqual([...values].sort((left, right) => left - right))
      expect(new Set(round.startingOrder)).toEqual(new Set(round.profiles.map(({ iso3 }) => iso3)))
      expect(round.startingOrder).not.toEqual(round.profiles.map(({ iso3 }) => iso3))
      for (let pair = 0; pair < 2; pair += 1) {
        const gap = values[pair + 1]! - values[pair]!
        expect(gap).toBeGreaterThanOrEqual(POPULATION_PYRAMID_ROUND_GAPS[index]!.minimum)
        expect(gap).toBeLessThanOrEqual(POPULATION_PYRAMID_ROUND_GAPS[index]!.maximum)
      }
    }
  })

  it('scores the three pairwise decisions and identifies an exact ranking', () => {
    expect(scorePopulationPyramidOrder(['AFG', 'SWE', 'JPN'], ['AFG', 'SWE', 'JPN'])).toEqual({
      correctPairs: 3,
      totalPairs: 3,
      exact: true,
      score: 300,
    })
    expect(scorePopulationPyramidOrder(['SWE', 'AFG', 'JPN'], ['AFG', 'SWE', 'JPN'])).toMatchObject({
      correctPairs: 2,
      exact: false,
      score: 200,
    })
    expect(scorePopulationPyramidOrder(['JPN', 'SWE', 'AFG'], ['AFG', 'SWE', 'JPN'])).toMatchObject({
      correctPairs: 0,
      exact: false,
      score: 0,
    })
    expect(() => scorePopulationPyramidOrder(['AFG', 'AFG', 'JPN'], ['AFG', 'SWE', 'JPN'])).toThrow(/same three distinct profiles/)
  })
})
