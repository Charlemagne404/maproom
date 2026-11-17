export type OutlineDifficulty = 'easy' | 'medium' | 'hard'
export type OutlineRule = {
  status: 'eligible' | 'excluded'
  difficulty: OutlineDifficulty | null
  reason: string
  contextRequired: boolean
  quality: string
  geometrySource: string
}
export const REVIEWED_OUTLINE_CODES: Set<string>
export const EASY_OUTLINE_CODES: Set<string>
export const HARD_OUTLINE_CODES: Set<string>
export const EXCLUDED_OUTLINE_RULES: Readonly<Record<string, { reason: string; quality: string }>>
export function outlineRuleFor(code: string): OutlineRule | undefined
export function reviewedOutlineCodes(): Set<string>
export function isOutlineTerritory(country: { iso3: string; parentIso3: string | null }): boolean
export function isOutlineStandard(country: { iso3: string }): boolean
export function outlinePlayabilitySummary(countries: Array<{ iso3: string; parentIso3: string | null }>): { easy: number; medium: number; hard: number; excluded: number; standard: number; territories: number; additional: number; special: number }
