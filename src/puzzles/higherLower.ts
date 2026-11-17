import type { Country } from '../geography/types'
import { seededRandom } from './engine'

export type CountryMeasure = 'population' | 'area' | 'density'
export type ComparisonDifficulty = 'standard' | 'close'

export interface HigherLowerQuestion {
  left: Country
  right: Country
  measure: CountryMeasure
  leftValue: number
  rightValue: number
  answer: 'left' | 'right'
}

export function countryMeasure(country: Country, measure: CountryMeasure): number | null {
  if (measure === 'population') return country.population && country.population > 0 ? country.population : null
  if (measure === 'area') return country.areaKm2 && country.areaKm2 > 0 ? country.areaKm2 : null
  if (!country.population || !country.areaKm2 || country.population <= 0 || country.areaKm2 <= 0) return null
  return country.population / country.areaKm2
}

export function makeHigherLowerQuestions(
  countries: Country[], measure: CountryMeasure, seed: string, count: number, difficulty: ComparisonDifficulty = 'standard',
): HigherLowerQuestion[] {
  const pool = countries.filter((country) => countryMeasure(country, measure) !== null)
  const random = seededRandom(seed)
  const questions: HigherLowerQuestion[] = []
  const pairs = new Set<string>()
  const minimumRatio = difficulty === 'close' ? 1.01 : 1.25
  const maximumRatio = difficulty === 'close' ? 1.45 : Number.POSITIVE_INFINITY
  for (let attempt = 0; attempt < count * 1500 && questions.length < count; attempt += 1) {
    if (pool.length < 2) break
    const left = pool[Math.floor(random() * pool.length)]!
    let right = pool[Math.floor(random() * pool.length)]!
    if (left.iso3 === right.iso3) continue
    const pair = [left.iso3, right.iso3].sort().join(':')
    if (pairs.has(pair)) continue
    const leftValue = countryMeasure(left, measure)!
    const rightValue = countryMeasure(right, measure)!
    const ratio = Math.max(leftValue, rightValue) / Math.min(leftValue, rightValue)
    if (!Number.isFinite(ratio) || ratio < minimumRatio || ratio > maximumRatio) continue
    pairs.add(pair)
    questions.push({ left, right, measure, leftValue, rightValue, answer: leftValue > rightValue ? 'left' : 'right' })
  }
  return questions
}

export function formatCountryMeasure(value: number, measure: CountryMeasure): string {
  if (measure === 'population') return `${Math.round(value).toLocaleString('en-US')} people`
  if (measure === 'area') return `${Math.round(value).toLocaleString('en-US')} km²`
  return `${Math.round(value).toLocaleString('en-US')} people/km²`
}
