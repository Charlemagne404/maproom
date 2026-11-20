import { seededShuffle } from '../engine'
import type { HistoricalAtlasMap, HistoricalMap } from '../../geography/historical/types'

export type HistoricalDifficulty = 'easy' | 'medium' | 'hard'
export type HistoricalEra = 'all' | 'ancient' | 'classical' | 'medieval' | 'early-modern' | 'modern'
export type HistoricalYearEra = 'BCE' | 'CE'

export interface HistoricalGuessResult {
  guess: number
  answer: number
  distance: number
  tolerance: number
  acceptedMinimum: number
  acceptedMaximum: number
  withinTolerance: boolean
  score: number
}

export interface HistoricalSequence {
  id: string
  maps: HistoricalMap[]
}

export interface HistoricalSequenceResult {
  correctPairs: number
  totalPairs: number
  score: number
  exact: boolean
}

export interface HistoricalAtlasSequence {
  id: string
  maps: HistoricalAtlasMap[]
}

export interface HistoricalAtlasGuessResult {
  guessYear: number
  acceptedFromYear: number
  acceptedToYear: number
  distance: number
  tolerance: number
  withinAcceptedInterval: boolean
  withinTolerance: boolean
  /** Missing on completed rounds saved before precision caps were added. */
  scoreCeiling?: number
  score: number
}

const HISTORICAL_SEQUENCE_YEARS = [
  [1886, 1949, 1991],
  [1898, 1956, 2002],
  [1914, 1960, 2006],
  [1918, 1965, 2011],
  [1920, 1971, 1993],
  [1939, 1975, 2011],
] as const

export const HISTORICAL_TOLERANCES: Record<HistoricalDifficulty, number> = {
  // The 20-map pack spans 125 years. Wider windows make a fixed midpoint guess
  // pass too many rounds, so these bands are calibrated to the shipped dates.
  easy: 20,
  medium: 8,
  hard: 2,
}

const HISTORICAL_ERA_TOLERANCES = [
  { before: -1000, years: 35 },
  { before: -500, years: 28 },
  { before: 500, years: 20 },
  { before: 1500, years: 12 },
  { before: 1800, years: 8 },
  { before: Infinity, years: 4 },
] as const

const HISTORICAL_DIFFICULTY_MULTIPLIERS: Record<HistoricalDifficulty, number> = {
  easy: 1.5,
  medium: 1,
  hard: 0.65,
}

export const HISTORICAL_ERA_OPTIONS: Array<{ value: HistoricalEra; label: string }> = [
  { value: 'all', label: 'All history' },
  { value: 'ancient', label: 'Ancient · before 500 BCE' },
  { value: 'classical', label: 'Classical · 500 BCE–499 CE' },
  { value: 'medieval', label: 'Medieval · 500–1499 CE' },
  { value: 'early-modern', label: 'Early modern · 1500–1799 CE' },
  { value: 'modern', label: 'Modern · 1800 CE onward' },
]

/** The data convention uses negative BCE and positive CE years with no year zero. */
export function isHistoricalYear(year: number): boolean {
  return Number.isInteger(year) && year !== 0 && Math.abs(year) <= 9999
}

/** Convert displayed historical years to astronomical numbering for arithmetic. */
export function toAstronomicalYear(year: number): number {
  if (!isHistoricalYear(year)) throw new RangeError('A historical year must be a whole BCE or CE year; there is no year zero.')
  return year < 0 ? year + 1 : year
}

/** Convert astronomical numbering back to the BCE/CE display convention. */
export function fromAstronomicalYear(year: number): number {
  if (!Number.isInteger(year) || Math.abs(year) > 10000) throw new RangeError('The astronomical year is outside the supported range.')
  return year <= 0 ? year - 1 : year
}

export function parseHistoricalYearInput(value: string, era: HistoricalYearEra): number | null {
  const trimmed = value.trim().replaceAll(',', '')
  if (!/^\d{1,4}$/.test(trimmed)) return null
  const magnitude = Number(trimmed)
  if (!Number.isInteger(magnitude) || magnitude < 1 || magnitude > 9999) return null
  return era === 'BCE' ? -magnitude : magnitude
}

export function formatHistoricalYear(year: number): string {
  if (!isHistoricalYear(year)) throw new RangeError('A historical year must be a whole BCE or CE year; there is no year zero.')
  return `${Math.abs(year).toLocaleString('en-US')} ${year < 0 ? 'BCE' : 'CE'}`
}

export function formatHistoricalDateRange(fromYear: number, toYear: number): string {
  if (!isHistoricalYear(fromYear) || !isHistoricalYear(toYear) || toAstronomicalYear(fromYear) > toAstronomicalYear(toYear)) {
    throw new RangeError('A historical date range must be ordered and contain no year zero.')
  }
  if (fromYear < 0 && toYear < 0) return `${Math.abs(fromYear).toLocaleString('en-US')}–${Math.abs(toYear).toLocaleString('en-US')} BCE`
  if (fromYear > 0 && toYear > 0) return `${fromYear.toLocaleString('en-US')}–${toYear.toLocaleString('en-US')} CE`
  return `${formatHistoricalYear(fromYear)}–${formatHistoricalYear(toYear)}`
}

