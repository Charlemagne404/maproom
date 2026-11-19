import { GAME_IDS, type GameId } from '../geography/types'

export interface DailyGameEligibility {
  gameId: string
  eligible: boolean
  reason: string
}

/** Daily membership is opt-in and intentionally independent of game registration. */
export const DAILY_GAME_ELIGIBILITY: readonly DailyGameEligibility[] = [
  { gameId: 'countries', eligible: true, reason: 'Seeded daily deck, reviewed country pool, scoring, and saved progress.' },
  { gameId: 'outlines', eligible: true, reason: 'Reviewed silhouette pool, seeded target, scoring, and saved progress.' },
  { gameId: 'routes', eligible: true, reason: 'Seeded route, stable land-border data, scoring, and saved progress.' },
  { gameId: 'flags', eligible: true, reason: 'Seeded question and choice decks, stable country pool, scoring, and saved progress.' },
  { gameId: 'grid', eligible: true, reason: 'Seeded validated board, stable clues, scoring, and saved progress.' },
  { gameId: 'cities', eligible: true, reason: 'Seeded question deck, stable city data, scoring, and saved progress.' },
  { gameId: 'connections', eligible: false, reason: 'The active board and solved groups are not saved between visits.' },
  { gameId: 'higher-lower', eligible: false, reason: 'The active comparison deck and answers are not saved between visits.' },
  { gameId: 'neighbours', eligible: false, reason: 'The active round and selections are not saved between visits.' },
  { gameId: 'distance', eligible: false, reason: 'The active comparison deck and answers are not saved between visits.' },
  { gameId: 'rivers', eligible: true, reason: 'Seeded from a named river pool, with stable scoring and saved progress.' },
  { gameId: 'latitude-ladder', eligible: true, reason: 'Seeded five-city order, stable scoring, and saved progress.' },
  { gameId: 'historical-geography', eligible: false, reason: 'Excluded from Daily; its historical map deck and one-guess format have not been reviewed for the rotation.' },
  { gameId: 'projection-match', eligible: false, reason: 'Free Play only while the task prompts and four-round difficulty are evaluated.' },
  { gameId: 'population-pyramid', eligible: false, reason: 'Free Play only while the population-profile prompt and spacing bands are evaluated with players.' },
]

const knownGameIds = new Set<string>(GAME_IDS)

export function isDailyEligible(gameId: string, eligibility: readonly DailyGameEligibility[] = DAILY_GAME_ELIGIBILITY): boolean {
  return eligibility.some((entry) => entry.gameId === gameId && entry.eligible)
}

export function getEligibleDailyGameIds(eligibility: readonly DailyGameEligibility[] = DAILY_GAME_ELIGIBILITY): GameId[] {
  const seen = new Set<string>()
  const ids: GameId[] = []
  for (const entry of eligibility) {
    if (!entry.eligible || !knownGameIds.has(entry.gameId) || seen.has(entry.gameId)) continue
    seen.add(entry.gameId)
    ids.push(entry.gameId as GameId)
  }
  return ids
}
