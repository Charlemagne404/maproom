import type { Country } from '../geography/types'
import { eligibleCountries, type GeographyEligibility } from '../geography/eligibility'
import { seededShuffle } from './engine'
import {
  CONNECTIONS_NAMED_FACT_SETS,
  CONNECTIONS_PUZZLES,
  type ConnectionsDifficulty,
  type ConnectionsEditorialGroup,
  type ConnectionsFactRule,
} from './connections-content'

export type { ConnectionsDifficulty } from './connections-content'
export type ConnectionsTier = 1 | 2 | 3 | 4

export interface ConnectionsGroup extends ConnectionsEditorialGroup {}

export interface ConnectionsPuzzle {
  id: string
  groups: ConnectionsGroup[]
  tiles: Country[]
  difficulty: ConnectionsDifficulty
  eligibility: GeographyEligibility
  editorialNote: string
}

export interface ConnectionsPuzzleAudit {
  issues: string[]
  overlaps: string[]
  advisories: string[]
}

const namedFactSetById = new Map(CONNECTIONS_NAMED_FACT_SETS.map((set) => [set.id, set]))

/** Selects a fully authored board. Only the board order and tile order use a seed. */
export function generateConnectionsPuzzle(
  countries: Country[],
  seed: string,
  difficulty: ConnectionsDifficulty = 'easy',
  eligibility: GeographyEligibility = 'standard',
  roundIndex = 0,
): ConnectionsPuzzle {
  const eligible = eligibleCountries(countries, eligibility)
  const byCode = new Map(eligible.map((country) => [country.iso3, country]))
  const pool = CONNECTIONS_PUZZLES.filter((candidate) => candidate.difficulty === difficulty
    && candidate.groups.every((group) => group.countryCodes.every((code) => byCode.has(code))))
  if (!pool.length) throw new Error(`No authored ${difficulty} Connections board is available for this country pool.`)

  const ordered = seededShuffle(pool, `${seed}:connections-pool:${difficulty}`)
  const selected = ordered[((roundIndex % ordered.length) + ordered.length) % ordered.length]
  const answerCodes = selected.groups.flatMap((group) => group.countryCodes)
  const tiles = answerCodes.map((code) => byCode.get(code)!)

  return {
    id: selected.id,
    groups: selected.groups.map((group) => ({ ...group, countryCodes: [...group.countryCodes], fact: { ...group.fact } })),
    tiles: seededShuffle(tiles, `${seed}:connections-tiles:${selected.id}:${roundIndex}`),
    difficulty,
    eligibility,
    editorialNote: selected.editorialNote,
  }
}

/**
 * Checks the authored answer shape, fact declarations, and exact alternate
 * four-country matches in reviewed answer rules. Larger attribute intersections
 * and unreviewed named-set matches are returned separately for human review;
 * advisory sets do not make a board fail until editors establish their salience.
 */
