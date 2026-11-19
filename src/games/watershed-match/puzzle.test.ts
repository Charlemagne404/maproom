import { describe, expect, it } from 'vitest'
import rawDataText from '../../../public/data/watershed-match.json?raw'
import { parseWatershedMatchData } from './data'
import { makeWatershedMapShapes, WATERSHED_MAP_HEIGHT, WATERSHED_MAP_WIDTH, WATERSHED_MARKER_MIN_SPACING, WATERSHED_MARKER_SAFE_INSET } from './map-layout'
import { createWatershedMatchDeck, scoreWatershedMatchAnswer, WATERSHED_MATCH_ROUNDS } from './puzzle'

const rawData = JSON.parse(rawDataText) as {
  topology: { objects: { units: { geometries: Array<{ id: string; arcs: unknown }> } } }
  questions: Array<{ region: string; sourceId: string; answerId: string; optionIds: string[] }>
}
const data = parseWatershedMatchData(rawData)

describe('Watershed Match', () => {
  it('ships a valid curated pool with adjacent source and destination shapes', () => {
    expect(data.questions).toHaveLength(60)
    expect(data.units.features).toHaveLength(118)
    const geometries = new Map(rawData.topology.objects.units.geometries.map((geometry) => [geometry.id, arcIds(geometry.arcs)]))

    for (const question of data.questions) {
      const sourceArcs = geometries.get(question.sourceId)
      expect(sourceArcs).toBeDefined()
      for (const optionId of question.optionIds) {
        expect(shareArc(sourceArcs ?? new Set(), geometries.get(optionId) ?? new Set())).toBe(true)
      }
    }
  })

  it('keeps source and option markers separate across every map in the pilot pool', () => {
    let crowdedFrames = 0
    let movedMarkers = 0

    for (const questionData of data.questions) {
      const question = { ...questionData, choices: questionData.optionIds }
      const shapes = makeWatershedMapShapes(data, question)
      expect(shapes).toHaveLength(4)
      const originalPoints = shapes.map(({ x, y }) => ({ x, y }))
      if (hasCrowdedMarkers(originalPoints)) crowdedFrames += 1

      for (let index = 0; index < shapes.length; index += 1) {
        const shape = shapes[index]!
        if (Math.hypot(shape.markerX - shape.x, shape.markerY - shape.y) > 1) movedMarkers += 1
        expect(shape.markerX).toBeGreaterThanOrEqual(WATERSHED_MARKER_SAFE_INSET)
        expect(shape.markerX).toBeLessThanOrEqual(WATERSHED_MAP_WIDTH - WATERSHED_MARKER_SAFE_INSET)
        expect(shape.markerY).toBeGreaterThanOrEqual(WATERSHED_MARKER_SAFE_INSET)
        expect(shape.markerY).toBeLessThanOrEqual(WATERSHED_MAP_HEIGHT - WATERSHED_MARKER_SAFE_INSET)

        for (const other of shapes.slice(index + 1)) {
          expect(Math.hypot(shape.markerX - other.markerX, shape.markerY - other.markerY))
            .toBeGreaterThanOrEqual(WATERSHED_MARKER_MIN_SPACING - 0.01)
        }
      }
    }

    expect(crowdedFrames).toBeGreaterThan(0)
    expect(movedMarkers).toBeGreaterThan(0)
  })

  it('builds deterministic five-question sets across three US regions with balanced answer positions', () => {
    const first = createWatershedMatchDeck(data.questions, 'sample-seed')
    const repeated = createWatershedMatchDeck(data.questions, 'sample-seed')
    const next = createWatershedMatchDeck(data.questions, 'another-seed')

    expect(first).toEqual(repeated)
    expect(first).not.toEqual(next)
    expect(first).toHaveLength(WATERSHED_MATCH_ROUNDS)
    expect(new Set(first.map((question) => question.id)).size).toBe(WATERSHED_MATCH_ROUNDS)
    expect(new Set(first.map((question) => question.region)).size).toBe(3)

    const correctPositions = first.map((question) => question.choices.indexOf(question.answerId))
    expect(correctPositions.every((position) => position >= 0)).toBe(true)
    expect(Math.max(...[0, 1, 2].map((position) => correctPositions.filter((item) => item === position).length))
      - Math.min(...[0, 1, 2].map((position) => correctPositions.filter((item) => item === position).length))).toBe(1)
    for (const question of first) expect(new Set(question.choices).size).toBe(3)

    for (let setIndex = 0; setIndex < 50; setIndex += 1) {
      const deck = createWatershedMatchDeck(data.questions, 'many-seeds', setIndex)
      expect(new Set(deck.map((question) => question.region))).toEqual(new Set(data.regions))
      expect(deck).toHaveLength(WATERSHED_MATCH_ROUNDS)
    }
  })

  it('awards points only for the WBD downstream link', () => {
    const question = createWatershedMatchDeck(data.questions, 'score-seed')[0]!
    expect(scoreWatershedMatchAnswer(question, question.answerId)).toBe(100)
    expect(scoreWatershedMatchAnswer(question, question.choices.find((id) => id !== question.answerId)!)).toBe(0)
  })
})

function hasCrowdedMarkers(points: Array<{ x: number; y: number }>): boolean {
  return points.some((point, index) => points.slice(index + 1).some((other) =>
    Math.hypot(point.x - other.x, point.y - other.y) < WATERSHED_MARKER_MIN_SPACING))
}

function arcIds(arcs: unknown): Set<number> {
  const ids = new Set<number>()
  const visit = (value: unknown) => {
    if (typeof value === 'number') ids.add(value < 0 ? ~value : value)
    else if (Array.isArray(value)) for (const child of value) visit(child)
  }
  visit(arcs)
  return ids
}

function shareArc(left: Set<number>, right: Set<number>): boolean {
  for (const arc of left) if (right.has(arc)) return true
  return false
}
