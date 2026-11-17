export const STANDARD_CODES: Set<string>
export const SPECIAL_GEOGRAPHIC_CODES: Set<string>
export type GeographicClassification = 'standard-quiz-identity' | 'separately-represented-territory' | 'special-geographic-entity' | 'additional-identity'
export function classifyGeography(country: { iso3: string; parentIso3: string | null }): GeographicClassification
