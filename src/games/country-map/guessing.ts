import type { Country } from '../../geography/types'
import { directionFromTo, greatCircleKm } from '../../puzzles/engine'

export const MULTI_GUESS_LIMIT = 4

export function countryGuessPoints(wrongGuessCount: number): number {
  return Math.max(25, 100 - Math.max(0, wrongGuessCount) * 25)
}

export function countryGuessFeedback(guess: Country, target: Country, triesRemaining: number): string {
  const guessPoint = guess.coordinates
  const targetPoint = target.coordinates
  const tries = `${triesRemaining} ${triesRemaining === 1 ? 'try' : 'tries'} left.`
  if (!guessPoint || !targetPoint) return `Not quite. ${guess.name} is not the target. ${tries}`

  const rawDistance = greatCircleKm(guessPoint, targetPoint)
  const distance = Math.round(rawDistance / 50) * 50
  const distanceText = rawDistance <= 25 ? 'less than 25' : `about ${distance.toLocaleString()}`
  const direction = directionFromTo(guessPoint, targetPoint)
  return `Not quite. From ${guess.name}, the target is ${distanceText} km ${direction}. ${tries}`
}
