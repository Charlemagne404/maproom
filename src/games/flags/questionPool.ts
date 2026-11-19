import type { Country } from '../../geography/types'
import { eligibleCountries, type GeographyEligibility } from '../../geography/eligibility'
import { seededShuffle } from '../../puzzles/engine'

export type PracticeQuestionCount = '10' | '20' | '50' | 'infinite'
export const FLAG_REVEAL_SLICES = ['left', 'center', 'right'] as const
export type FlagRevealSlice = (typeof FLAG_REVEAL_SLICES)[number]

export function flagRevealOrders(questionCodes: readonly string[], seed: string): FlagRevealSlice[][] {
  const slotOrder = seededShuffle(questionCodes.map((_, index) => index), `${seed}:reveal-slots`)
  const sliceOrder = seededShuffle(FLAG_REVEAL_SLICES, `${seed}:reveal-slices`)
  const orders: FlagRevealSlice[][] = Array.from({ length: questionCodes.length }, () => [...FLAG_REVEAL_SLICES])

  slotOrder.forEach((slot, rank) => {
    const first = sliceOrder[rank % FLAG_REVEAL_SLICES.length]!
    const remaining = seededShuffle(
      FLAG_REVEAL_SLICES.filter((slice) => slice !== first),
      `${seed}:reveal-order:${slot}:${questionCodes[slot]}`,
    )
    orders[slot] = [first, ...remaining]
  })

  return orders
}

export function flagCountryPool(countries: readonly Country[], region: string, eligibility: GeographyEligibility = 'standard'): Country[] {
  return eligibleCountries([...countries], eligibility).filter((country) => country.flagCode && country.flagEligible !== false && (region === 'All regions' || country.continent === region))
}

export function shuffleFlagPool<T>(values: readonly T[], random: () => number = Math.random, previous?: T): T[] {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
  }

  // Starting a fresh deck with the previous deck's last country feels like a repeat.
  // Swap it out while preserving a complete, once-per-deck permutation.
  if (shuffled.length > 1 && Object.is(shuffled[0], previous)) {
    const other = 1 + Math.floor(random() * (shuffled.length - 1))
    ;[shuffled[0], shuffled[other]] = [shuffled[other], shuffled[0]]
  }
  return shuffled
}

export function practiceQuestionSequence<T>(values: readonly T[], count: number, random: () => number = Math.random): T[] {
  if (values.length === 0 || count <= 0) return []
  const questions: T[] = []
  let previous: T | undefined
  while (questions.length < count) {
    const deck = shuffleFlagPool(values, random, previous)
    const next = deck.slice(0, count - questions.length)
    questions.push(...next)
    previous = questions.at(-1)
  }
  return questions
}

export function adaptiveFlagQuestionSequence<T extends Country>(values: readonly T[], missedCodes: readonly string[], count: number, random: () => number = Math.random, previous?: T): T[] {
  if (values.length === 0 || count <= 0) return []
  const reviewed = shuffleFlagPool(values.filter((value) => missedCodes.includes(value.iso3)), random, previous)
  const first = reviewed.slice(0, Math.min(count, reviewed.length))
  if (first.length === count) return first
  const remaining = values.filter((value) => !first.includes(value))
  return [...first, ...practiceQuestionSequence(remaining.length ? remaining : values, count - first.length, random)]
}

export function flagAnswerChoices(pool: readonly Country[], answer: Country, random: () => number = Math.random, count = 4): Country[] {
  const candidates = pool.filter((country) => country.iso3 !== answer.iso3 && country.flagCode !== answer.flagCode)
  const regional = candidates.filter((country) => country.continent === answer.continent)
  const selected = shuffleFlagPool(regional, random).slice(0, count - 1)
  const fallback = shuffleFlagPool(candidates.filter((country) => !selected.includes(country)), random).slice(0, count - 1 - selected.length)
  const distractors = [...selected, ...fallback]
  if (distractors.length < count - 1) return []
  return shuffleFlagPool([answer, ...distractors], random)
}
