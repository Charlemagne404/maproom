import { describe, expect, it } from 'vitest'
import { createProjectionDeck, PROJECTION_DETAILS, PROJECTION_IDS, projectionAnswerIsCorrect } from './projectionMatch'

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
})
