import { geoArea } from 'd3-geo'

export function normalizeRegionFeature(region: GeoJSON.Feature): GeoJSON.Feature {
  const name = region.properties?.name
  const correctedName = typeof name === 'string' ? repairMojibake(name) : name
  const normalized = correctedName && correctedName !== name
    ? { ...region, properties: { ...region.properties, name: correctedName } }
    : region
  const geometry = normalized.geometry
  // geoBoundaries rings can use RFC 7946 winding, which d3-geo reads as the globe's complement.
  if (geometry.type === 'Polygon') {
    const polygon = geometry.coordinates
    if (geoArea({ type: 'Polygon', coordinates: polygon }) <= Math.PI * 2) return normalized
    return { ...normalized, geometry: { ...geometry, coordinates: reverseRings(polygon) } }
  }
  if (geometry.type === 'MultiPolygon') {
    let changed = false
    const polygons = geometry.coordinates.map((polygon) => {
      if (geoArea({ type: 'Polygon', coordinates: polygon }) <= Math.PI * 2) return polygon
      changed = true
      return reverseRings(polygon)
    })
    return changed ? { ...normalized, geometry: { ...geometry, coordinates: polygons } } : normalized
  }
  return normalized
}

function reverseRings(rings: GeoJSON.Position[][]): GeoJSON.Position[][] {
  return rings.map((ring) => [...ring].reverse())
}

function repairMojibake(value: string): string {
  if (!/[ÃÂ]/u.test(value)) return value
  const codePoints = [...value].map((character) => character.codePointAt(0)!)
  if (codePoints.some((codePoint) => codePoint > 0xff)) return value
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(codePoints))
    return /[ÃÂ�]/u.test(decoded) ? value : decoded
  } catch {
    return value
  }
}