export function historicalYearDistance(left: number, right: number): number {
  return Math.abs(toAstronomicalYear(left) - toAstronomicalYear(right))
}

export function compareHistoricalYears(left: number, right: number): number {
  return toAstronomicalYear(left) - toAstronomicalYear(right)
}

export function historicalEraForYear(year: number): Exclude<HistoricalEra, 'all'> {
  if (!isHistoricalYear(year)) throw new RangeError('A historical year must be a whole BCE or CE year; there is no year zero.')
  if (year < -500) return 'ancient'
  if (year < 500) return 'classical'
  if (year < 1500) return 'medieval'
  if (year < 1800) return 'early-modern'
  return 'modern'
}

export function historicalMapMatchesEra(map: HistoricalAtlasMap, era: HistoricalEra): boolean {
  return era === 'all' || historicalEraForYear(map.sampleYear) === era
}

export function createHistoricalAtlasDeck(maps: readonly HistoricalAtlasMap[], seed: string, era: HistoricalEra = 'all'): HistoricalAtlasMap[] {
  const stableMaps = maps.filter((map) => historicalMapMatchesEra(map, era)).sort((left, right) => left.id.localeCompare(right.id))
  if (stableMaps.length < 2) return stableMaps
  return seededShuffle(stableMaps, `historical-geography:atlas-deck:v2:${era}:${seed}`)
}

export function evaluateHistoricalAtlasGuess(map: HistoricalAtlasMap, guessYear: number, difficulty: HistoricalDifficulty): HistoricalAtlasGuessResult {
  if (!isHistoricalYear(guessYear) || !isHistoricalYear(map.acceptedFromYear) || !isHistoricalYear(map.acceptedToYear)
    || compareHistoricalYears(map.acceptedFromYear, map.acceptedToYear) > 0
    || !['easy', 'medium', 'hard'].includes(difficulty)) {
    throw new RangeError('Enter a whole year from 1 BCE to 9999 CE.')
  }
  const withinAcceptedInterval = compareHistoricalYears(guessYear, map.acceptedFromYear) >= 0
    && compareHistoricalYears(guessYear, map.acceptedToYear) <= 0
  const distance = withinAcceptedInterval
    ? 0
    : historicalYearDistance(guessYear, guessYear < map.acceptedFromYear ? map.acceptedFromYear : map.acceptedToYear)
  const midpointAstronomical = Math.floor((toAstronomicalYear(map.acceptedFromYear) + toAstronomicalYear(map.acceptedToYear)) / 2)
  const midpointYear = fromAstronomicalYear(midpointAstronomical)
  const eraBase = HISTORICAL_ERA_TOLERANCES.find(({ before }) => midpointYear < before)?.years ?? 4
  const supportedYears = historicalYearDistance(map.acceptedFromYear, map.acceptedToYear) + 1
  const sourcePrecisionBonus = Math.min(24, Math.ceil(Math.log2(supportedYears) * 2))
  const distinctivenessAdjustment = map.visualDistinctiveness === 1 ? 10 : map.visualDistinctiveness === 2 ? 4 : 0
  const tolerance = Math.max(1, Math.round((eraBase + sourcePrecisionBonus + distinctivenessAdjustment)
    * HISTORICAL_DIFFICULTY_MULTIPLIERS[difficulty]))
  const scoreCeiling = supportedYears <= 10
    ? 1000
    : Math.max(500, Math.round(1000 - 125 * Math.log2(supportedYears / 10)))
  const score = distance === 0 ? scoreCeiling : Math.max(0, scoreCeiling - Math.round(distance * scoreCeiling / (tolerance + 1)))
  return {
    guessYear,
    acceptedFromYear: map.acceptedFromYear,
    acceptedToYear: map.acceptedToYear,
    distance,
    tolerance,
    withinAcceptedInterval,
    withinTolerance: distance <= tolerance,
    scoreCeiling,
    score,
  }
}

export function createHistoricalAtlasSequenceDeck(maps: readonly HistoricalAtlasMap[], seed: string): HistoricalAtlasSequence[] {
  const byPolityAndRegion = new Map<string, HistoricalAtlasMap[]>()
  for (const map of maps) {
    const polity = map.polities[0]?.name ?? ''
    const key = `${polity}:${map.region.id}`
    byPolityAndRegion.set(key, [...(byPolityAndRegion.get(key) ?? []), map])
  }
  const sequences: HistoricalAtlasSequence[] = []
  for (const [groupKey, groupMaps] of byPolityAndRegion) {
    const sortedMaps = [...groupMaps].sort((left, right) => compareHistoricalYears(left.acceptedFromYear, right.acceptedFromYear)
      || left.id.localeCompare(right.id))
    if (sortedMaps.length < 3) continue
    for (let first = 0; first < sortedMaps.length - 2; first += 1) {
      const left = sortedMaps[first]!
      for (let second = first + 1; second < sortedMaps.length - 1; second += 1) {
        const middle = sortedMaps[second]!
        if (compareHistoricalYears(left.acceptedToYear, middle.acceptedFromYear) >= 0) continue
        for (let third = second + 1; third < sortedMaps.length; third += 1) {
          const later = sortedMaps[third]!
          if (compareHistoricalYears(middle.acceptedToYear, later.acceptedFromYear) >= 0) continue
          const sequenceMaps = [left, middle, later]
          sequences.push({ id: `atlas-sequence-${groupKey.replaceAll(/[^a-z0-9]+/gi, '-')}-${sequenceMaps.map((map) => map.id).join('-')}`, maps: sequenceMaps })
        }
      }
    }
  }
  return seededShuffle(sequences.sort((left, right) => left.id.localeCompare(right.id)), `historical-geography:atlas-sequence-deck:v2:${seed}`)
}

