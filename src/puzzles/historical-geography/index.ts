import { seededShuffle } from '../engine'
import type { HistoricalMap } from '../../geography/historical/types'

export type HistoricalDifficulty = 'easy' | 'medium' | 'hard'

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
