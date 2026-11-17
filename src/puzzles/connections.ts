import type { Country } from '../geography/types'
import { eligibleCountries, type GeographyEligibility } from '../geography/eligibility'
import { buildAdjacency, seededShuffle } from './engine'

export type ConnectionsDifficulty = 'easy' | 'medium' | 'hard'
type CategoryTier = 1 | 2 | 3

export interface ConnectionsGroup {
  id: string
  label: string
  difficulty: CategoryTier
  countryCodes: string[]
  explanation: string
}

export interface ConnectionsPuzzle {
  groups: ConnectionsGroup[]
  tiles: Country[]
  difficulty: ConnectionsDifficulty
  eligibility: GeographyEligibility
}

interface CandidateGroup extends ConnectionsGroup {
  members: Country[]
}

const FAMILIAR_BORDERING_COUNTRIES = ['ARG', 'BRA', 'CHN', 'DEU', 'FRA', 'IND', 'RUS', 'ZAF']

export function generateConnectionsPuzzle(
  countries: Country[],
  seed: string,
  difficulty: ConnectionsDifficulty = 'easy',
  eligibility: GeographyEligibility = 'standard',
): ConnectionsPuzzle {
  const eligible = eligibleCountries(countries, eligibility)
  const categories = availableCategories(eligible, difficulty)

  for (let attempt = 0; attempt < 2_000; attempt += 1) {
    const groups: CandidateGroup[] = []
    const used = new Set<string>()
    const options = seededShuffle(categories, `${seed}:categories:${attempt}`)
    for (const option of options) {
      const available = option.members.filter((country) => !used.has(country.iso3))
      if (available.length < 4) continue
      const members = seededShuffle(available, `${seed}:members:${attempt}:${option.id}`).slice(0, 4)
      const codes = members.map((country) => country.iso3).sort()
      groups.push({ ...option, members, countryCodes: codes })
      for (const code of codes) used.add(code)
      if (groups.length === 4) break
    }

    if (groups.length !== 4 || used.size !== 16 || !hasUniqueGrouping(groups, categories, used)) continue
    const tiles = seededShuffle(groups.flatMap((group) => group.members), `${seed}:tile-order`)
    return {
      groups: groups.map(({ members: _members, ...group }) => group),
      tiles,
      difficulty,
      eligibility,
    }
  }

  throw new Error(`No unambiguous ${difficulty} Connections puzzle is available from this country pool.`)
}

export function connectionsBoardIsUnambiguous(puzzle: ConnectionsPuzzle, countries: Country[]): boolean {
  if (puzzle.groups.length !== 4 || puzzle.tiles.length !== 16) return false
  const used = new Set(puzzle.tiles.map((country) => country.iso3))
  if (used.size !== 16) return false
  const categories = availableCategories(eligibleCountries(countries, puzzle.eligibility), puzzle.difficulty)
  const groups = puzzle.groups.map((group) => ({ ...group, members: group.countryCodes.flatMap((code) => {
    const country = countries.find((item) => item.iso3 === code)
    return country ? [country] : []
  }) }))
  return groups.every((group) => group.members.length === 4 && new Set(group.countryCodes).size === 4)
    && hasUniqueGrouping(groups, categories, used)
}

