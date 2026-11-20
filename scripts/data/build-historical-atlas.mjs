import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoArea, geoEquirectangular, geoEqualEarth, geoGraticule, geoGraticule10, geoPath } from 'd3-geo'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const inputPath = path.resolve(root, process.argv[2] ?? '.data/historical/cliopatria-v0.2.1.geojson')
const seedPath = path.join(root, 'docs/data/historical/atlas-seeds.json')
const outputDirectory = path.join(root, 'public/data/historical/atlas/v2')
const mapDirectory = path.join(outputDirectory, 'maps')
const manifestPath = path.join(outputDirectory, 'manifest.json')

const source = {
  title: 'Cliopatria',
  version: 'v0.2.1',
  repositoryUrl: 'https://github.com/Seshat-Global-History-Databank/cliopatria',
  releasePageUrl: 'https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.1',
  releaseCommit: '5f433377139a6eeaeacbdc894b70f8805b72c8b5',
  archiveUrl: 'https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.1/cliopatria.geojson.zip',
  archiveSha256: 'e10a4e429fca708788ff9e7572a95fce801fae55852d217cffabc1c59cd4eed4',
  dataSha256: 'fc6f0d1e4cc42f45da83522b3696db6f2cc85ec0d12259a85c89b31347b8fc0a',
  license: 'Creative Commons Attribution 4.0 International',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Cliopatria v0.2.1 by the Seshat Global History Databank, CC BY 4.0. Maproom clipped, oriented, simplified and rendered these source polygons for a historical geography game.',
}

const inputBytes = await readFile(inputPath)
const inputHash = sha256(inputBytes)
if (inputHash !== source.dataSha256) {
  throw new Error(`Cliopatria v0.2.1 SHA-256 mismatch. Expected ${source.dataSha256}; received ${inputHash}.`)
}
const collection = JSON.parse(inputBytes.toString('utf8'))
const seeds = JSON.parse(await readFile(seedPath, 'utf8'))
if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
  throw new Error('Cliopatria input must be a GeoJSON FeatureCollection.')
}
if (!Array.isArray(seeds) || seeds.length < 20) throw new Error('At least 20 curated historical atlas maps are required.')