export function createHistoricalAtlasSequenceOrder(sequence: HistoricalAtlasSequence, seed: string): HistoricalAtlasMap[] {
  const alternatives = [[1, 0, 2], [0, 2, 1], [2, 0, 1], [1, 2, 0]]
  const selected = seededShuffle(alternatives, `historical-geography:atlas-sequence-order:v2:${seed}:${sequence.id}`)[0]!
  return selected.map((index) => sequence.maps[index]!)
}

export function createHistoricalDeck(maps: readonly HistoricalMap[], seed: string): HistoricalMap[] {
  const stableMaps = [...maps].sort((left, right) => left.id.localeCompare(right.id))
  if (stableMaps.length < 2) return stableMaps
  return seededShuffle(stableMaps, `historical-geography:deck:v1:${seed}`)
}

export function createHistoricalSequenceDeck(maps: readonly HistoricalMap[], seed: string): HistoricalSequence[] {
  const mapsByYear = new Map(maps.map((map) => [map.depictedYear, map]))
  const sequences = HISTORICAL_SEQUENCE_YEARS.flatMap((years, index) => {
    const sequenceMaps = years.map((year) => mapsByYear.get(year))
    if (sequenceMaps.some((map) => !map)) return []
    return [{ id: `historical-sequence-${String(index + 1).padStart(2, '0')}`, maps: sequenceMaps as HistoricalMap[] }]
  })
  return seededShuffle(sequences, `historical-geography:sequence-deck:v1:${seed}`)
}

export function createHistoricalSequenceOrder(sequence: HistoricalSequence, seed: string): HistoricalMap[] {
  const alternatives = [
    [1, 0, 2],
    [0, 2, 1],
    [2, 0, 1],
    [1, 2, 0],
  ]
  const selected = seededShuffle(alternatives, `historical-geography:sequence-order:v1:${seed}:${sequence.id}`)[0]!
  return selected.map((index) => sequence.maps[index]!)
}

export function evaluateHistoricalSequenceOrder(targetOrder: readonly string[], guessedOrder: readonly string[]): HistoricalSequenceResult {
  if (targetOrder.length !== 3 || guessedOrder.length !== 3
    || new Set(targetOrder).size !== 3 || new Set(guessedOrder).size !== 3
    || [...targetOrder].sort().some((id, index) => id !== [...guessedOrder].sort()[index])) {
    throw new RangeError('A historical sequence must contain the same three unique maps.')
  }

  let correctPairs = 0
  for (let left = 0; left < targetOrder.length; left += 1) {
    for (let right = left + 1; right < targetOrder.length; right += 1) {
      if (guessedOrder.indexOf(targetOrder[left]!) < guessedOrder.indexOf(targetOrder[right]!)) correctPairs += 1
    }
  }
  const totalPairs = 3
  return { correctPairs, totalPairs, score: Math.round(correctPairs * 1000 / totalPairs), exact: correctPairs === totalPairs }
}

export function getHistoricalMapAt(maps: readonly HistoricalMap[], seed: string, round: number): HistoricalMap | undefined {
  if (maps.length === 0 || !Number.isInteger(round) || round < 0) return undefined
  const deck = createHistoricalDeck(maps, seed)
  return deck[round % deck.length]
}

export function evaluateHistoricalGuess(answer: number, guess: number, difficulty: HistoricalDifficulty): HistoricalGuessResult {
  if (!Number.isInteger(answer) || !Number.isInteger(guess) || answer < 1 || answer > 9999 || guess < 1 || guess > 9999) {
    throw new RangeError('Enter a year from 1 to 9999.')
  }
  const tolerance = HISTORICAL_TOLERANCES[difficulty]
  if (!tolerance) throw new RangeError(`Unknown historical map difficulty: ${String(difficulty)}`)
  const distance = Math.abs(guess - answer)
  return {
    guess,
    answer,
    distance,
    tolerance,
    acceptedMinimum: answer - tolerance,
    acceptedMaximum: answer + tolerance,
    withinTolerance: distance <= tolerance,
    score: Math.max(0, 1000 - Math.round(distance * 1000 / (tolerance * 2))),
  }
}

export function formatHistoricalYearRange(minimum: number, maximum: number): string {
  return `${minimum.toLocaleString('en-US')}–${maximum.toLocaleString('en-US')}`
}
