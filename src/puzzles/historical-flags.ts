import type { HistoricalFlagEntry } from '../geography/historical/types'
import { seededShuffle } from './engine'

export type HistoricalFlagQuestionCount = '10' | 'all'

export function createHistoricalFlagDeck(items: readonly HistoricalFlagEntry[], seed: string, round: number, count: HistoricalFlagQuestionCount): HistoricalFlagEntry[] {
  const questionCount = count === 'all' ? items.length : Math.min(10, items.length)
  const stableItems = [...items].sort((left, right) => left.id.localeCompare(right.id))
  return seededShuffle(stableItems, `historical-flags:v1:${seed}:${round}`).slice(0, questionCount)
}

export function createHistoricalFlagChoices(items: readonly HistoricalFlagEntry[], question: HistoricalFlagEntry, seed: string): HistoricalFlagEntry[] {
  const identities = new Set<string>()
  const candidates: HistoricalFlagEntry[] = []
  for (const item of [...items].sort((left, right) => left.id.localeCompare(right.id))) {
    if (item.entity === question.entity || identities.has(item.entity)) continue
    identities.add(item.entity)
    candidates.push(item)
  }
  const related = candidates.filter((item) => item.region === question.region
    || Math.abs(item.periodStartYear - question.periodStartYear) <= 120)
  const distractors = distinctEntities(seededShuffle(related, `${seed}:nearby`)).slice(0, 3)
  if (distractors.length < 3) {
    const used = new Set(distractors.map((item) => item.entity))
    for (const item of seededShuffle(candidates, `${seed}:fill`)) {
      if (!used.has(item.entity)) {
        distractors.push(item)
        used.add(item.entity)
      }
      if (distractors.length === 3) break
    }
  }
  return seededShuffle([question, ...distractors], `${seed}:order`)
}

function distinctEntities(items: readonly HistoricalFlagEntry[]): HistoricalFlagEntry[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.entity)) return false
    seen.add(item.entity)
    return true
  })
}
