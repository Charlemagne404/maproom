import type { Country } from '../geography/types'
import { seededShuffle } from './engine'

export interface ConnectionsGroup {
  id: string
  label: string
  difficulty: 1 | 2 | 3 | 4
  countryCodes: string[]
  explanation: string
}

export interface ConnectionsPuzzle {
  groups: ConnectionsGroup[]
  tiles: Country[]
}

interface CandidateGroup extends ConnectionsGroup {
  members: Country[]
}

export function generateConnectionsPuzzle(countries: Country[], seed: string): ConnectionsPuzzle {
  const eligible = countries.filter((country) => country.hasGeometry)
  const categories = buildCategories(eligible)
  const byDifficulty = new Map<number, CandidateGroup[]>()
  for (const category of categories) {
    const values = byDifficulty.get(category.difficulty) ?? []
    values.push(category)
    byDifficulty.set(category.difficulty, values)
  }

  for (let attempt = 0; attempt < 1_200; attempt += 1) {
    const groups: CandidateGroup[] = []
    const used = new Set<string>()
    for (const difficulty of [1, 2, 3, 4] as const) {
      const options = seededShuffle(byDifficulty.get(difficulty) ?? [], `${seed}:category:${attempt}:${difficulty}`)
      let chosen: CandidateGroup | undefined
      for (const option of options) {
        const available = option.members.filter((country) => !used.has(country.iso3))
        if (available.length < 4) continue
        const members = seededShuffle(available, `${seed}:members:${attempt}:${option.id}`).slice(0, 4)
        const codes = members.map((country) => country.iso3).sort()
        chosen = { ...option, members, countryCodes: codes }
        for (const code of codes) used.add(code)
        break
      }
      if (!chosen) break
      groups.push(chosen)
    }

    if (groups.length !== 4 || used.size !== 16 || !hasUniqueGrouping(groups, categories, used)) continue
    const tiles = seededShuffle(groups.flatMap((group) => group.members), `${seed}:tile-order`)
    return {
      groups: groups.map((group) => ({
        id: group.id,
        label: group.label,
        difficulty: group.difficulty,
        countryCodes: group.countryCodes,
        explanation: group.explanation,
      })),
      tiles,
    }
  }

  throw new Error('No unambiguous worldwide Connections puzzle is available from the current country facts.')
}

function buildCategories(countries: Country[]): CandidateGroup[] {
  const categories: CandidateGroup[] = []
  const add = (difficulty: 1 | 2 | 3 | 4, id: string, label: string, explanation: string, matches: (country: Country) => boolean) => {
    const members = countries.filter(matches)
    if (members.length < 4 || members.length > 32) return
    categories.push({ id, label, explanation, difficulty, countryCodes: [], members })
  }

  for (const subregion of [...new Set(countries.map((country) => country.subregion).filter(Boolean) as string[])].sort()) {
    const key = slug(subregion)
    add(1, `subregion:${key}`, `In ${subregion}`, `These countries are all catalogued in the ${subregion} subregion.`, (country) => country.subregion === subregion)
    add(2, `landlocked:${key}`, `Landlocked in ${subregion}`, `Each is landlocked and belongs to ${subregion}.`, (country) => country.subregion === subregion && country.landlocked)
    add(2, `island:${key}`, `No recorded land borders in ${subregion}`, `Each has no land-border neighbors in the country catalog and belongs to ${subregion}.`, (country) => country.subregion === subregion && country.borders.length === 0)
  }
  add(2, 'borders:1-2', 'One or two land neighbors', 'Each country has one or two recorded land-border neighbors.', (country) => country.borders.length >= 1 && country.borders.length <= 2)
  add(2, 'borders:3-5', 'Three to five land neighbors', 'Each country has three to five recorded land-border neighbors.', (country) => country.borders.length >= 3 && country.borders.length <= 5)
  add(2, 'borders:6-plus', 'Six or more land neighbors', 'Each country has at least six recorded land-border neighbors.', (country) => country.borders.length >= 6)
  add(2, 'landlocked', 'Landlocked countries', 'Each country is recorded as landlocked in the country catalog.', (country) => country.landlocked)

  const populationBands: Array<[string, string, (value: number) => boolean]> = [
    ['under-1m', 'Population under 1 million', (value) => value < 1_000_000],
    ['1m-5m', 'Population from 1 to 5 million', (value) => value >= 1_000_000 && value < 5_000_000],
    ['5m-25m', 'Population from 5 to 25 million', (value) => value >= 5_000_000 && value < 25_000_000],
    ['25m-100m', 'Population from 25 to 100 million', (value) => value >= 25_000_000 && value < 100_000_000],
    ['over-100m', 'Population over 100 million', (value) => value >= 100_000_000],
  ]
  for (const [id, label, within] of populationBands) {
    add(3, `population:${id}`, label, `The 2023 World Bank country-population estimates fall in the ${label.toLocaleLowerCase('en')} band.`, (country) => country.population !== null && within(country.population))
  }

  const areaBands: Array<[string, string, (value: number) => boolean]> = [
    ['under-10k', 'Area under 10,000 km²', (value) => value < 10_000],
    ['10k-100k', 'Area from 10,000 to 100,000 km²', (value) => value >= 10_000 && value < 100_000],
    ['100k-500k', 'Area from 100,000 to 500,000 km²', (value) => value >= 100_000 && value < 500_000],
    ['500k-2m', 'Area from 500,000 to 2 million km²', (value) => value >= 500_000 && value < 2_000_000],
    ['over-2m', 'Area over 2 million km²', (value) => value >= 2_000_000],
  ]
  for (const [id, label, within] of areaBands) {
    add(3, `area:${id}`, label, `The country catalog places each in the ${label.toLocaleLowerCase('en')} area band.`, (country) => country.areaKm2 !== null && country.areaKm2 > 0 && within(country.areaKm2))
  }

  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    add(4, `capital:${letter}`, `Capitals beginning with ${letter}`, `Each listed capital begins with ${letter}.`, (country) => country.capital?.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('en').startsWith(letter) ?? false)
    add(4, `country:${letter}`, `Country names beginning with ${letter}`, `Each common country name begins with ${letter}.`, (country) => country.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('en').startsWith(letter))
  }
  return categories
}

function hasUniqueGrouping(groups: CandidateGroup[], categories: CandidateGroup[], codes: Set<string>): boolean {
  const intended = groups.map((group) => new Set(group.countryCodes))
  const board = [...codes]
  for (const category of categories) {
    const matched = new Set(board.filter((code) => category.members.some((country) => country.iso3 === code)))
    if (matched.size < 4) continue
    if (!intended.some((group) => sameSet(group, matched))) return false
  }
  return groups.every((group) => {
    const category = categories.find((item) => item.id === group.id)
    return category && sameSet(new Set(group.countryCodes), new Set(board.filter((code) => category.members.some((country) => country.iso3 === code))))
  })
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value))
}

function slug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '-')
}