export function auditConnectionsPuzzle(
  puzzle: Pick<ConnectionsPuzzle, 'id' | 'groups' | 'tiles' | 'difficulty' | 'eligibility'>,
  countries: Country[],
): ConnectionsPuzzleAudit {
  const issues: string[] = []
  const overlaps: string[] = []
  const advisories: string[] = []
  const eligible = eligibleCountries(countries, puzzle.eligibility)
  const byCode = new Map(eligible.map((country) => [country.iso3, country]))
  const tileCodes = puzzle.tiles.map((country) => country.iso3)
  const board = new Set(tileCodes)

  if (puzzle.groups.length !== 4) issues.push(`${puzzle.id}: expected four groups, found ${puzzle.groups.length}.`)
  if (puzzle.tiles.length !== 16) issues.push(`${puzzle.id}: expected sixteen tiles, found ${puzzle.tiles.length}.`)
  if (board.size !== 16) issues.push(`${puzzle.id}: tile country codes must be distinct.`)
  for (const code of tileCodes) if (!byCode.has(code)) issues.push(`${puzzle.id}: ${code} is missing from the eligible country catalogue.`)

  const groupIds = new Set<string>()
  const answerSets: Set<string>[] = []
  const allAnswerCodes = new Set<string>()
  for (const group of puzzle.groups) {
    if (groupIds.has(group.id)) issues.push(`${puzzle.id}: duplicate group id ${group.id}.`)
    groupIds.add(group.id)
    const codes = new Set(group.countryCodes)
    if (group.countryCodes.length !== 4 || codes.size !== 4) issues.push(`${puzzle.id}/${group.id}: expected four distinct countries.`)
    for (const code of codes) {
      if (!board.has(code)) issues.push(`${puzzle.id}/${group.id}: ${code} is not a tile on this board.`)
      if (allAnswerCodes.has(code)) issues.push(`${puzzle.id}: ${code} appears in more than one answer group.`)
      allAnswerCodes.add(code)
    }
    answerSets.push(codes)
    const matchedOnBoard = matchingTilesForFact(group.fact, board, byCode)
    if (!sameSet(matchedOnBoard, codes)) {
      issues.push(`${puzzle.id}/${group.id}: the declared fact must match exactly its four board tiles; found ${[...matchedOnBoard].join(', ')}.`)
    }
  }
  if (allAnswerCodes.size !== 16) issues.push(`${puzzle.id}: answer groups must cover all sixteen tiles exactly once.`)

  for (const rule of auditFacts(puzzle.groups, eligible)) {
    const matched = matchingTilesForFact(rule, board, byCode)
    if (matched.size < 4) continue
    if (answerSets.some((answer) => sameSet(answer, matched))) continue
    const label = describeFact(rule)
    if (matched.size === 4) issues.push(`${puzzle.id}: unintended four-country alternative (${label}: ${[...matched].join(', ')}).`)
    else overlaps.push(`${label} matches ${matched.size} board tiles (${[...matched].join(', ')}).`)
  }

  for (const set of CONNECTIONS_NAMED_FACT_SETS.filter((candidate) => candidate.advisory)) {
    const matched = matchingTilesForFact({ type: 'named-set', id: set.id }, board, byCode)
    if (matched.size < 4 || answerSets.some((answer) => sameSet(answer, matched))) continue
    advisories.push(`${puzzle.id}: ${set.id} matches ${matched.size} board tiles (${[...matched].sort().join(', ')}).`)
  }

  return { issues: [...new Set(issues)], overlaps: [...new Set(overlaps)], advisories: [...new Set(advisories)] }
}

export function connectionsBoardIsUnambiguous(puzzle: ConnectionsPuzzle, countries: Country[]): boolean {
  return auditConnectionsPuzzle(puzzle, countries).issues.length === 0
}

export function auditConnectionsLibrary(countries: Country[]): ConnectionsPuzzleAudit {
  const issues: string[] = []
  const overlaps: string[] = []
  const advisories: string[] = []
  const expectedCounts: Record<ConnectionsDifficulty, number> = { easy: 8, medium: 8, hard: 8 }
  for (const difficulty of Object.keys(expectedCounts) as ConnectionsDifficulty[]) {
    const actual = CONNECTIONS_PUZZLES.filter((puzzle) => puzzle.difficulty === difficulty).length
    if (actual !== expectedCounts[difficulty]) issues.push(`Expected ${expectedCounts[difficulty]} ${difficulty} boards, found ${actual}.`)
  }
  if (CONNECTIONS_PUZZLES.length !== 24) issues.push(`Expected 24 authored boards, found ${CONNECTIONS_PUZZLES.length}.`)

  const puzzleIds = new Set<string>()
  for (const source of CONNECTIONS_PUZZLES) {
    if (puzzleIds.has(source.id)) issues.push(`Duplicate puzzle id ${source.id}.`)
    puzzleIds.add(source.id)
    const puzzle: ConnectionsPuzzle = {
      ...source,
      tiles: source.groups.flatMap((group) => group.countryCodes.map((code) => countries.find((country) => country.iso3 === code)).filter((country): country is Country => Boolean(country))),
      eligibility: 'standard',
    }
    const result = auditConnectionsPuzzle(puzzle, countries)
    issues.push(...result.issues)
    overlaps.push(...result.overlaps.map((overlap) => `${source.id}: ${overlap}`))
    advisories.push(...result.advisories)
  }
  for (const set of CONNECTIONS_NAMED_FACT_SETS) {
    const unique = new Set(set.members)
    if (unique.size !== set.members.length) issues.push(`Named fact set ${set.id} contains duplicate countries.`)
    for (const code of unique) if (!countries.some((country) => country.iso3 === code)) issues.push(`Named fact set ${set.id} references unknown country ${code}.`)
  }
  return { issues: [...new Set(issues)], overlaps: [...new Set(overlaps)], advisories: [...new Set(advisories)] }
}

