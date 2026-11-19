import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataPath = path.join(root, 'public/data/watershed-match.json')
const collectionUrl = 'https://api.water.usgs.gov/fabric/pygeoapi/collections/wbd12_20250107/items'
const regions = [
  { name: 'Appalachians', bbox: '-80,38,-79,39', expectedFeatures: 132 },
  { name: 'Columbia', bbox: '-123,45.1,-122,45.8', expectedFeatures: 105 },
  { name: 'Susquehanna', bbox: '-77.5,40,-76.5,41', expectedFeatures: 142 },
]

const data = JSON.parse(await readFile(dataPath, 'utf8'))
if (data.schemaVersion !== 1 || data.collection !== 'wbd12_20250107'
  || !Array.isArray(data.questions) || !data.topology?.objects?.units?.geometries) {
  throw new Error('The bundled Watershed Match data has an unsupported format.')
}

const officialById = new Map()
const regionById = new Map()
for (const region of regions) {
  const url = new URL(collectionUrl)
  url.searchParams.set('f', 'json')
  url.searchParams.set('limit', '1000')
  url.searchParams.set('bbox', region.bbox)

  const response = await fetchWithRetry(url, region.name)
  if (!response.ok) throw new Error(`USGS ${region.name} query failed (${response.status}).`)
  const collection = await response.json()
  if (!Array.isArray(collection.features) || collection.features.length !== region.expectedFeatures) {
    throw new Error(`USGS ${region.name} sample changed: expected ${region.expectedFeatures} features.`)
  }

  for (const feature of collection.features) {
    const properties = feature.properties
    const id = properties?.huc12
    if (typeof id !== 'string' || !/^\d{12}$/.test(id)) continue
    const previous = officialById.get(id)
    const checkedFields = ['huc12', 'name', 'tohuc', 'hutype', 'humod']
    if (previous && checkedFields.some((field) => previous[field] !== properties[field])) {
      throw new Error(`USGS returned conflicting properties for HUC12 ${id}.`)
    }
    officialById.set(id, properties)
    if (!regionById.has(id)) regionById.set(id, region.name)
  }
}

const issues = []
const bundledById = new Map(data.topology.objects.units.geometries.map((geometry) => [
  String(geometry.id ?? geometry.properties?.huc12),
  geometry.properties,
]))

for (const [id, bundled] of bundledById) {
  const official = officialById.get(id)
  if (!official) issues.push(`Bundled HUC12 ${id} is outside the three source samples.`)
  else if (official.name !== bundled?.name) issues.push(`Bundled name for HUC12 ${id} differs from USGS (${official.name}).`)
}

for (const question of data.questions) {
  const source = officialById.get(question.sourceId)
  const answer = officialById.get(question.answerId)
  if (!source) {
    issues.push(`${question.id}: source HUC12 ${question.sourceId} is missing from the official samples.`)
    continue
  }
  if (!answer) issues.push(`${question.id}: answer HUC12 ${question.answerId} is missing from the official samples.`)
  if (regionById.get(question.sourceId) !== question.region) {
    issues.push(`${question.id}: region is ${question.region}, source sample is ${regionById.get(question.sourceId)}.`)
  }
  if (source.tohuc !== question.answerId) {
    issues.push(`${question.id}: bundled answer ${question.answerId} differs from USGS ToHUC ${source.tohuc}.`)
  }
  if (source.hutype !== 'S' || source.humod !== 'NM') {
    issues.push(`${question.id}: source is no longer an unmodified subwatershed (S/NM).`)
  }
  if (answer && (answer.hutype !== 'S' || answer.humod !== 'NM')) {
    issues.push(`${question.id}: answer ${question.answerId} is no longer an unmodified subwatershed (S/NM).`)
  }
}

if (issues.length) {
  console.error(`Watershed Match source audit found ${issues.length} issue(s):`)
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  const total = regions.map(({ expectedFeatures }) => expectedFeatures).join(' + ')
  console.log(`Watershed Match source audit passed: ${data.questions.length} ToHUC links, ${bundledById.size} bundled names, and ${total} sampled USGS features.`)
}

async function fetchWithRetry(url, region) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(20_000) })
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
  throw new Error(`USGS ${region} query failed after three network attempts.`, { cause: lastError })
}
