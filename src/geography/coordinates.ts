import type { Coordinates } from './types'

export type CoordinateAxis = 'latitude' | 'longitude'

export function formatCoordinate(value: number, axis: CoordinateAxis, fractionDigits = 1): string {
  const hemisphere = axis === 'latitude'
    ? value < 0 ? 'S' : 'N'
    : value < 0 ? 'W' : 'E'
  return `${Math.abs(value).toFixed(fractionDigits)}° ${hemisphere}`
}

export function formatCoordinates(coordinates: Coordinates, fractionDigits = 1): string {
  return `${formatCoordinate(coordinates.lat, 'latitude', fractionDigits)}, ${formatCoordinate(coordinates.lon, 'longitude', fractionDigits)}`
}
