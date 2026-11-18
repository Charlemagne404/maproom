import { describe, expect, it } from 'vitest'
import { formatCoordinate, formatCoordinates } from './coordinates'

describe('coordinate formatting', () => {
  it('uses hemisphere labels and preserves the requested precision', () => {
    expect(formatCoordinate(-8.05, 'latitude', 2)).toBe('8.05° S')
    expect(formatCoordinate(-34.88, 'longitude', 2)).toBe('34.88° W')
    expect(formatCoordinates({ lat: 5.93, lon: -0.99 }, 2)).toBe('5.93° N, 0.99° W')
  })

  it('labels the equator and prime meridian as north and east', () => {
    expect(formatCoordinates({ lat: 0, lon: 0 }, 1)).toBe('0.0° N, 0.0° E')
  })
})
