import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { topology } from 'topojson-server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outputPath = path.join(root, 'public/data/watershed-match.json')
const manifestPath = path.join(root, 'public/data/data-manifest.json')
const collectionUrl = 'https://api.water.usgs.gov/fabric/pygeoapi/collections/wbd12_20250107/items'
const regions = [
  { name: 'Potomac', bbox: '-80,38,-79,39', expectedFeatures: 132 },
  { name: 'Columbia', bbox: '-123,45.1,-122,45.8', expectedFeatures: 105 },
  { name: 'Susquehanna', bbox: '-77.5,40,-76.5,41', expectedFeatures: 142 },
]
const stopWords = new Set([
  'north', 'south', 'east', 'west', 'upper', 'lower', 'middle', 'headwaters', 'outlet',
  'branch', 'fork', 'creek', 'river', 'run', 'stream', 'lake', 'drain', 'watershed',
  'spring', 'mill', 'little', 'big', 'main',
])

const featuresById = new Map()
const regionById = new Map()
for (const region of regions) {
  const url = new URL(collectionUrl)
  url.searchParams.set('f', 'json')
  url.searchParams.set('limit', '1000')
  url.searchParams.set('bbox', region.bbox)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`WBD ${region.name} query failed (${response.status}).`)
  const collection = await response.json()
  if (!Array.isArray(collection.features) || collection.features.length !== region.expectedFeatures) {
    throw new Error(`WBD ${region.name} sample changed: expected ${region.expectedFeatures} features.`)
  }
  for (const feature of collection.features) {
    const huc12 = feature.properties?.huc12
    if (typeof huc12 !== 'string' || !/^\d{12}$/.test(huc12) || !feature.geometry) continue
    const existing = featuresById.get(huc12)
    if (existing && JSON.stringify(existing.geometry) !== JSON.stringify(feature.geometry)) {
      throw new Error(`WBD returned conflicting geometry for HUC12 ${huc12}.`)
    }
    featuresById.set(huc12, feature)
    if (!regionById.has(huc12)) regionById.set(huc12, region.name)
  }
}

const adjacent = buildAdjacency(featuresById)
const candidates = []
for (const [huc12, feature] of featuresById) {
  const properties = feature.properties
  const answerId = properties.tohuc
  if (properties.hutype !== 'S' || properties.humod !== 'NM' || !/^\d{12}$/.test(answerId)) continue
  const answer = featuresById.get(answerId)
  if (!answer || answer.properties.hutype !== 'S' || answer.properties.humod !== 'NM' || !adjacent.get(huc12)?.has(answerId)) continue

  const distractors = [...(adjacent.get(huc12) ?? [])]
    .filter((id) => id !== answerId && id !== huc12)
    .map((id) => featuresById.get(id))
    .filter((option) => option?.properties.hutype === 'S'
      && option.properties.humod === 'NM'
      && option.properties.name !== properties.name
      && option.properties.name !== answer.properties.name)
    .map((option) => ({
      id: option.properties.huc12,
      name: option.properties.name,
      similarity: Math.max(nameSimilarity(option.properties.name, properties.name), nameSimilarity(option.properties.name, answer.properties.name)),
    }))
    .sort((left, right) => right.similarity - left.similarity
      || left.name.localeCompare(right.name)
      || left.id.localeCompare(right.id))

  if (distractors.length < 2 || distractors[0].similarity < 0.25) continue
  candidates.push({
    id: `wbd-${huc12}`,
    region: regionById.get(huc12),
    sourceId: huc12,
    answerId,
    optionIds: [answerId, distractors[0].id, distractors[1].id],
  })
}

candidates.sort((left, right) => left.sourceId.localeCompare(right.sourceId))
if (candidates.length < 50) throw new Error(`Only ${candidates.length} WBD questions passed the curated screening rule.`)

