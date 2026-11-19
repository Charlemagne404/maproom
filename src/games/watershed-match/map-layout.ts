import { geoAlbersUsa, geoPath } from 'd3-geo'
import type { WatershedMatchData, WatershedUnitProperties } from './data'
import type { WatershedQuestion } from './puzzle'

export const WATERSHED_MAP_WIDTH = 760
export const WATERSHED_MAP_HEIGHT = 400
export const WATERSHED_MARKER_MIN_SPACING = 38
export const WATERSHED_MARKER_SAFE_INSET = 20

const MARKER_BOUNDS = {
  left: WATERSHED_MARKER_SAFE_INSET,
  right: WATERSHED_MAP_WIDTH - WATERSHED_MARKER_SAFE_INSET,
  top: WATERSHED_MARKER_SAFE_INSET,
  bottom: WATERSHED_MAP_HEIGHT - WATERSHED_MARKER_SAFE_INSET,
}

const MARKER_RINGS = [38, 54, 70, 88]
const MARKER_ANGLES = Array.from({ length: 16 }, (_, index) => (index * Math.PI) / 8)

export interface WatershedMapShape {
  id: string
  name: string
  path: string
  x: number
  y: number
  markerX: number
  markerY: number
  optionIndex: number
}

interface MapPoint {
  x: number
  y: number
}

export function makeWatershedMapShapes(data: WatershedMatchData, question: WatershedQuestion): WatershedMapShape[] {
  const source = data.unitsById.get(question.sourceId)
  const choices = question.choices.map((id) => data.unitsById.get(id))
  if (!source || choices.some((feature) => !feature)) return []

  const features = [source, ...choices] as GeoJSON.Feature<GeoJSON.Geometry, WatershedUnitProperties>[]
  const collection: GeoJSON.FeatureCollection<GeoJSON.Geometry, WatershedUnitProperties> = { type: 'FeatureCollection', features }
  const projection = geoAlbersUsa().fitExtent([[24, 22], [WATERSHED_MAP_WIDTH - 24, WATERSHED_MAP_HEIGHT - 22]], collection)
  const path = geoPath(projection)
  const shapes = features.map((feature, index) => {
    const [x, y] = path.centroid(feature)
    const centerX = Number.isFinite(x) ? x : WATERSHED_MAP_WIDTH / 2
    const centerY = Number.isFinite(y) ? y : WATERSHED_MAP_HEIGHT / 2
    return {
      id: feature.properties.huc12,
      name: feature.properties.name,
      path: path(feature) ?? '',
      x: centerX,
      y: centerY,
      markerX: centerX,
      markerY: centerY,
      optionIndex: index - 1,
    }
  })

  return layoutWatershedMarkers(shapes)
}

/** Moves nearby callout markers apart while keeping each one close to its polygon centroid. */
export function layoutWatershedMarkers<T extends MapPoint>(points: readonly T[]): Array<T & { markerX: number; markerY: number }> {
  const placed: MapPoint[] = []

  return points.map((point) => {
    const candidates = createMarkerCandidates(point)
    const available = candidates.filter((candidate) => isSpaced(candidate, placed))
    const selected = available[0] ?? candidates.reduce((best, candidate) => {
      const candidateClearance = minimumDistance(candidate, placed)
      const bestClearance = minimumDistance(best, placed)
      return candidateClearance > bestClearance ? candidate : best
    })
    placed.push(selected)
    return { ...point, markerX: selected.x, markerY: selected.y }
  })
}

function createMarkerCandidates(point: MapPoint): MapPoint[] {
  const candidates = [clampToBounds(point)]
  for (const radius of MARKER_RINGS) {
    for (const angle of MARKER_ANGLES) {
      candidates.push(clampToBounds({
        x: point.x + Math.cos(angle) * radius,
        y: point.y + Math.sin(angle) * radius,
      }))
    }
  }

  const seen = new Set<string>()
  return candidates
    .filter((candidate) => {
      const key = `${candidate.x.toFixed(1)}:${candidate.y.toFixed(1)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => distance(left, point) - distance(right, point))
}

function clampToBounds(point: MapPoint): MapPoint {
  return {
    x: Math.max(MARKER_BOUNDS.left, Math.min(MARKER_BOUNDS.right, point.x)),
    y: Math.max(MARKER_BOUNDS.top, Math.min(MARKER_BOUNDS.bottom, point.y)),
  }
}

function isSpaced(candidate: MapPoint, placed: readonly MapPoint[]): boolean {
  return placed.every((point) => distance(candidate, point) >= WATERSHED_MARKER_MIN_SPACING)
}

function minimumDistance(candidate: MapPoint, placed: readonly MapPoint[]): number {
  return placed.length ? Math.min(...placed.map((point) => distance(candidate, point))) : Infinity
}

function distance(left: MapPoint, right: MapPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}