function buildCategories(countries: Country[], difficulty: ConnectionsDifficulty): CandidateGroup[] {
  const categories: CandidateGroup[] = []
  const adjacency = buildAdjacency(countries)
  const add = (tier: CategoryTier, id: string, label: string, explanation: string, matches: (country: Country) => boolean) => {
    const members = countries.filter(matches)
    if (members.length >= 4) categories.push({ id, label, explanation, difficulty: tier, countryCodes: [], members })
  }

  const continents = [...new Set(countries.map((country) => country.continent).filter((value): value is string => Boolean(value)))].sort()
  if (difficulty === 'easy') {
    for (const continent of continents) {
      add(1, `continent:${slug(continent)}`, `In ${continent}`, `All four are in ${continent}.`, (country) => country.continent === continent)
      add(1, `landlocked-continent:${slug(continent)}`, `Landlocked in ${continent}`, `Each has no coastline and is in ${continent}.`, (country) => country.continent === continent && country.landlocked)
    }
    add(1, 'landlocked', 'Landlocked countries', 'Each has no coastline.', (country) => country.landlocked)
    for (const code of FAMILIAR_BORDERING_COUNTRIES) {
      const anchor = countries.find((country) => country.iso3 === code)
      if (!anchor) continue
      const neighbors = new Set(adjacency.get(code) ?? [])
      add(1, `borders:${code}`, `Border ${anchor.name}`, `Each shares a recorded land border with ${anchor.name}.`, (country) => neighbors.has(country.iso3))
    }
  }

  if (difficulty === 'medium' || difficulty === 'hard') {
    for (const subregion of [...new Set(countries.map((country) => country.subregion).filter((value): value is string => Boolean(value)))].sort()) {
      const key = slug(subregion)
      add(2, `subregion:${key}`, `In ${subregion}`, `Each is catalogued in ${subregion}.`, (country) => country.subregion === subregion)
      add(2, `landlocked-subregion:${key}`, `Landlocked in ${subregion}`, `Each is landlocked and in ${subregion}.`, (country) => country.subregion === subregion && country.landlocked)
    }
    for (const code of FAMILIAR_BORDERING_COUNTRIES) {
      const anchor = countries.find((country) => country.iso3 === code)
      if (!anchor) continue
      const neighbors = new Set(adjacency.get(code) ?? [])
      add(2, `borders-medium:${code}`, `Border ${anchor.name}`, `Each shares a recorded land border with ${anchor.name}.`, (country) => neighbors.has(country.iso3))
    }
  }

  if (difficulty === 'hard') {
    const populationBands: Array<[string, string, (value: number) => boolean]> = [
      ['pop-under-1m', 'Population under 1m', (value) => value < 1_000_000],
      ['pop-1m-5m', 'Population 1–5m', (value) => value >= 1_000_000 && value < 5_000_000],
      ['pop-5m-25m', 'Population 5–25m', (value) => value >= 5_000_000 && value < 25_000_000],
      ['pop-25m-100m', 'Population 25–100m', (value) => value >= 25_000_000 && value < 100_000_000],
      ['pop-over-100m', 'Population over 100m', (value) => value >= 100_000_000],
    ]
    for (const [id, label, within] of populationBands) add(3, id, label, `Each falls in the ${label.toLocaleLowerCase('en')} band.`, (country) => country.population !== null && within(country.population))
    const areaBands: Array<[string, string, (value: number) => boolean]> = [
      ['area-under-10k', 'Area under 10,000 km²', (value) => value < 10_000],
      ['area-10k-100k', 'Area 10,000–100,000 km²', (value) => value >= 10_000 && value < 100_000],
      ['area-100k-500k', 'Area 100,000–500,000 km²', (value) => value >= 100_000 && value < 500_000],
      ['area-500k-2m', 'Area 500,000–2m km²', (value) => value >= 500_000 && value < 2_000_000],
      ['area-over-2m', 'Area over 2m km²', (value) => value >= 2_000_000],
    ]
    for (const [id, label, within] of areaBands) add(3, id, label, `Each falls in the ${label.toLocaleLowerCase('en')} band.`, (country) => country.areaKm2 !== null && country.areaKm2 > 0 && within(country.areaKm2))
  }
  return categories
}

function availableCategories(countries: Country[], difficulty: ConnectionsDifficulty): CandidateGroup[] {
  const categories = buildCategories(countries, difficulty)
  // Hard boards stay inferable by using smaller, more specific fact groups.
  // A category with dozens of possible countries would make a 16-tile board
  // feel like a database filter rather than a solvable grouping puzzle.
  return difficulty === 'hard' ? categories.filter((category) => category.members.length <= 32) : categories
}

function hasUniqueGrouping(groups: CandidateGroup[], categories: CandidateGroup[], codes: Set<string>): boolean {
  const intended = groups.map((group) => new Set(group.countryCodes))
  for (const category of categories) {
    const categoryMembers = new Set(category.members.map((country) => country.iso3))
    const matched = new Set([...codes].filter((code) => categoryMembers.has(code)))
    if (matched.size < 4) continue
    if (!intended.some((group) => sameSet(group, matched))) return false
  }
  return groups.every((group) => {
    const category = categories.find((item) => item.id === group.id)
    if (!category) return false
    const categoryMembers = new Set(category.members.map((country) => country.iso3))
    return sameSet(new Set(group.countryCodes), new Set([...codes].filter((code) => categoryMembers.has(code))))
  })
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value))
}

function slug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '-')
}
