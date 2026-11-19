import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { City, Country } from '../src/geography/types'
import { buildAdjacency, dailyPuzzleId, dailyPuzzleSeed, generateRoutePuzzle, gridCandidates, gridAnswerScore, seededShuffle, validGridPresets } from '../src/puzzles/engine'
import { generateConnectionsPuzzle } from '../src/puzzles/connections'
import { connectionsBoardIsUnambiguous } from '../src/puzzles/connections'
import { eligibleCountries, isStandardCountry, standardCountryCount } from '../src/geography/eligibility'
import { countryMeasure, makeHigherLowerQuestions, type CountryMeasure } from '../src/puzzles/higherLower'
import { makeNeighbourQuestions, scoreNeighbourAnswer } from '../src/puzzles/neighbours'
import { makeDistanceQuestions } from '../src/puzzles/distance'
import { greatCircleKm } from '../src/puzzles/engine'

const dataDir = join(process.cwd(), 'public', 'data')
const countries = (JSON.parse(readFileSync(join(dataDir, 'countries.json'), 'utf8')) as { countries: Country[] }).countries
const cities = (JSON.parse(readFileSync(join(dataDir, 'cities.json'), 'utf8')) as { cities: City[] }).cities
const countriesByCode = new Map(countries.map((country) => [country.iso3, country]))

