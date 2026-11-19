import { seededShuffle } from './engine'

export const PROJECTION_IDS = ['equal-earth', 'mercator', 'equirectangular', 'orthographic'] as const
export type ProjectionId = typeof PROJECTION_IDS[number]

export interface ProjectionQuestion {
  id: ProjectionId
  prompt: string
  explanation: string
}

export const PROJECTION_DETAILS: Record<ProjectionId, { name: string; shortName: string }> = {
  'equal-earth': { name: 'Equal Earth', shortName: 'Equal Earth' },
  mercator: { name: 'Mercator', shortName: 'Mercator' },
  equirectangular: { name: 'Equirectangular', shortName: 'Equirectangular' },
  orthographic: { name: 'Orthographic', shortName: 'Orthographic' },
}

const QUESTIONS: Record<ProjectionId, ProjectionQuestion> = {
  'equal-earth': {
    id: 'equal-earth',
    prompt: 'A thematic world map needs countries to keep their true relative areas.',
    explanation: 'Equal Earth preserves relative area. It still distorts shapes, directions and distances.',
  },
  mercator: {
    id: 'mercator',
    prompt: 'A constant-heading course should appear as a straight line, even though it may not be the shortest route.',
    explanation: 'Mercator draws constant-bearing routes (rhumb lines) as straight lines. They are usually longer than the shortest great-circle path, and high-latitude areas look much larger.',
  },
  equirectangular: {
    id: 'equirectangular',
    prompt: 'A simple coordinate backdrop needs straight, evenly spaced latitude and longitude lines.',
    explanation: 'Equirectangular places latitude and longitude on evenly spaced straight lines. This makes coordinates simple to plot, while shapes and distances stretch toward the poles.',
  },
  orthographic: {
    id: 'orthographic',
    prompt: 'Show Earth’s near side in one globe-like view and let the far side disappear.',
    explanation: 'Orthographic gives a perspective view of the visible hemisphere and hides the far side. It distorts shape and area, especially toward the edge.',
  },
}

export function createProjectionDeck(seed: string, setIndex = 0): ProjectionQuestion[] {
  return seededShuffle(PROJECTION_IDS.map((id) => QUESTIONS[id]), `projection-match:deck:v1:${seed}:${setIndex}`)
}

export function isProjectionId(value: unknown): value is ProjectionId {
  return typeof value === 'string' && PROJECTION_IDS.includes(value as ProjectionId)
}

export function projectionAnswerIsCorrect(answer: ProjectionId, question: ProjectionQuestion): boolean {
  return answer === question.id
}
