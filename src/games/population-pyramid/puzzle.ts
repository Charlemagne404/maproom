import { seededRandom, seededShuffle } from '../../puzzles/engine'
import type { PopulationAgeProfile } from './data'

export const POPULATION_PYRAMID_ROUND_GAPS = [
  { minimum: 8, maximum: 18 },
  { minimum: 6, maximum: 14 },
  { minimum: 4, maximum: 10 },
  { minimum: 2.5, maximum: 7 },
  { minimum: 1, maximum: 4 },
] as const

export const POPULATION_PYRAMID_ROUNDS = POPULATION_PYRAMID_ROUND_GAPS.length
export const POINTS_PER_PAIR = 100

export interface PopulationPyramidQuestion {
  profiles: PopulationAgeProfile[]
  startingOrder: string[]
  minimumGap: number
  maximumGap: number
}

export interface PopulationPyramidScore {
  correctPairs: number
  totalPairs: 3
  exact: boolean
  score: number
}

export function createPopulationPyramidDeck(
  sourceProfiles: PopulationAgeProfile[],
  seed: string,
  setIndex = 0,
): PopulationPyramidQuestion[] {
  const profiles = [...sourceProfiles].sort((left, right) => left.age65Plus - right.age65Plus || left.iso3.localeCompare(right.iso3))
  const selectedCodes = new Set<string>()
  const deck: PopulationPyramidQuestion[] = []

  for (const [roundIndex, gap] of POPULATION_PYRAMID_ROUND_GAPS.entries()) {
    const available = profiles.filter((profile) => !selectedCodes.has(profile.iso3))
    const candidates: PopulationAgeProfile[][] = []
    for (let first = 0; first < available.length - 2; first += 1) {
      for (let second = first + 1; second < available.length - 1; second += 1) {
        const lowerGap = available[second]!.age65Plus - available[first]!.age65Plus
        if (lowerGap < gap.minimum || lowerGap > gap.maximum) continue
        for (let third = second + 1; third < available.length; third += 1) {
          const upperGap = available[third]!.age65Plus - available[second]!.age65Plus
          if (upperGap >= gap.minimum && upperGap <= gap.maximum) {
            candidates.push([available[first]!, available[second]!, available[third]!])
          }
        }
      }
    }
    if (!candidates.length) throw new Error(`No population profiles fit round ${roundIndex + 1} spacing.`)

    const random = seededRandom(`${seed}:population-pyramid:v1:${setIndex}:${roundIndex}`)
    const selected = candidates[Math.floor(random() * candidates.length)]!
    selected.forEach((profile) => selectedCodes.add(profile.iso3))
    let startingOrder = seededShuffle(selected.map(({ iso3 }) => iso3), `${seed}:population-pyramid:start:${setIndex}:${roundIndex}`)
    if (startingOrder.every((code, index) => code === selected[index]!.iso3)) {
      startingOrder = [startingOrder[1]!, startingOrder[2]!, startingOrder[0]!]
    }
    deck.push({ profiles: selected, startingOrder, minimumGap: gap.minimum, maximumGap: gap.maximum })
  }
  return deck
}

export function scorePopulationPyramidOrder(answer: string[], trueOrder: string[]): PopulationPyramidScore {
  if (answer.length !== 3 || trueOrder.length !== 3 || new Set(answer).size !== 3 || new Set(trueOrder).size !== 3
    || answer.some((code) => !trueOrder.includes(code))) {
    throw new Error('An ordering score needs the same three distinct profiles.')
  }
  const correctRank = new Map(trueOrder.map((code, index) => [code, index]))
  let correctPairs = 0
  for (let first = 0; first < answer.length - 1; first += 1) {
    for (let second = first + 1; second < answer.length; second += 1) {
      if (correctRank.get(answer[first]!)! < correctRank.get(answer[second]!)!) correctPairs += 1
    }
  }
  return {
    correctPairs,
    totalPairs: 3,
    exact: correctPairs === 3,
    score: correctPairs * POINTS_PER_PAIR,
  }
}