function auditFacts(groups: ConnectionsGroup[], countries: Country[]): ConnectionsFactRule[] {
  const rules = new Map<string, ConnectionsFactRule>()
  const add = (rule: ConnectionsFactRule) => rules.set(factKey(rule), rule)
  for (const group of groups) add(group.fact)
  for (const set of CONNECTIONS_NAMED_FACT_SETS) {
    if (!set.advisory) add({ type: 'named-set', id: set.id })
  }
  add({ type: 'landlocked' })
  add({ type: 'country-name-direction' })
  for (const initial of new Set(countries.map((country) => normalize(country.name).slice(0, 1).toUpperCase()).filter(Boolean))) {
    add({ type: 'country-name-initial', initial })
  }
  for (const initial of new Set(countries.map((country) => country.capital ? normalize(country.capital).slice(0, 1).toUpperCase() : '').filter(Boolean))) {
    add({ type: 'capital-initial', initial })
  }
  for (const value of ['Guinea']) add({ type: 'country-name-contains', value })
  for (const value of ['land', 'stan']) add({ type: 'country-name-suffix', value })
  add({ type: 'capital-country-name' })
  for (const country of countries) {
    if (country.continent) add({ type: 'continent', value: country.continent })
    if (country.continent) add({ type: 'landlocked-continent', continent: country.continent })
    if (country.subregion) add({ type: 'subregion', value: country.subregion })
    add({ type: 'border-country', countryCode: country.iso3 })
  }
  add({ type: 'area-under', value: 1_000 })
  for (const year of new Set(countries.map((country) => country.populationYear).filter((value): value is string => Boolean(value)))) {
    add({ type: 'population-over', value: 100_000_000, year })
  }
  return [...rules.values()]
}

function matchingTilesForFact(rule: ConnectionsFactRule, board: Set<string>, byCode: Map<string, Country>): Set<string> {
  if (rule.type === 'named-set') {
    const members = new Set(namedFactSetById.get(rule.id)?.members ?? [])
    return new Set([...board].filter((code) => byCode.has(code) && members.has(code)))
  }
  return new Set([...board].filter((code) => {
    const country = byCode.get(code)
    return country ? factMatches(rule, country) : false
  }))
}

function factMatches(rule: ConnectionsFactRule, country: Country): boolean {
  switch (rule.type) {
    case 'border-country': return country.iso3 !== rule.countryCode && country.borders.includes(rule.countryCode)
    case 'capital-country-name': return Boolean(country.capital && normalize(country.capital) === normalize(country.name))
    case 'capital-initial': return Boolean(country.capital && normalize(country.capital).startsWith(normalize(rule.initial)))
    case 'continent': return country.continent === rule.value
    case 'country-name-contains': return normalize(country.name).includes(normalize(rule.value))
    case 'country-name-direction': return /^(north|south)\b/i.test(country.name)
    case 'country-name-initial': return normalize(country.name).startsWith(normalize(rule.initial))
    case 'country-name-suffix': return normalize(country.name).endsWith(normalize(rule.value))
    case 'landlocked': return country.landlocked
    case 'landlocked-continent': return country.landlocked && country.continent === rule.continent
    case 'named-set': return false
    case 'population-band': return country.populationYear === rule.year && country.population !== null && country.population >= rule.minimum && country.population < rule.maximum
    case 'population-over': return country.populationYear === rule.year && country.population !== null && country.population > rule.value
    case 'area-band': return country.areaKm2 !== null && country.areaKm2 > 0 && country.areaKm2 >= rule.minimum && country.areaKm2 < rule.maximum
    case 'area-under': return country.areaKm2 !== null && country.areaKm2 > 0 && country.areaKm2 < rule.value
    case 'subregion': return country.subregion === rule.value
  }
}

function factKey(rule: ConnectionsFactRule): string {
  return `${rule.type}:${Object.entries(rule).filter(([key]) => key !== 'type').sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join(';')}`
}

function describeFact(rule: ConnectionsFactRule): string {
  switch (rule.type) {
    case 'border-country': return `countries that border ${rule.countryCode}`
    case 'capital-country-name': return 'capital shares the country name'
    case 'capital-initial': return `capital begins with ${rule.initial}`
    case 'continent': return `same continent (${rule.value})`
    case 'country-name-contains': return `country name contains ${rule.value}`
    case 'country-name-direction': return 'country name begins with north or south'
    case 'country-name-initial': return `country name begins with ${rule.initial}`
    case 'country-name-suffix': return `country name ends in ${rule.value}`
    case 'landlocked': return 'landlocked countries'
    case 'landlocked-continent': return `landlocked in ${rule.continent}`
    case 'named-set': return namedFactSetById.get(rule.id)?.id ?? rule.id
    case 'population-band': return `2023 population ${rule.minimum}–${rule.maximum}`
    case 'population-over': return `2023 population above ${rule.value}`
    case 'area-band': return `area ${rule.minimum}–${rule.maximum} km²`
    case 'area-under': return `area under ${rule.value} km²`
    case 'subregion': return `same subregion (${rule.value})`
  }
}

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en').trim()
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value))
}