await mkdir(mapDirectory, { recursive: true })
const maps = []
const assetsToKeep = new Set()
const seenIds = new Set()
for (const [index, seed] of seeds.entries()) {
  if (!isRecord(seed) || typeof seed.id !== 'string' || !/^[a-z0-9-]+$/.test(seed.id) || seenIds.has(seed.id)
    || !Number.isInteger(seed.year) || seed.year === 0
    || typeof seed.polity !== 'string' || !seed.polity
    || !isValidRegion(seed.region)
    || typeof seed.clue !== 'string' || !seed.clue
    || typeof seed.context !== 'string' || !seed.context
    || ![1, 2, 3].includes(seed.visualDistinctiveness)) {
    throw new Error(`Invalid historical atlas seed at index ${index}.`)
  }
  seenIds.add(seed.id)
  const activeRows = collection.features.filter((feature) => feature?.properties?.Type === 'POLITY'
    && feature.properties.Name === seed.polity
    && Number.isInteger(feature.properties.FromYear) && Number.isInteger(feature.properties.ToYear)
    && feature.properties.FromYear <= seed.year && seed.year <= feature.properties.ToYear)
  if (activeRows.length === 0) throw new Error(`No Cliopatria POLITY geometry for ${seed.polity} at year ${seed.year}.`)
  for (const feature of activeRows) validateGeometry(feature, seed.id)

  const acceptedFromYear = Math.max(...activeRows.map((feature) => feature.properties.FromYear))
  const acceptedToYear = Math.min(...activeRows.map((feature) => feature.properties.ToYear))
  if (acceptedFromYear > acceptedToYear || seed.year < acceptedFromYear || seed.year > acceptedToYear) {
    throw new Error(`The selected ${seed.polity} geometries do not share a defensible interval.`)
  }
  const projection = createProjection(seed.region)
  const pathFor = geoPath(projection).digits(1)
  const graticule = pathFor(seed.region.id === 'global-empire'
    ? geoGraticule10()
    : geoGraticule().extent([[seed.region.west, seed.region.south], [seed.region.east, seed.region.north]]).step([10, 10])())
  const polygons = activeRows.map((feature, featureIndex) => {
    const displayFeature = simplifyFeature(orientFeatureForD3(feature), projection, 0.7)
    const path = pathFor(displayFeature)
    if (!path) throw new Error(`Cliopatria produced an empty map path for ${seed.id}.`)
    const fill = featureIndex % 2 === 0 ? '#d88454' : '#6f9189'
    return `<path d="${path}" fill="${fill}" fill-opacity="0.78" stroke="#4d4841" stroke-width="1.1" stroke-linejoin="round"/>`
  }).join('\n')
  const svg = renderSvg(seed, polygons, graticule)
  const assetSha256 = sha256(svg)
  const assetUrl = `/data/historical/atlas/v2/maps/${seed.id}.svg`
  assetsToKeep.add(`${seed.id}.svg`)
  await writeFile(path.join(mapDirectory, `${seed.id}.svg`), svg)

  const polities = [...new Set(activeRows.map((feature) => feature.properties.Name))].map((sourceName) => {
    const feature = activeRows.find((row) => row.properties.Name === sourceName)
    const wikipediaUrl = wikipediaUrlFor(feature?.properties?.Wikipedia)
    const wikidataUrl = wikidataUrlFor(feature?.properties?.Wikidata)
    const name = sourceName.startsWith('(') && sourceName.endsWith(')') ? sourceName.slice(1, -1) : sourceName
    return { name, wikipediaUrl, wikidataUrl }
  })
  const entitySources = polities.flatMap((polity) => polity.wikipediaUrl
    ? [{ title: `${polity.name} · historical overview`, url: polity.wikipediaUrl }]
    : [])
  maps.push({
    id: seed.id,
    sampleYear: seed.year,
    acceptedFromYear,
    acceptedToYear,
    assetUrl,
    assetSha256,
    region: seed.region,
    visibleClue: seed.clue,
    historicalContext: seed.context,
    contextSources: entitySources.length ? entitySources : [{ title: 'Cliopatria v0.2.1 release', url: source.releasePageUrl }],
    uncertainty: `The accepted interval is the inclusive Cliopatria FromYear–ToYear range for the displayed ${seed.polity} geometry. Cliopatria supplies one scholarly reconstruction without per-polygon confidence values. This selected polity map does not show every contemporaneous community, dependency or political relationship.`,
    visualDistinctiveness: seed.visualDistinctiveness,
    polities,
    sourceFeatureCount: activeRows.length,
  })
}

for (const file of await readdir(mapDirectory)) {
  if (file.endsWith('.svg') && !assetsToKeep.has(file)) await rm(path.join(mapDirectory, file))
}

