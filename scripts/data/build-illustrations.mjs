import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { geoEqualEarth, geoPath } from 'd3-geo'

const root = new URL('../../', import.meta.url)
const source = new URL('public/data/countries.geojson', root)
const output = new URL('public/illustrations/', root)
const data = JSON.parse(await readFile(source, 'utf8'))
const features = data.features.filter((feature) => feature.geometry && feature.properties?.iso3)

await mkdir(output, { recursive: true })

const worldWidth = 960
const worldHeight = 440
const worldProjection = geoEqualEarth().fitExtent([[18, 18], [worldWidth - 18, worldHeight - 18]], {
  type: 'FeatureCollection',
  features,
})
const worldPath = geoPath(worldProjection).digits(0)
const worldShapes = features.map((feature) => {
  const geometry = simplifyGeometry(feature.geometry, worldProjection, 1.25)
  const simplified = { ...feature, geometry }
  const d = worldPath(simplified)
  if (!d) return ''
  const active = feature.properties.iso3 === 'JPN'
  return `<path d="${d}" fill="${active ? '#E57937' : '#E5D6C4'}" stroke="#292622" stroke-width="1.25" stroke-linejoin="round"/>`
}).join('\n')

await writeFile(new URL('world-map.svg', output), `<!-- Generated from the bundled Natural Earth country GeoJSON. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${worldWidth} ${worldHeight}" role="img" aria-label="World map illustration"><g>${worldShapes}</g></svg>\n`)

const madagascar = features.filter((feature) => feature.properties.iso3 === 'MDG')
if (madagascar.length === 0) throw new Error('Natural Earth data does not include Madagascar.')
const outlineWidth = 420
const outlineHeight = 500
const outlineProjection = geoEqualEarth().fitExtent([[42, 24], [outlineWidth - 42, outlineHeight - 24]], {
  type: 'FeatureCollection',
  features: madagascar,
})
const outlinePath = geoPath(outlineProjection)
const outlineShapes = madagascar.map((feature) => {
  const d = outlinePath(feature)
  return d ? `<path d="${d}" fill="#292622" stroke="#292622" stroke-width="2" stroke-linejoin="round"/>` : ''
}).join('\n')

await writeFile(new URL('outline-madagascar.svg', output), `<!-- Generated from the bundled Natural Earth country GeoJSON. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outlineWidth} ${outlineHeight}" role="img" aria-label="Country outline illustration"><g>${outlineShapes}</g></svg>\n`)

const darkOutlineShapes = madagascar.map((feature) => {
  const d = outlinePath(feature)
  return d ? `<path d="${d}" fill="#c6b49e" stroke="#f2e7d9" stroke-width="2" stroke-linejoin="round"/>` : ''
}).join('\n')

await writeFile(new URL('outline-madagascar-dark.svg', output), `<!-- Generated from the bundled Natural Earth country GeoJSON. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outlineWidth} ${outlineHeight}" role="img" aria-label="Country outline illustration"><g>${darkOutlineShapes}</g></svg>\n`)

function simplifyGeometry(geometry, projection, tolerance) {
  const line = (coordinates, closed = false) => {
    if (coordinates.length < (closed ? 5 : 3)) return coordinates
    if (!closed) return simplifyOpenLine(coordinates, projection, tolerance)

    const ring = coordinates.slice(0, -1)
    let split = 1
    let farthest = -1
    const origin = projected(ring[0], projection)
    for (let index = 1; index < ring.length; index += 1) {
      const point = projected(ring[index], projection)
      const distance = (point[0] - origin[0]) ** 2 + (point[1] - origin[1]) ** 2
      if (distance > farthest) { farthest = distance; split = index }
    }
    const first = simplifyOpenLine(ring.slice(0, split + 1), projection, tolerance)
    const second = simplifyOpenLine([...ring.slice(split), ring[0]], projection, tolerance)
    const result = [...first.slice(0, -1), ...second]
    return result.length >= 4 ? result : coordinates
  }

  switch (geometry.type) {
    case 'Polygon': return { ...geometry, coordinates: geometry.coordinates.map((ring) => line(ring, true)) }
    case 'MultiPolygon': return { ...geometry, coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => line(ring, true))) }
    case 'LineString': return { ...geometry, coordinates: line(geometry.coordinates) }
    case 'MultiLineString': return { ...geometry, coordinates: geometry.coordinates.map((coordinates) => line(coordinates)) }
    case 'GeometryCollection': return { ...geometry, geometries: geometry.geometries.map((item) => simplifyGeometry(item, projection, tolerance)) }
    default: return geometry
  }
}

function simplifyOpenLine(coordinates, projection, tolerance) {
  if (coordinates.length < 3) return coordinates
  const points = coordinates.map((coordinate) => projected(coordinate, projection))
  const keep = new Uint8Array(coordinates.length)
  keep[0] = 1
  keep[coordinates.length - 1] = 1
  const stack = [[0, coordinates.length - 1]]
  const threshold = tolerance * tolerance
  while (stack.length) {
    const [start, end] = stack.pop()
    let maximum = threshold
    let selected = -1
    for (let index = start + 1; index < end; index += 1) {
      const distance = segmentDistanceSquared(points[index], points[start], points[end])
      if (distance > maximum) { maximum = distance; selected = index }
    }
    if (selected >= 0) {
      keep[selected] = 1
      stack.push([start, selected], [selected, end])
    }
  }
  return coordinates.filter((_, index) => keep[index] === 1)
}

function projected(coordinate, projection) {
  return projection(coordinate) ?? [0, 0]
}

function segmentDistanceSquared(point, start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
  const x = start[0] + t * dx
  const y = start[1] + t * dy
  return (point[0] - x) ** 2 + (point[1] - y) ** 2
}