function dateAt(offset: number): string {
  const date = new Date('2026-01-01T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function hasUniqueAnswerAssignment(cells: Country[][]): boolean {
  const ordered = [...cells].sort((left, right) => left.length - right.length)
  const used = new Set<string>()
  function fill(index: number): boolean {
    if (index === ordered.length) return true
    for (const country of ordered[index]!) {
      if (used.has(country.iso3)) continue
      used.add(country.iso3)
      if (fill(index + 1)) return true
      used.delete(country.iso3)
    }
    return false
  }
  return fill(0)
}

describe('expanded daily and practice puzzle builders', () => {
  it('builds a broad, solvable grid library and varies daily boards across a year', () => {
    expect(dailyPuzzleId('grid', '2026-11-17')).toBe('grid:2026-11-17:v3')
    expect(dailyPuzzleId('flags', '2026-11-17')).toBe('flags:2026-11-17:v2')
    const presets = validGridPresets(countries)
    expect(presets.length).toBeGreaterThan(50)
    const regionLabels = new Set(presets.flatMap((preset) => preset.columns.map((column) => column.label)))
    expect(regionLabels.has('North America · continent')).toBe(true)
    expect(regionLabels.has('North America · subregion')).toBe(true)
    for (const preset of presets) {
      expect(preset.columns).toHaveLength(3)
      expect(preset.rows).toHaveLength(3)
      expect(new Set(preset.columns.map((column) => column.label)).size).toBe(3)
      const cells = preset.rows.flatMap((row) => preset.columns.map((column) => gridCandidates(countries, row, column)))
      expect(cells.every((cell) => cell.length >= 2 && cell.length <= 90)).toBe(true)
      expect(hasUniqueAnswerAssignment(cells)).toBe(true)
    }
    const selected = Array.from({ length: 365 }, (_, index) => {
      const date = dateAt(index)
      return seededShuffle(presets, `${dailyPuzzleSeed('grid', date)}:preset`)[0]?.id
    })
    expect(new Set(selected).size).toBeGreaterThan(50)
    expect(gridAnswerScore(2)).toBeGreaterThan(gridAnswerScore(20))
    expect(gridAnswerScore(0)).toBe(0)
  })

  it('expands Free Play grid clues and classifies North Macedonia as UN M49 Southern Europe', () => {
    const dailyPresets = validGridPresets(countries)
    const freeplayPresets = validGridPresets(countries, { expanded: true })
    const southernEurope = freeplayPresets.flatMap((preset) => preset.columns).find((column) => column.id === 'm49-southern-europe')
    const landlocked = freeplayPresets.flatMap((preset) => preset.rows).find((row) => row.id === 'landlocked')
    const macedonia = countriesByCode.get('MKD')!

    expect(dailyPresets.every((preset) => !preset.columns.some((column) => column.id === 'm49-southern-europe'))).toBe(true)
    expect(freeplayPresets.length).toBeGreaterThan(50)
    expect(southernEurope?.label).toBe('Southern Europe · UN M49')
    expect(landlocked?.matches(macedonia)).toBe(true)
    expect(southernEurope?.matches(macedonia)).toBe(true)
    expect(freeplayPresets.some((preset) => preset.columns.some((column) => column.id === 'm49-southern-europe') && preset.rows.some((row) => row.id === 'landlocked'))).toBe(true)
    expect(freeplayPresets.some((preset) => preset.rows.some((row) => row.id === 'eu-member-2026'))).toBe(true)
    expect(freeplayPresets.every((preset) => preset.rows.every((row) => preset.columns.every((column) => {
      const candidates = gridCandidates(countries, row, column)
      return candidates.length >= 2 && candidates.length <= 90
    })))).toBe(true)

    const categoryPairs = new Set<string>()
    const clueCategories = new Set<string>()
    const intersectionSizes: number[] = []
    for (const preset of freeplayPresets) {
      for (const category of [...preset.columns, ...preset.rows]) clueCategories.add(category.id)
      for (const row of preset.rows) {
        for (const column of preset.columns) {
          categoryPairs.add(`${row.id}|${column.id}`)
          intersectionSizes.push(gridCandidates(countries, row, column).length)
        }
      }
    }
    intersectionSizes.sort((left, right) => left - right)
    expect(freeplayPresets).toHaveLength(240)
    expect(clueCategories.size).toBeGreaterThanOrEqual(50)
    expect(categoryPairs.size).toBeGreaterThanOrEqual(360)
    expect(intersectionSizes[Math.floor(intersectionSizes.length * 0.9)]).toBeLessThanOrEqual(30)
  })

  it('applies the documented Standard and ordinary Extended pools', () => {
    const standard = eligibleCountries(countries, 'standard')
    const extended = eligibleCountries(countries, 'extended')
    expect(standardCountryCount()).toBe(195)
    expect(standard).toHaveLength(195)
    expect(countries).toHaveLength(255)
    expect(extended).toHaveLength(243)
    expect(standard.every((country) => isStandardCountry(country.iso3))).toBe(true)
    expect(standard.map((country) => country.iso3)).toContain('VAT')
    expect(standard.map((country) => country.iso3)).toContain('PSE')
    expect(standard.map((country) => country.iso3)).not.toContain('XKX')
    expect(standard.map((country) => country.iso3)).not.toContain('GGY')
    expect(standard.map((country) => country.iso3)).not.toContain('FLK')
    for (const special of ['ATA', 'ATC', 'ATF', 'BVT', 'CLP', 'CSI', 'ESB', 'HMD', 'IOT', 'SJM', 'UMI', 'WSB']) {
      expect(extended.map((country) => country.iso3)).not.toContain(special)
    }
  })

  it('generates deterministic Connections boards with four exact, non-overlapping groups', () => {
    const signatures = new Set<string>()
    for (let day = 0; day < 30; day += 1) {
      const seed = dailyPuzzleSeed('connections', dateAt(day))
      const puzzle = generateConnectionsPuzzle(countries, seed)
      const again = generateConnectionsPuzzle(countries, seed)
      expect(puzzle.groups).toEqual(again.groups)
      expect(puzzle.tiles.map((country) => country.iso3)).toEqual(again.tiles.map((country) => country.iso3))
      expect(puzzle.groups).toHaveLength(4)
      expect(puzzle.tiles).toHaveLength(16)
      expect(new Set(puzzle.tiles.map((country) => country.iso3)).size).toBe(16)
      const assigned = puzzle.groups.flatMap((group) => group.countryCodes)
      expect(assigned).toHaveLength(16)
      expect(new Set(assigned).size).toBe(16)
      expect(puzzle.groups.every((group) => group.countryCodes.length === 4 && group.label && group.explanation)).toBe(true)
      signatures.add(puzzle.groups.map((group) => group.id).sort().join('|'))
    }
    expect(signatures.size).toBeGreaterThan(5)
  })

  it('generates varied, unique-solution boards across all Connections difficulties', () => {
    const scenarios = [
      { difficulty: 'easy' as const, eligibility: 'standard' as const },
      { difficulty: 'medium' as const, eligibility: 'standard' as const },
      { difficulty: 'hard' as const, eligibility: 'extended' as const },
    ]
    for (const scenario of scenarios) {
      const signatures = new Set<string>()
      for (let index = 0; index < 12; index += 1) {
        const puzzle = generateConnectionsPuzzle(countries, `connections:${scenario.difficulty}:${index}`, scenario.difficulty, scenario.eligibility)
        expect(puzzle.groups).toHaveLength(4)
        expect(puzzle.tiles).toHaveLength(16)
        expect(new Set(puzzle.tiles.map((country) => country.iso3)).size).toBe(16)
        expect(connectionsBoardIsUnambiguous(puzzle, countries)).toBe(true)
        signatures.add(puzzle.groups.map((group) => group.id).sort().join('|'))
      }
      expect(signatures.size, `${scenario.difficulty} puzzle variety`).toBeGreaterThan(4)
    }
  })

  it('creates strict higher-or-lower comparisons from available country facts', () => {
    for (const measure of ['population', 'area', 'density'] as CountryMeasure[]) {
      for (let day = 0; day < 20; day += 1) {
        const questions = makeHigherLowerQuestions(countries, measure, `higher:${dateAt(day)}`, 8, 'standard')
        expect(questions).toHaveLength(8)
        for (const question of questions) {
          expect(countryMeasure(question.left, measure)).not.toBeNull()
          expect(countryMeasure(question.right, measure)).not.toBeNull()
          expect(question.answer === 'left' ? question.leftValue > question.rightValue : question.rightValue > question.leftValue).toBe(true)
        }
        expect(new Set(questions.map((question) => [question.left.iso3, question.right.iso3].sort().join(':'))).size).toBe(8)
      }
    }
  })

  it('supports regional close-call comparisons without fabricating missing facts', () => {
    for (const measure of ['population', 'area', 'density'] as CountryMeasure[]) {
      const questions = makeHigherLowerQuestions(countries.filter((country) => country.continent === 'Europe'), measure, `europe-close:${measure}`, 10, 'close')
      expect(questions.length).toBeGreaterThan(0)
      for (const question of questions) {
        expect(question.left.continent).toBe('Europe')
        expect(question.right.continent).toBe('Europe')
        expect(countryMeasure(question.left, measure)).not.toBeNull()
        expect(countryMeasure(question.right, measure)).not.toBeNull()
        const ratio = Math.max(question.leftValue, question.rightValue) / Math.min(question.leftValue, question.rightValue)
        expect(ratio).toBeGreaterThanOrEqual(1.01)
        expect(ratio).toBeLessThanOrEqual(1.45)
      }
    }
  })

  it('builds scoped border routes within requested difficulty and uses real adjacency', () => {
    const adjacency = buildAdjacency(countries)
    for (const [difficulty, minimum, maximum] of [['short', 2, 4], ['standard', 3, 6], ['long', 5, 8]] as const) {
      for (let day = 0; day < 20; day += 1) {
        const puzzle = generateRoutePuzzle(countries, `europe:${difficulty}:${day}`, { continent: 'Europe', difficulty })
        expect(countriesByCode.get(puzzle.start)?.continent).toBe('Europe')
        expect(countriesByCode.get(puzzle.end)?.continent).toBe('Europe')
        expect(puzzle.shortest.length - 1).toBeGreaterThanOrEqual(minimum)
        expect(puzzle.shortest.length - 1).toBeLessThanOrEqual(maximum)
        for (let index = 1; index < puzzle.shortest.length; index += 1) {
          expect(adjacency.get(puzzle.shortest[index - 1]!)).toContain(puzzle.shortest[index])
        }
      }
    }
  })

  it('uses reciprocal land borders and penalizes missing or incorrect neighbors fairly', () => {
    const standard = eligibleCountries(countries, 'standard')
    const questions = makeNeighbourQuestions(standard, 'neighbour-test', 20)
    expect(questions).toHaveLength(20)
    for (const question of questions) {
      expect(question.neighbourCodes.length).toBeGreaterThanOrEqual(2)
      expect(new Set(question.neighbourCodes).size).toBe(question.neighbourCodes.length)
      for (const code of question.neighbourCodes) expect(countriesByCode.get(code)?.borders).toContain(question.country.iso3)
    }
    expect(scoreNeighbourAnswer(['A', 'B'], ['A', 'B'])).toMatchObject({ points: 1000, exact: true, missed: 0, extra: 0 })
    expect(scoreNeighbourAnswer(['A', 'B'], ['A', 'C'])).toMatchObject({ points: 400, exact: false, matched: 1, missed: 1, extra: 1 })
    const dense = makeNeighbourQuestions(standard, 'neighbour-dense', 20, 'Europe', 'dense')
    expect(dense.length).toBeGreaterThan(0)
    expect(dense.every((question) => question.country.continent === 'Europe' && question.neighbourCodes.length >= 5)).toBe(true)
    const extended = makeNeighbourQuestions(eligibleCountries(countries, 'extended'), 'neighbour-extended', 250)
    expect(extended.some((question) => !isStandardCountry(question.country.iso3))).toBe(true)
  })

  it('generates solvable city comparisons with correct geodesic and coordinate answers', () => {
    for (const measure of ['distance', 'latitude', 'longitude'] as const) {
      const questions = makeDistanceQuestions(cities, countriesByCode, `distance:${measure}`, 15, { measure, minimumPopulation: 100_000, difficulty: 'standard' })
      expect(questions).toHaveLength(15)
      for (const question of questions) {
        expect(question.origin.id).not.toBe(question.left.id)
        expect(question.origin.id).not.toBe(question.right.id)
        expect(question.left.id).not.toBe(question.right.id)
        expect(question.leftDistanceKm).toBeCloseTo(greatCircleKm(question.origin, question.left), 5)
        expect(question.rightDistanceKm).toBeCloseTo(greatCircleKm(question.origin, question.right), 5)
        const leftValue = measure === 'distance' ? question.leftDistanceKm : measure === 'latitude' ? question.left.lat : question.left.lon
        const rightValue = measure === 'distance' ? question.rightDistanceKm : measure === 'latitude' ? question.right.lat : question.right.lon
        expect(question.answer === 'left' ? (measure === 'distance' ? leftValue < rightValue : leftValue > rightValue) : (measure === 'distance' ? rightValue < leftValue : rightValue > leftValue)).toBe(true)
      }
      const closeRegional = makeDistanceQuestions(cities, countriesByCode, `distance:close:europe:${measure}`, 10, { scope: 'Europe', measure, minimumPopulation: 100_000, difficulty: 'close' })
      expect(closeRegional.length).toBeGreaterThan(0)
      expect(closeRegional.every((question) => countriesByCode.get(question.left.countryIso3)?.continent === 'Europe' && countriesByCode.get(question.right.countryIso3)?.continent === 'Europe')).toBe(true)
    }
  })
})
