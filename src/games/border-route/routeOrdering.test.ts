import { describe, expect, it } from 'vitest'
import { findRouteOrdering } from '../../puzzles/engine'

describe('Border Route selected-country sets', () => {
  const adjacency = new Map([
    ['AAA', ['BBB']],
    ['BBB', ['AAA', 'CCC']],
    ['CCC', ['BBB', 'DDD']],
    ['DDD', ['CCC']],
    ['XXX', []],
  ])

  it('orders a reversed selection into a geographic path between the endpoints', () => {
    expect(findRouteOrdering('AAA', 'DDD', ['CCC', 'BBB'], adjacency)).toEqual(['AAA', 'BBB', 'CCC', 'DDD'])
  })

  it('rejects sets with an unusable country, duplicates, or an endpoint in the middle', () => {
    expect(findRouteOrdering('AAA', 'DDD', ['BBB'], adjacency)).toBeNull()
    expect(findRouteOrdering('AAA', 'DDD', ['CCC', 'XXX'], adjacency)).toBeNull()
    expect(findRouteOrdering('AAA', 'DDD', ['BBB', 'BBB'], adjacency)).toBeNull()
    expect(findRouteOrdering('AAA', 'DDD', ['BBB', 'DDD'], adjacency)).toBeNull()
  })
})
