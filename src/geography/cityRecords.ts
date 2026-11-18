import type { City } from './types'

const excludedFeatureCodes = new Set<string>(['PPLH', 'PPLQ', 'PPLW', 'PPLX'])

export function isCurrentWholeSettlement(city: Pick<City, 'featureCode'>): boolean {
  return !excludedFeatureCodes.has(city.featureCode)
}
