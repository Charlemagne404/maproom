import { seededShuffle } from '../../puzzles/engine'
import type { WatershedQuestionData } from './data'

export const WATERSHED_MATCH_ROUNDS = 5
export const WATERSHED_POINTS_PER_QUESTION = 100

export interface WatershedQuestion extends WatershedQuestionData {
  choices: string[]
}

export function createWatershedMatchDeck(
  questions: readonly WatershedQuestionData[],
  seed: string,
  setIndex = 0,
): WatershedQuestion[] {
  const regionGroups = new Map<string, WatershedQuestionData[]>()
  for (const question of questions) {
    const region = question.region
    let group = regionGroups.get(region)
    if (!group) regionGroups.set(region, group = [])
    group.push(question)
  }
  if (questions.length < WATERSHED_MATCH_ROUNDS || regionGroups.size < 3) {
    throw new Error('Watershed Match needs five questions across at least three regions.')
  }

  const shuffled = seededShuffle(questions, `${seed}:watershed-match:questions:${setIndex}`)
  const shuffledByRegion = new Map([...regionGroups].map(([region, items]) => [
    region,
    seededShuffle(items, `${seed}:watershed-match:region:${setIndex}:${region}`),
  ]))
  const deckQuestions: WatershedQuestionData[] = []
  const usedIds = new Set<string>()
  const usedAnswers = new Set<string>()
  const addQuestion = (question: WatershedQuestionData | undefined) => {
    if (!question || usedIds.has(question.id) || usedAnswers.has(question.answerId)) return
    usedIds.add(question.id)
    usedAnswers.add(question.answerId)
    deckQuestions.push(question)
  }

  for (const region of seededShuffle([...shuffledByRegion.keys()], `${seed}:watershed-match:regions:${setIndex}`)) {
    addQuestion(shuffledByRegion.get(region)?.find((question) => !usedAnswers.has(question.answerId)))
    if (deckQuestions.length === WATERSHED_MATCH_ROUNDS) break
  }
  for (const question of shuffled) {
    if (deckQuestions.length === WATERSHED_MATCH_ROUNDS) break
    addQuestion(question)
  }
  if (deckQuestions.length < WATERSHED_MATCH_ROUNDS) {
    for (const question of shuffled) {
      if (deckQuestions.length === WATERSHED_MATCH_ROUNDS) break
      if (!usedIds.has(question.id)) {
        usedIds.add(question.id)
        deckQuestions.push(question)
      }
    }
  }

  const answerPositions = seededShuffle([0, 1, 2, 0, 1], `${seed}:watershed-match:answer-positions:${setIndex}`)
  return deckQuestions.map((question, index) => {
    const wrongChoices = seededShuffle(
      question.optionIds.filter((id) => id !== question.answerId),
      `${seed}:watershed-match:choices:${setIndex}:${question.id}`,
    )
    const choices: string[] = []
    let wrongIndex = 0
    for (let position = 0; position < 3; position += 1) {
      choices.push(position === answerPositions[index] ? question.answerId : wrongChoices[wrongIndex++]!)
    }
    return { ...question, choices }
  })
}

export function scoreWatershedMatchAnswer(question: WatershedQuestion, selectedId: string): 0 | 100 {
  return selectedId === question.answerId ? WATERSHED_POINTS_PER_QUESTION : 0
}