const includedIds = new Set(candidates.flatMap((question) => [question.sourceId, ...question.optionIds]))
const simplifiedFeatures = [...includedIds].sort().map((id) => {
  const source = featuresById.get(id)
  return {
    type: 'Feature',
    id,
    properties: { huc12: id, name: source.properties.name },
    geometry: source.geometry,
  }
})
const waterTopology = topology({
  units: { type: 'FeatureCollection', features: simplifiedFeatures },
}, 20_000)
const payload = {
  schemaVersion: 1,
  collection: 'wbd12_20250107',
  regions: regions.map(({ name }) => name),
  topology: waterTopology,
  questions: candidates,
}
const bytes = Buffer.from(`${JSON.stringify(payload)}\n`)
await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, bytes)

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
manifest.generatedAt = new Date().toISOString()
const sourceName = 'USGS Watershed Boundary Dataset 2025 HUC12 sample'
manifest.sources = manifest.sources.filter((source) => source.name !== sourceName)
manifest.sources.push({
  name: sourceName,
  source: `${collectionUrl}?f=json&limit=1000&bbox={regional-bounds}`,
  version: 'USGS Hydrologic Geospatial Fabric collection wbd12_20250107',
  retrievedAt: manifest.generatedAt,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  license: 'CC0 1.0 Universal (the API collection links CC0 terms)',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
  attribution: 'U.S. Geological Survey and Natural Resources Conservation Service; Watershed Boundary Dataset 2025 snapshot.',
  transformations: [
    'Retrieved the 2025 HUC12 collection in three fixed bounding boxes around the Potomac, Columbia and Susquehanna systems.',
    'Kept only HUCType S and HUMod NM source/answer units with a numeric 12-digit ToHUC target that shares a polygon boundary.',
    'Selected two distinct, unmodified, adjacent HUC12 alternatives for each question; retained names with at least one plausibly similar neighboring choice.',
    'Bundled only geometry referenced by the screened questions and TopoJSON-quantized coordinates to a 20,000-step grid.',
    'Game wording describes ToHUC as the neighboring unit receiving the majority of mapped flow; exceptional outlet codes are excluded.',
  ],
})
manifest.artifacts.watershedMatchSha256 = createHash('sha256').update(bytes).digest('hex')
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`Wrote ${candidates.length} questions and ${includedIds.size} watershed geometries.`)
console.log(`Data size: ${bytes.length.toLocaleString()} bytes (${createHash('sha256').update(bytes).digest('hex')}).`)

function buildAdjacency(features) {
  const edgeOwners = new Map()
  for (const [id, feature] of features) {
    for (const edge of edgesFor(feature.geometry)) {
      let owners = edgeOwners.get(edge)
      if (!owners) edgeOwners.set(edge, owners = new Set())
      owners.add(id)
    }
  }
  const adjacency = new Map([...features.keys()].map((id) => [id, new Set()]))
  for (const owners of edgeOwners.values()) {
    if (owners.size < 2) continue
    for (const id of owners) for (const other of owners) if (other !== id) adjacency.get(id).add(other)
  }
  return adjacency
}

function edgesFor(geometry) {
  const edges = []
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let index = 1; index < ring.length; index += 1) {
        const first = pointKey(ring[index - 1])
        const second = pointKey(ring[index])
        if (first !== second) edges.push(first < second ? `${first}|${second}` : `${second}|${first}`)
      }
    }
  }
  return edges
}

function pointKey(coordinate) {
  return `${Math.round(coordinate[0] * 1e8)},${Math.round(coordinate[1] * 1e8)}`
}

function nameSimilarity(left, right) {
  const leftTokens = new Set((left.toLowerCase().match(/[a-z]+/g) ?? []).filter((token) => !stopWords.has(token)))
  const rightTokens = new Set((right.toLowerCase().match(/[a-z]+/g) ?? []).filter((token) => !stopWords.has(token)))
  const union = new Set([...leftTokens, ...rightTokens])
  if (!union.size) return 0
  let intersection = 0
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1
  return intersection / union.size
}