const manifest = {
  schemaVersion: 1,
  source,
  snapshotConvention: 'Each asset is a Maproom-generated regional view of one selected POLITY at sampleYear. Its accepted date interval is the inclusive source interval shared by every displayed geometry. The map has no labels before a guess and is not an archival map or a complete inventory of historical societies.',
  maps,
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${maps.length} curated maps from Cliopatria ${source.version}; source SHA-256 ${inputHash}.`)

function createProjection(region) {
  const extent = [[35, 36], [965, 524]]
  if (region.id === 'global-empire') return geoEqualEarth().fitExtent(extent, { type: 'Sphere' }).precision(0.7)
  const box = orientFeatureForD3({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[
      [region.west, region.south], [region.east, region.south], [region.east, region.north],
      [region.west, region.north], [region.west, region.south],
    ]] },
  })
  return geoEquirectangular().fitExtent(extent, box).precision(0.7)
}

function validateGeometry(feature, id) {
  const geometry = feature.geometry
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type) || !Array.isArray(geometry.coordinates)) {
    throw new Error(`Unsupported Cliopatria geometry in map ${id}.`)
  }
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const rings of polygons) {
    if (!Array.isArray(rings) || rings.length === 0) throw new Error(`Empty polygon in map ${id}.`)
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 4 || !sameCoordinate(ring[0], ring.at(-1))) {
        throw new Error(`Open or underspecified coordinate ring in map ${id}.`)
      }
      for (const coordinate of ring) {
        if (!Array.isArray(coordinate) || coordinate.length < 2 || !Number.isFinite(coordinate[0])
          || !Number.isFinite(coordinate[1]) || coordinate[0] < -180 || coordinate[0] > 180
          || coordinate[1] < -90 || coordinate[1] > 90) {
          throw new Error(`Invalid coordinate in map ${id}.`)
        }
      }
    }
  }
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
  if (geometry.type === 'Polygon') {
    return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, projection, tolerance)) } }
  }
  if (geometry.type === 'MultiPolygon') {
    return { ...feature, geometry: { ...geometry, coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => simplifyRing(ring, projection, tolerance))) } }
  }
  return feature
}

function simplifyRing(ring, projection, tolerance) {
  if (ring.length < 5 || ring.some((coordinate, index) => index > 0 && Math.abs(coordinate[0] - ring[index - 1][0]) > 180)) return ring
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
  const simplified = [
    ...simplifyLine(open.slice(0, split + 1), projection, tolerance).slice(0, -1),
    ...simplifyLine([...open.slice(split), open[0]], projection, tolerance),
  ]
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

function renderSvg(seed, polygons, graticule) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 560" role="img" aria-labelledby="map-title map-description">
<!-- ${source.attribution} Source: ${source.releasePageUrl} License: ${source.licenseUrl} -->
<title id="map-title">Unlabelled historical political map</title>
<desc id="map-description">A Maproom-generated reconstruction of mapped political territory in a ${escapeXml(seed.region.name)} frame. Labels are omitted until the answer is revealed.</desc>
<rect width="1000" height="560" rx="14" fill="#eee6d8"/>
<rect x="20" y="20" width="960" height="520" rx="10" fill="#f7f1e7" stroke="#cfc4b4" stroke-width="1"/>
<path d="${graticule}" fill="none" stroke="#d8d0c3" stroke-width="0.65"/>
<g>${polygons}</g>
<path d="M34 514H966" stroke="#d9d0c3" stroke-width="1"/>
<text x="42" y="532" fill="#777164" font-family="system-ui, sans-serif" font-size="10" letter-spacing="1.1">${escapeXml(seed.region.name.toUpperCase())}</text>
<text x="958" y="532" fill="#777164" font-family="system-ui, sans-serif" font-size="10" text-anchor="end" letter-spacing="1.1">UNLABELLED POLITY OUTLINE</text>
</svg>\n`
}

function isValidRegion(region) {
  return isRecord(region) && typeof region.id === 'string' && typeof region.name === 'string'
    && Number.isFinite(region.west) && Number.isFinite(region.east) && Number.isFinite(region.south) && Number.isFinite(region.north)
    && region.west >= -180 && region.east <= 180 && region.west < region.east
    && region.south >= -90 && region.north <= 90 && region.south < region.north
}

function wikipediaUrlFor(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const phrase = value.trim().replaceAll(' ', '_')
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(phrase).replaceAll('%2F', '/')}`
}

function wikidataUrlFor(value) {
  if (typeof value !== 'string' || !/^Q\d+$/.test(value.trim())) return null
  return `https://www.wikidata.org/wiki/${value.trim()}`
}

function sameCoordinate(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length >= 2 && right.length >= 2
    && Math.abs(left[0] - right[0]) < 1e-10 && Math.abs(left[1] - right[1]) < 1e-10
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}
