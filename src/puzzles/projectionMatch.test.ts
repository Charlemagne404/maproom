import { describe, expect, it } from 'vitest'
import { geoEqualEarth, geoEquirectangular, geoMercator, geoOrthographic, geoRotation } from 'd3-geo'
import { createConstantHeadingCourse, createProjectionDeck, PROJECTION_DETAILS, PROJECTION_IDS, PROJECTION_MAP_ROTATION, projectionAnswerIsCorrect } from './projectionMatch'

describe('Map Projection Match', () => {
  it('creates a repeatable four-task deck with each projection represented once', () => {
    const first = createProjectionDeck('projection-seed')
    expect(createProjectionDeck('projection-seed')).toEqual(first)
    expect(first.map((question) => question.id).sort()).toEqual([...PROJECTION_IDS].sort())
    expect(first.every((question) => question.prompt.length > 0 && question.explanation.length > 0)).toBe(true)
  })

  it('provides a distinct nonvisual description for every map option', () => {
    const descriptions = PROJECTION_IDS.map((id) => PROJECTION_DETAILS[id].visualDescription)
    expect(descriptions.every((description) => description.length > 40)).toBe(true)
    expect(new Set(descriptions).size).toBe(PROJECTION_IDS.length)
    expect(descriptions.join(' ').toLowerCase()).toContain('meridians')
    expect(descriptions.join(' ').toLowerCase()).toContain('hemisphere')
  })

  it('changes task order between replay sets and checks projection answers exactly', () => {
    expect(createProjectionDeck('projection-seed', 0)).not.toEqual(createProjectionDeck('projection-seed', 1))
    const equalArea = createProjectionDeck('projection-seed').find((question) => question.id === 'equal-earth')!
    expect(projectionAnswerIsCorrect('equal-earth', equalArea)).toBe(true)
    expect(projectionAnswerIsCorrect('mercator', equalArea)).toBe(false)
  })

  it('plots the same constant-heading course straight only on Mercator', () => {
    const courseInMapGrid = createConstantHeadingCourse()
    const rotation = geoRotation(PROJECTION_MAP_ROTATION)
    const courseOnEarth = courseInMapGrid.map((coordinate) => rotation.invert(coordinate))
    const mercator = geoMercator().rotate(PROJECTION_MAP_ROTATION)
    const otherProjections = [
      geoEqualEarth().rotate(PROJECTION_MAP_ROTATION),
      geoEquirectangular().rotate(PROJECTION_MAP_ROTATION),
      geoOrthographic().rotate(PROJECTION_MAP_ROTATION).clipAngle(90),
    ]
    const mercatorPoints = courseOnEarth.map((coordinate) => mercator(coordinate)!)

    expect(courseInMapGrid).toHaveLength(65)
    expect(courseInMapGrid[0]).toEqual([-42, 18])
    expect(courseInMapGrid.at(-1)?.[0]).toBe(52)
    expect(maxDistanceFromChord(mercatorPoints)).toBeLessThan(1e-8)
    for (const projection of otherProjections) {
      const points = courseOnEarth.map((coordinate) => projection(coordinate)!)
      expect(maxDistanceFromChord(points)).toBeGreaterThan(1)
    }
  })
})

function maxDistanceFromChord(points: Array<[number, number]>): number {
  const start = points[0]!
  const end = points.at(-1)!
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const length = Math.hypot(dx, dy)
  return Math.max(...points.map(([x, y]) => Math.abs(dy * x - dx * y + end[0] * start[1] - end[1] * start[0]) / length))
}
