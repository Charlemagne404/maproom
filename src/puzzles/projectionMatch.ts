import { seededShuffle } from './engine'

export const PROJECTION_IDS = ['equal-earth', 'mercator', 'equirectangular', 'orthographic'] as const
export type ProjectionId = typeof PROJECTION_IDS[number]

export const PROJECTION_MAP_ROTATION: [number, number] = [-12, -4]
const COURSE_START: [number, number] = [-42, 18]
const COURSE_END: [number, number] = [52, 65]

/** Sample one constant-heading course in the map's rotated longitude/latitude grid. */
export function createConstantHeadingCourse(): [number, number][] {
  const count = 64
  const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360))
  const startY = mercatorY(COURSE_START[1])
  const endY = mercatorY(COURSE_END[1])

  return Array.from({ length: count + 1 }, (_, index) => {
    const fraction = index / count
    const y = startY + (endY - startY) * fraction
    const latitude = (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI
    const longitude = COURSE_START[0] + (COURSE_END[0] - COURSE_START[0]) * fraction
    return [longitude, latitude]
  })
}

export interface ProjectionQuestion {
  id: ProjectionId
  prompt: string
  explanation: string
}

export const PROJECTION_DETAILS: Record<ProjectionId, { name: string; shortName: string; visualDescription: string }> = {
  'equal-earth': {
    name: 'Equal Earth',
    shortName: 'Equal Earth',
    visualDescription: 'Oval world map with curved meridians and straight parallels.',
  },
  mercator: {
    name: 'Mercator',
    shortName: 'Mercator',
    visualDescription: 'Rectangular world map with straight meridians and parallels; the latitude lines get farther apart toward the poles.',
  },
  equirectangular: {
    name: 'Equirectangular',
    shortName: 'Equirectangular',
    visualDescription: 'Rectangular world map with straight, evenly spaced meridians and parallels; land stretches sideways toward the poles.',
  },
  orthographic: {
    name: 'Orthographic',
    shortName: 'Orthographic',
    visualDescription: 'Round, globe-like view of one hemisphere, with distant regions cut off at the edge.',
  },
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
