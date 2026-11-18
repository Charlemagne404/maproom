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

export const HISTORICAL_TOLERANCES: Record<HistoricalDifficulty, number> = {
  easy: 100,
  medium: 50,
  hard: 25,
}

export function createHistoricalDeck(maps: readonly HistoricalMap[], seed: string): HistoricalMap[] {
  const stableMaps = [...maps].sort((left, right) => left.id.localeCompare(right.id))
  if (stableMaps.length < 2) return stableMaps
  return seededShuffle(stableMaps, `historical-geography:deck:v1:${seed}`)
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
