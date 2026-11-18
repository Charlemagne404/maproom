import type { GameId } from '../geography/types'
import { DAILY_GAME_ELIGIBILITY, getEligibleDailyGameIds, type DailyGameEligibility } from './eligibility'

export const DAILY_CHALLENGE_COUNT = 6
export const DAILY_SCHEDULE_VERSION = 1
export const DAILY_SCHEDULE_EPOCH = '2026-01-01'

type Lineup = GameId[]

const lineupCycleCache = new Map<string, readonly Lineup[]>()
const DAY_MS = 86_400_000

/**
 * Returns the six-game lineup for an ISO civil-date key. Timezone conversion
 * happens once at the existing usePuzzleDate boundary; it is not an input here.
 */
export function getDailyGameLineup(
  dateKey: string,
  eligibility: readonly DailyGameEligibility[] = DAILY_GAME_ELIGIBILITY,
  version = DAILY_SCHEDULE_VERSION,
): GameId[] {
  const eligibleIds = getEligibleDailyGameIds(eligibility).sort(compareText)
  if (eligibleIds.length < DAILY_CHALLENGE_COUNT) {
    throw new RangeError(`Daily rotation needs at least ${DAILY_CHALLENGE_COUNT} eligible games.`)
  }

  const dateOffset = daysFromEpoch(dateKey)
  const cacheKey = `${version}|${eligibleIds.join('|')}`
  let cycle = lineupCycleCache.get(cacheKey)
  if (!cycle) {
    cycle = buildBalancedLineupCycle(eligibleIds, version)
    lineupCycleCache.set(cacheKey, cycle)
  }

  const cycleIndex = positiveModulo(dateOffset, cycle.length)
  const lineup = [...cycle[cycleIndex]!]
  const displayOrderSeed = `${version}:${dateKey}:display-order`
  return lineup.sort((left, right) => {
    const difference = stableHash(`${displayOrderSeed}:${left}`) - stableHash(`${displayOrderSeed}:${right}`)
    return difference || compareText(left, right)
  })
}

/** The schedule can be supplied independently for tests and future opt-ins. */
export function getDailyLineupForEligibility(
  dateKey: string,
  eligibility: readonly DailyGameEligibility[],
  version = DAILY_SCHEDULE_VERSION,
): GameId[] {
  return getDailyGameLineup(dateKey, eligibility, version)
}

function buildBalancedLineupCycle(gameIds: readonly GameId[], version: number): readonly Lineup[] {
  const remaining = makeLineups(gameIds)
  const cycle: Lineup[] = []
  const recentWindow = Math.min(28, Math.max(7, gameIds.length * 2))
  const maxConsecutiveAppearances = Math.max(2, Math.ceil(DAILY_CHALLENGE_COUNT / (gameIds.length - DAILY_CHALLENGE_COUNT)))

  while (remaining.length > 0) {
    const recent = cycle.slice(-recentWindow)
    const recentCounts = countGameAppearances(recent, gameIds)
    const recentPairCounts = countPairAppearances(recent)
    const currentRuns = currentAppearanceRuns(cycle, gameIds)
    const targetExposure = ((recent.length + 1) * DAILY_CHALLENGE_COUNT) / gameIds.length
    const previous = cycle.at(-1)

    let bestIndex = 0
    let bestScore: readonly number[] | undefined
    for (let index = 0; index < remaining.length; index += 1) {
      const lineup = remaining[index]!
      const runPenalty = lineup.reduce((sum, id) => sum + Math.max(0, currentRuns.get(id)! + 1 - maxConsecutiveAppearances), 0)
      const exposureVariance = gameIds.reduce((sum, id) => {
        const nextCount = recentCounts.get(id)! + Number(lineup.includes(id))
        return sum + (nextCount - targetExposure) ** 2
      }, 0)
      const previousOverlap = previous ? lineup.filter((id) => previous.includes(id)).length : 0
      const repeatedPairs = pairsIn(lineup).reduce((sum, pair) => sum + (recentPairCounts.get(pair) ?? 0), 0)
      const signature = lineup.join('|')
      const tieBreak = stableHash(`${version}:${cycle.length}:${signature}`)
      const score = [runPenalty, exposureVariance, previousOverlap, repeatedPairs, tieBreak]
      if (!bestScore || compareScores(score, bestScore) < 0) {
        bestIndex = index
        bestScore = score
      }
    }

    cycle.push(remaining.splice(bestIndex, 1)[0]!)
  }

  return cycle
}

function makeLineups(gameIds: readonly GameId[]): Lineup[] {
  const result: Lineup[] = []
  const current: GameId[] = []
  function visit(start: number): void {
    if (current.length === DAILY_CHALLENGE_COUNT) {
      result.push([...current])
      return
    }
    const needed = DAILY_CHALLENGE_COUNT - current.length
    for (let index = start; index <= gameIds.length - needed; index += 1) {
      current.push(gameIds[index]!)
      visit(index + 1)
      current.pop()
    }
  }
  visit(0)
  return result
}

function countGameAppearances(lineups: readonly Lineup[], gameIds: readonly GameId[]): Map<GameId, number> {
  const counts = new Map(gameIds.map((id) => [id, 0]))
  for (const lineup of lineups) for (const id of lineup) counts.set(id, counts.get(id)! + 1)
  return counts
}

function countPairAppearances(lineups: readonly Lineup[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const lineup of lineups) for (const pair of pairsIn(lineup)) counts.set(pair, (counts.get(pair) ?? 0) + 1)
  return counts
}

function pairsIn(lineup: readonly GameId[]): string[] {
  const pairs: string[] = []
  for (let left = 0; left < lineup.length; left += 1) {
    for (let right = left + 1; right < lineup.length; right += 1) {
      pairs.push(`${lineup[left]}:${lineup[right]}`)
    }
  }
  return pairs
}

function currentAppearanceRuns(lineups: readonly Lineup[], gameIds: readonly GameId[]): Map<GameId, number> {
  const runs = new Map(gameIds.map((id) => [id, 0]))
  for (let index = lineups.length - 1; index >= 0; index -= 1) {
    const lineup = lineups[index]!
    for (const id of gameIds) {
      if (runs.get(id) !== lineups.length - 1 - index) continue
      if (lineup.includes(id)) runs.set(id, runs.get(id)! + 1)
    }
  }
  return runs
}

function daysFromEpoch(dateKey: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new RangeError(`Invalid Daily date key: ${dateKey}`)
  const timestamp = Date.parse(`${dateKey}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== dateKey) {
    throw new RangeError(`Invalid Daily date key: ${dateKey}`)
  }
  const epoch = Date.parse(`${DAILY_SCHEDULE_EPOCH}T00:00:00.000Z`)
  return Math.trunc((timestamp - epoch) / DAY_MS)
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

function stableHash(value: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function compareScores(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index]! - right[index]!
  }
  return 0
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
