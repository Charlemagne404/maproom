import type { Country, GeoFeature } from '../../geography/types'
import { classifyGeography } from '../../geography/eligibility'
import { hashSeed, seededRandom, seededShuffle } from '../../puzzles/engine'
import { outlineRuleFor, type OutlineDifficulty, type OutlineRule } from './playability.mjs'
export type { OutlineDifficulty } from './playability.mjs'

export type OutlinePoolMode = 'standard' | 'extended' | 'territories'

export interface OutlineCandidate {
  code: string
  country: Country
  features: GeoFeature[]
  rule: OutlineRule
}

export interface OutlineCandidateGroups {
  standard: OutlineCandidate[]
  extended: OutlineCandidate[]
}

export interface OutlineSequenceProgress {
  index: number
  lastCode: string | null
}

export const EMPTY_OUTLINE_PROGRESS: OutlineSequenceProgress = { index: 0, lastCode: null }

export function buildOutlineCandidateGroups(
  countries: readonly Country[],
  featuresByCode: ReadonlyMap<string, GeoFeature[]>,
  options: { pool: OutlinePoolMode; difficulty: OutlineDifficulty; scope: string },
): OutlineCandidateGroups {
  const groups: OutlineCandidateGroups = { standard: [], extended: [] }
  for (const country of countries) {
    if (!country.hasGeometry || (options.scope !== 'World' && country.continent !== options.scope)) continue
    const rule = outlineRuleFor(country.iso3)
    const features = featuresByCode.get(country.iso3)
    if (!rule || rule.status !== 'eligible' || rule.difficulty !== options.difficulty || !features?.length) continue
    const classification = classifyGeography(country)
    if (options.pool === 'standard') {
      if (classification === 'standard-quiz-identity') groups.standard.push({ code: country.iso3, country, features, rule })
      continue
    }
    if (options.pool === 'territories') {
      if (classification === 'separately-represented-territory') groups.extended.push({ code: country.iso3, country, features, rule })
      continue
    }
    if (classification === 'special-geographic-entity') continue
    if (classification === 'standard-quiz-identity') groups.standard.push({ code: country.iso3, country, features, rule })
    else groups.extended.push({ code: country.iso3, country, features, rule })
  }
  groups.standard.sort((left, right) => left.code.localeCompare(right.code))
  groups.extended.sort((left, right) => left.code.localeCompare(right.code))
  return groups
}

export function outlinePoolSize(groups: OutlineCandidateGroups): number {
  return groups.standard.length + groups.extended.length
}

export function outlineQuestionAt<T extends { code: string }>(
  groups: { standard: readonly T[]; extended: readonly T[] },
  seed: string,
  progress: OutlineSequenceProgress = EMPTY_OUTLINE_PROGRESS,
): T | null {
  const length = groups.standard.length + groups.extended.length
  if (!length) return null
  const cycle = Math.floor(progress.index / length)
  const offset = progress.index % length
  const previousCode = offset === 0 ? progress.lastCode : null
  const deck = balancedOutlineDeck(groups.standard, groups.extended, `${seed}:cycle:${cycle}`, previousCode)
  return deck[offset] ?? null
}

export function advanceOutlineSequence(
  progress: OutlineSequenceProgress,
  answeredCode: string,
): OutlineSequenceProgress {
  return { index: progress.index + 1, lastCode: answeredCode }
}

export function balancedOutlineDeck<T extends { code: string }>(
  standard: readonly T[],
  extended: readonly T[],
  seed: string,
  previousCode: string | null = null,
): T[] {
  const standardDeck = seededShuffle(standard, `${seed}:standard`)
  const extendedDeck = seededShuffle(extended, `${seed}:extended`)
  const random = seededRandom(`${seed}:interleave`)
  const result: T[] = []
  let standardIndex = 0
  let extendedIndex = 0
  const standardCodes = new Set(standard.map((item) => item.code))

  while (standardIndex < standardDeck.length || extendedIndex < extendedDeck.length) {
    const standardsRemaining = standardDeck.length - standardIndex
    const extendedRemaining = extendedDeck.length - extendedIndex
    const trailingWindow = result.slice(-9)
    const trailingExtended = trailingWindow.filter((item) => !standardCodes.has(item.code)).length
    const mustChooseStandard = standardsRemaining > 0 && (extendedRemaining === 0 || trailingExtended >= 3)
    const mustChooseExtended = standardsRemaining === 0
    const extendedShare = extendedRemaining / (standardsRemaining + extendedRemaining)
    const chooseExtended = mustChooseExtended || (!mustChooseStandard && random() < Math.min(0.3, extendedShare))
    result.push(chooseExtended ? extendedDeck[extendedIndex++]! : standardDeck[standardIndex++]!)
  }

  if (result.length > 1 && previousCode && result[0]?.code === previousCode) {
    const swapIndex = 1 + (hashSeed(`${seed}:boundary:${previousCode}`) % (result.length - 1))
    ;[result[0], result[swapIndex]] = [result[swapIndex]!, result[0]!]
  }
  return result
}
