import type { City, Coordinates, Country } from '../geography/types'
import { directionFromTo, greatCircleKm, seededRandom } from './engine'

export type DistanceMeasure = 'distance' | 'latitude' | 'longitude'
export type DistanceDifficulty = 'standard' | 'close'

export interface DistanceQuestion {
  origin: City
  left: City
  right: City
  measure: DistanceMeasure
  leftDistanceKm: number
  rightDistanceKm: number
  leftDirection: string
  rightDirection: string
  answer: 'left' | 'right'
}

export function makeDistanceQuestions(
  cities: City[], countriesByCode: Map<string, Country>, seed: string, count: number,
  options: { scope?: string; measure?: DistanceMeasure; minimumPopulation?: number; difficulty?: DistanceDifficulty } = {},
): DistanceQuestion[] {
  const { scope = 'World', measure = 'distance', minimumPopulation = 50_000, difficulty = 'standard' } = options
  const eligible = cities.filter((city) => {
    if (city.population < minimumPopulation) return false
    const country = countriesByCode.get(city.countryIso3)
    return Boolean(country && (scope === 'World' || country.continent === scope))
  })
  if (eligible.length < 3) return []
  const random = seededRandom(seed)
  const questions: DistanceQuestion[] = []
  const questionKeys = new Set<string>()
  for (let attempt = 0; attempt < count * 2500 && questions.length < count; attempt += 1) {
    const origin = eligible[Math.floor(random() * eligible.length)]!
    let left = eligible[Math.floor(random() * eligible.length)]!
    let right = eligible[Math.floor(random() * eligible.length)]!
    if (origin.id === left.id || origin.id === right.id || left.id === right.id) continue
    // A new origin changes the comparison even when the same three cities recur.
    // Prevent repeats of an exact origin and unordered choice pair instead.
    const key = `${origin.id}|${[left.id, right.id].sort().join('|')}`
    if (questionKeys.has(key)) continue
    const leftPoint: Coordinates = { lat: left.lat, lon: left.lon }
    const rightPoint: Coordinates = { lat: right.lat, lon: right.lon }
    const originPoint: Coordinates = { lat: origin.lat, lon: origin.lon }
    const leftDistanceKm = greatCircleKm(originPoint, leftPoint)
    const rightDistanceKm = greatCircleKm(originPoint, rightPoint)
    // Longitudes are compared as signed distance east of Greenwich, which is
    // explicit and avoids pretending that longitude is an east/west bearing.
    const leftValue = measure === 'distance' ? leftDistanceKm : measure === 'latitude' ? left.lat : left.lon
    const rightValue = measure === 'distance' ? rightDistanceKm : measure === 'latitude' ? right.lat : right.lon
    const difference = Math.abs(leftValue - rightValue)
    const ratio = Math.max(leftValue, rightValue) / Math.max(0.001, Math.min(leftValue, rightValue))
    if (measure === 'distance') {
      if (difficulty === 'close' ? ratio > 1.35 || ratio < 1.01 : ratio < 1.25) continue
    } else if (difficulty === 'close'
      ? difference < 0.35 || difference >= 4
      : difference < 4) continue
    questionKeys.add(key)
    questions.push({
      origin, left, right, measure, leftDistanceKm, rightDistanceKm,
      leftDirection: directionFromTo(originPoint, leftPoint),
      rightDirection: directionFromTo(originPoint, rightPoint),
      answer: (measure === 'distance' ? leftValue < rightValue : leftValue > rightValue) ? 'left' : 'right',
    })
  }
  return questions
}

export function distancePrompt(measure: DistanceMeasure, origin: string): string {
  if (measure === 'latitude') return 'Which place lies farther north?'
  if (measure === 'longitude') return 'Which place lies farther east of Greenwich?'
  return `Which place is closer to ${origin}?`
}
