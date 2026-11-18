import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { geoArea, geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo'

const root = path.resolve(import.meta.dirname, '../../..')
const inputPath = path.resolve(root, process.argv[2] ?? '.data/historical/CShapes-2.1.geojson')
const seedPath = path.join(root, 'docs/data/historical/map-seeds.json')
const outputDirectory = path.join(root, 'public/data/historical/maps')
const manifestPath = path.join(root, 'public/data/historical/manifest.json')
const sourceUrl = 'https://icr.ethz.ch/data/cshapes/CShapes-2.1.geojson'
const sourcePage = 'https://icr.ethz.ch/data/cshapes/beta.html'
const licenseUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
const sourceTitle = 'CShapes 2.1'
const attribution = 'CShapes 2.1 data by Schvitz, Rüegger, Girardin, Cederman, Weidmann and Gleditsch, ETH Zürich; CC BY-NC-SA 4.0. Maproom-generated snapshot.'
const dateCaveat = 'The depicted year is a 31 December snapshot selected from CShapes start/end year, month and day fields. CShapes documents that some event dates are not exact and may use first-of-month or first-of-year defaults. This generated visualization has no original publication year.'

const inputBytes = await readFile(inputPath)
const collection = JSON.parse(inputBytes.toString('utf8'))
const seeds = JSON.parse(await readFile(seedPath, 'utf8'))
if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Input must be a GeoJSON FeatureCollection.')
if (!Array.isArray(seeds) || seeds.length < 20) throw new Error('At least 20 curated map years are required.')

await mkdir(outputDirectory, { recursive: true })
const maps = []
const renderedSignatures = new Set()

for (const [index, seed] of seeds.entries()) {
  const year = Number(seed.year)
  if (!Number.isInteger(year) || year < 1886 || year > 2023 || typeof seed.context !== 'string' || !Array.isArray(seed.contextSources)) {
    throw new Error(`Invalid curated map record at index ${index}.`)
  }
  const snapshot = `${year}-12-31`
  const activeFeatures = collection.features.filter(({ properties }) => {
    const starts = numericDate(properties, 'gws')
    const ends = numericDate(properties, 'gwe')
    return starts <= snapshot && ends >= snapshot
  })
  if (activeFeatures.length < 100) throw new Error(`Expected a global snapshot for ${snapshot}; found ${activeFeatures.length} features.`)

  const mapFeatureCollection = { type: 'FeatureCollection', features: activeFeatures }
  const projection = geoEqualEarth().fitExtent([[28, 34], [972, 562]], mapFeatureCollection).precision(0.85)
  const pathFor = geoPath(projection).digits(1)
  const graticulePath = pathFor(geoGraticule10())
  const polygonPaths = activeFeatures.map((feature) => {
    const displayFeature = simplifyFeature(orientFeatureForD3(feature), projection, 0.65)
    const d = pathFor(displayFeature)
    if (!d) return ''
    const properties = feature.properties
    const ruler = Number(properties.status === 'independent' ? properties.gwcode : properties.ruledby)
    const color = territoryColor(Number.isFinite(ruler) ? ruler : Number(properties.gwcode), properties.status)
    const dash = properties.status === 'occupied' ? ' stroke-dasharray="1.5 1.2"' : ''
    return `<path d="${d}" fill="${color}" stroke="#fffaf2" stroke-width="0.65" stroke-linejoin="round"${dash}/>`
  }).filter(Boolean)
  const svg = renderSvg(polygonPaths.join(''), graticulePath)
  const assetHash = sha256(svg)
  if (renderedSignatures.has(assetHash)) throw new Error(`The ${year} snapshot duplicates another curated map.`)
  renderedSignatures.add(assetHash)

  const id = `historical-map-${String(index + 1).padStart(2, '0')}`
  const assetUrl = `/data/historical/maps/${id}.svg`
  await writeFile(path.join(root, 'public', assetUrl.slice(1)), svg)
  maps.push({
    id,
    depictedYear: year,
    depictedDate: snapshot,
    mapPublishedYear: null,
    assetUrl,
    assetSha256: assetHash,
    originalMapUrl: null,
    source: {
      title: sourceTitle,
      originalUrl: sourceUrl,
      releasePageUrl: sourcePage,
      institution: 'ETH Zürich, Center for Comparative and International Studies',
      authors: ['Guy Schvitz', 'Seraina Rüegger', 'Luc Girardin', 'Lars-Erik Cederman', 'Nils B. Weidmann', 'Kristian Skrede Gleditsch'],
      license: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',
      licenseUrl,
      attribution,
      adaptationTerms: 'Non-commercial reuse only; adaptations must be shared under the same license with attribution.'
    },
    geographicContext: 'Global political units and dependent territories; international boundaries only, with no subnational divisions.',
    historicalContext: seed.context,
    contextSources: seed.contextSources,
    datingUncertainty: dateCaveat,
    sourceFeatureCount: activeFeatures.length,
  })
}

const manifest = {
  schemaVersion: 1,
  dataset: {
    title: sourceTitle,
    originalUrl: sourceUrl,
    releasePageUrl: sourcePage,
    dataSha256: sha256(inputBytes),
    sourceDataDateRange: '1886–2023',
    license: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',
    licenseUrl,
  },
  snapshotConvention: 'Every asset is a global political-boundary snapshot as of 31 December of its depicted year. It is a Maproom-generated data visualization, not a map published in that year.',
  maps,
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${maps.length} distinct snapshots from ${sourceTitle} (${sha256(inputBytes).slice(0, 12)}…).`)

function numericDate(properties, prefix) {
  const year = Number(properties[`${prefix}year`])
  const month = Number(properties[`${prefix}month`])
  const day = Number(properties[`${prefix}day`])
  if (![year, month, day].every(Number.isInteger)) throw new Error(`Missing ${prefix} date fields in CShapes feature.`)
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function territoryColor(code, status) {
  const hue = ((Math.abs(code) * 137.508) % 360).toFixed(1)
  const saturation = status === 'independent' ? '37%' : '29%'
  const lightness = status === 'independent' ? '76%' : '83%'
  return `hsl(${hue} ${saturation} ${lightness})`
}

function orientFeatureForD3(feature) {
  const geometry = feature.geometry
  if (geometry.type === 'Polygon') return { ...feature, geometry: { ...geometry, coordinates: orientPolygon(geometry.coordinates) } }
  if (geometry.type === 'MultiPolygon') return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map(orientPolygon) } }
  return feature
}

function orientPolygon(rings) {
  return rings.map((ring, index) => orientRing(ring, index > 0))
}

function orientRing(ring, isHole) {
  const asPolygon = { type: 'Polygon', coordinates: [ring] }
  const reversedRing = [...ring].reverse()
  const reversed = { type: 'Polygon', coordinates: [reversedRing] }
  const smallerShell = geoArea(asPolygon) <= geoArea(reversed) ? ring : reversedRing
  return isHole ? [...smallerShell].reverse() : smallerShell
}

function simplifyFeature(feature, projection, tolerance) {
  const geometry = feature.geometry
  if (geometry.type === 'Polygon') return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, projection, tolerance)) } }
  if (geometry.type === 'MultiPolygon') return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => simplifyRing(ring, projection, tolerance))) } }
  return feature
}

function simplifyRing(ring, projection, tolerance) {
  if (ring.length < 5) return ring
  if (ring.some((coordinate, index) => index > 0 && Math.abs(coordinate[0] - ring[index - 1][0]) > 180)) return ring
  const open = ring.slice(0, -1)
  let split = 1
  let greatestDistance = -1
  const first = project(projection, open[0])
  for (let index = 1; index < open.length; index += 1) {
    const point = project(projection, open[index])
    const distance = (point[0] - first[0]) ** 2 + (point[1] - first[1]) ** 2
    if (distance > greatestDistance) {
      greatestDistance = distance
      split = index
    }
  }
  const firstArc = simplifyLine(open.slice(0, split + 1), projection, tolerance)
  const secondArc = simplifyLine([...open.slice(split), open[0]], projection, tolerance)
  const simplified = [...firstArc.slice(0, -1), ...secondArc]
  if (simplified.length < 4) return ring
  const originalArea = geoArea({ type: 'Polygon', coordinates: [ring] })
  const simplifiedArea = geoArea({ type: 'Polygon', coordinates: [simplified] })
  if ((originalArea > Math.PI * 2) !== (simplifiedArea > Math.PI * 2)) return ring
  return simplified
}

function simplifyLine(points, projection, tolerance) {
  if (points.length <= 2) return points
  const keep = new Set([0, points.length - 1])
  const stack = [[0, points.length - 1]]
  const toleranceSquared = tolerance * tolerance
  while (stack.length) {
    const [start, end] = stack.pop()
    const first = project(projection, points[start])
    const last = project(projection, points[end])
    let farthestIndex = -1
    let farthestDistance = toleranceSquared
    for (let index = start + 1; index < end; index += 1) {
      const distance = segmentDistanceSquared(project(projection, points[index]), first, last)
      if (distance > farthestDistance) {
        farthestDistance = distance
        farthestIndex = index
      }
    }
    if (farthestIndex >= 0) {
      keep.add(farthestIndex)
      stack.push([start, farthestIndex], [farthestIndex, end])
    }
  }
  return [...keep].sort((left, right) => left - right).map((index) => points[index])
}

function project(projection, coordinate) {
  return projection(coordinate) ?? [0, 0]
}

function segmentDistanceSquared(point, start, end) {
  const deltaX = end[0] - start[0]
  const deltaY = end[1] - start[1]
  if (deltaX === 0 && deltaY === 0) return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
  const ratio = Math.max(0, Math.min(1, ((point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaY) / (deltaX ** 2 + deltaY ** 2)))
  const projectedX = start[0] + ratio * deltaX
  const projectedY = start[1] + ratio * deltaY
  return (point[0] - projectedX) ** 2 + (point[1] - projectedY) ** 2
}

function renderSvg(polygons, graticule) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" role="img" aria-labelledby="map-title map-description">
<!-- Derived from CShapes 2.1 by Maproom. ${attribution} Source: ${sourceUrl} License: ${licenseUrl} -->
<title id="map-title">World political map</title>
<desc id="map-description">A global political-boundary snapshot with independent states, territories and a ten-degree graticule.</desc>
<rect width="1000" height="600" rx="13" fill="#eee6d8"/>
<rect x="13" y="13" width="974" height="574" rx="8" fill="#f7f1e7" stroke="#cfc4b4" stroke-width="1"/>
<path d="${graticule}" fill="none" stroke="#d8d0c3" stroke-width="0.55"/>
<g>${polygons}</g>
<path d="M27 575H973" stroke="#d9d0c3" stroke-width="1"/>
<text x="34" y="568" fill="#777164" font-family="system-ui, sans-serif" font-size="9" letter-spacing="1.35">WORLD POLITICAL BOUNDARIES</text>
<text x="966" y="568" fill="#777164" font-family="system-ui, sans-serif" font-size="9" text-anchor="end" letter-spacing="1.15">EQUAL EARTH PROJECTION</text>
</svg>\n`
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}
