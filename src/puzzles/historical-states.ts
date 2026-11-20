import type { HistoricalAtlasMap } from '../geography/historical/types'
import { historicalYearDistance } from './historical-geography'
import { seededShuffle } from './engine'

export type HistoricalStatesQuestionCount = '10' | 'all'

export function createHistoricalStatesDeck(maps: readonly HistoricalAtlasMap[], seed: string, round: number, count: HistoricalStatesQuestionCount): HistoricalAtlasMap[] {
  const questionCount = count === 'all' ? maps.length : Math.min(10, maps.length)
  const stableMaps = [...maps].sort((left, right) => left.id.localeCompare(right.id))
  return seededShuffle(stableMaps, `historical-states:v1:${seed}:${round}`).slice(0, questionCount)
}

export function historicalPolityName(map: HistoricalAtlasMap): string {
  return map.polities[0]?.name ?? 'Unidentified polity'
}

export function createHistoricalStateChoices(maps: readonly HistoricalAtlasMap[], question: HistoricalAtlasMap, seed: string): HistoricalAtlasMap[] {
  const identity = historicalPolityName(question)
  const candidatesByName = new Map<string, HistoricalAtlasMap[]>()
  for (const map of [...maps].sort((left, right) => left.id.localeCompare(right.id))) {
    const name = historicalPolityName(map)
    if (name !== identity) candidatesByName.set(name, [...(candidatesByName.get(name) ?? []), map])
  }
  const relationRank = (map: HistoricalAtlasMap) => map.region.id === question.region.id
    ? 0
    : historicalYearDistance(map.sampleYear, question.sampleYear) <= 250
      ? 1
      : historicalYearDistance(map.sampleYear, question.sampleYear) <= 1000 ? 2 : 3
  const candidates = [...candidatesByName.values()].map((group) => [...group].sort((left, right) =>
    relationRank(left) - relationRank(right)
    || historicalYearDistance(left.sampleYear, question.sampleYear) - historicalYearDistance(right.sampleYear, question.sampleYear)
    || left.id.localeCompare(right.id))[0]!)
  const related = candidates.filter((map) => relationRank(map) <= 1)
  const distractors = seededShuffle(related, `${seed}:nearby`).slice(0, 3)
  if (distractors.length < 3) {
    const used = new Set(distractors.map(historicalPolityName))
    for (const map of seededShuffle(candidates.filter((candidate) => relationRank(candidate) >= 2), `${seed}:fill`)) {
      if (!used.has(historicalPolityName(map))) {
        distractors.push(map)
        used.add(historicalPolityName(map))
      }
      if (distractors.length === 3) break
    }
  }
  if (distractors.length < 3) {
    const used = new Set(distractors.map(historicalPolityName))
    for (const map of seededShuffle(candidates, `${seed}:final-fill`)) {
      if (!used.has(historicalPolityName(map))) {
        distractors.push(map)
        used.add(historicalPolityName(map))
      }
      if (distractors.length === 3) break
    }
  }
  return seededShuffle([question, ...distractors], `${seed}:order`)
}
