import type { Country, GameMode, GeoFeature } from './types'
import { classifyGeography, SPECIAL_GEOGRAPHIC_CODES, STANDARD_CODES } from './catalogue-rules.mjs'
export { classifyGeography }
export type { GeographicClassification } from './catalogue-rules.mjs'

export type GeographyEligibility = 'standard' | 'extended'

export function initialGeographyEligibility(mode: GameMode, preference: GeographyEligibility): GeographyEligibility {
  return mode === 'daily' ? 'standard' : preference
}

export function isStandardCountry(code: string): boolean {
  return STANDARD_CODES.has(code)
}

export function eligibleCountries(countries: Country[], eligibility: GeographyEligibility = 'standard'): Country[] {
  return countries.filter((country) => {
    if (eligibility === 'standard') return isStandardCountry(country.iso3)
    return !SPECIAL_GEOGRAPHIC_CODES.has(country.iso3)
  })
}

export function eligibleFeatures(features: GeoFeature[], eligibility: GeographyEligibility = 'standard'): GeoFeature[] {
  return features.filter((feature) => {
    const code = feature.properties.iso3
    return Boolean(code && (eligibility === 'standard'
      ? isStandardCountry(code)
      : !SPECIAL_GEOGRAPHIC_CODES.has(code)))
  })
}

export function standardCountryCount(): number {
  return STANDARD_CODES.size
}
