import type { Country } from '../../geography/types'

export type PracticeQuestionCount = '10' | '20' | '50' | 'infinite'

export function flagCountryPool(countries: readonly Country[], region: string): Country[] {
  return countries.filter((country) => country.flagCode && (region === 'All regions' || country.continent === region))
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

export function flagAnswerChoices(pool: readonly Country[], answer: Country, random: () => number = Math.random, count = 4): Country[] {
  const distractors = shuffleFlagPool(
    pool.filter((country) => country.iso3 !== answer.iso3 && country.flagCode !== answer.flagCode),
    random,
  ).slice(0, count - 1)
  if (distractors.length < count - 1) return []
  return shuffleFlagPool([answer, ...distractors], random)
}
