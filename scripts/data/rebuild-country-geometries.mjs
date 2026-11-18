import { createHash } from 'node:crypto'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { topology } from 'topojson-server'
import { mergeDetailedFallback, normalizeNaturalEarthGeometry, territoryParentIso3 } from './country-geometry.mjs'
import { supplementalTerritories } from './supplemental-territories.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataDir = path.join(root, 'public', 'data')
const rawDir = path.join(root, '.data', 'raw')
const [source50, source10, sourceCatalog, catalogFile, manifestFile, coverageFile] = await Promise.all([
  readJson(path.join(rawDir, 'natural-earth-admin0-50m.geojson')),
  readJson(path.join(rawDir, 'natural-earth-admin0-10m.geojson')),
  readJson(path.join(rawDir, 'mledoze-countries.json')),
  readJson(path.join(dataDir, 'countries.json')),
  readJson(path.join(dataDir, 'data-manifest.json')),
  readJson(path.join(dataDir, 'coverage.json')),
])

const fullSourceCatalog = [...sourceCatalog, ...supplementalTerritories]
const worldResult = normalizeNaturalEarthGeometry({ ...source50, scale: '1:50m' }, fullSourceCatalog)
const outlineResult = normalizeNaturalEarthGeometry({ ...source10, scale: '1:10m' }, fullSourceCatalog)
const worldFeatures = mergeDetailedFallback(worldResult.features, outlineResult.features)
const outlineFeatures = outlineResult.features
const worldCodes = new Set(worldFeatures.map((feature) => feature.properties.iso3).filter(Boolean))
const existingCountries = catalogFile.countries.filter((country) => !supplementalTerritories.some((item) => item.cca3 === country.iso3)).map((country) => ({
  ...country,
  flagEligible: country.flagEligible ?? true,
  parentIso3: territoryParentIso3(country.iso3),
  hasGeometry: worldCodes.has(country.iso3),
}))
const addedCountries = supplementalTerritories.map((territory) => ({
  iso3: territory.cca3,
  parentIso3: territoryParentIso3(territory.cca3),
  iso2: null,
  name: territory.name.common,
  officialName: territory.name.official,
  aliases: [...new Set([territory.name.common, territory.name.official, ...territory.altSpellings])],
  continent: territory.continents[0],
  subregion: territory.subregion,
  capital: null,
  capitals: [],
  capitalCoordinates: null,
  coordinates: { lat: territory.latlng[0], lon: territory.latlng[1] },
  population: territory.population,
  populationYear: null,
  areaKm2: null,
  landlocked: false,
  borders: [],
  independent: false,
  flagCode: territory.maproomFlagCode,
  flagEligible: territory.maproomFlagEligible,
  hasGeometry: worldCodes.has(territory.cca3),
  regionCount: 0,
  regionSource: null,
}))
const countries = [...existingCountries, ...addedCountries].sort((a, b) => a.name.localeCompare(b.name))

const world = { type: 'FeatureCollection', features: worldFeatures }
const outlines = { type: 'FeatureCollection', features: outlineFeatures }
const nextCatalog = { ...catalogFile, countries }

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const geometryQuantization = 1_000_000
const worldTopology = topology({ countries: world }, geometryQuantization)
const outlineTopology = topology({ countries: outlines }, geometryQuantization)
const worldBytes = Buffer.from(JSON.stringify(worldTopology))
const outlineBytes = Buffer.from(JSON.stringify(outlineTopology))
const catalogBytes = Buffer.from(JSON.stringify(nextCatalog))
await writeFile(path.join(dataDir, 'countries.topo.json'), worldBytes)
await writeFile(path.join(dataDir, 'countries-outline.topo.json'), outlineBytes)
await writeFile(path.join(dataDir, 'countries.json'), catalogBytes)
await Promise.all([
  unlink(path.join(dataDir, 'countries.geojson')).catch((error) => { if (error.code !== 'ENOENT') throw error }),
  unlink(path.join(dataDir, 'countries-outline.geojson')).catch((error) => { if (error.code !== 'ENOENT') throw error }),
])

const coverage = {
  ...coverageFile,
  countryCatalogCount: countries.length,
  countryGeometryFeatureCount: worldFeatures.length,
  outlineGeometryFeatureCount: outlineFeatures.length,
  countryCodesWithGeometry: worldCodes.size,
  countriesWithoutGeometry: countries.filter((country) => !country.hasGeometry).map((country) => country.iso3),
  countriesWithoutAdmin1: countries.filter((country) => !country.regionCount).length,
  limitations: [
    ...coverageFile.limitations.filter((item) => !item.startsWith('Explicit parent-territory links split')),
    'Explicit parent-territory links split detached overseas components into separate Extended entries while preserving domestic archipelagos. Disputed records without a resolved parent remain separate.',
  ],
}
await writeJson(path.join(dataDir, 'coverage.json'), coverage, true)

const sources = manifestFile.sources.filter((source) => !source.name.startsWith('Natural Earth 1:10m'))
const worldSource = sources.find((source) => source.name.startsWith('Natural Earth 1:50m'))
if (worldSource) {
  worldSource.transformations = [...new Set([
    ...(worldSource.transformations ?? []),
    'Quantized and converted shared borders to TopoJSON at a 1e6 coordinate grid',
  ])]
}
const sourceSha256 = sha256(await readFile(path.join(rawDir, 'natural-earth-admin0-10m.geojson')))
sources.splice(sources.findIndex((source) => source.name.startsWith('Natural Earth 1:50m')) + 1, 0, {
  name: 'Natural Earth 1:10m Admin 0 Countries',
  source: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson',
  version: 'GitHub natural-earth-vector master snapshot',
  retrievedAt: manifestFile.generatedAt,
  sha256: sourceSha256,
  license: 'Public domain',
  licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
  attribution: 'Made with Natural Earth.',
  transformations: [
    'Preserved detailed Polygon and MultiPolygon rings for country silhouettes',
    'Separated named territory components from their parent countries',
    'Merged Natural Earth Northern Cyprus and Cyprus U.N. Buffer Zone geometries into the geographic Cyprus island outline',
    'Quantized and converted shared borders to TopoJSON at a 1e6 coordinate grid',
  ],
})
const manifest = {
  ...manifestFile,
  sources,
  artifacts: {
    ...manifestFile.artifacts,
    countriesTopologySha256: sha256(worldBytes),
    countriesOutlineTopologySha256: sha256(outlineBytes),
    countriesCatalogSha256: sha256(catalogBytes),
    coverageSha256: sha256(Buffer.from(JSON.stringify(coverage, null, 2))),
  },
}
delete manifest.artifacts.countriesGeoJSONSha256
delete manifest.artifacts.countriesOutlineGeoJSONSha256
await writeJson(path.join(dataDir, 'data-manifest.json'), manifest, true)

console.log(JSON.stringify({
  worldFeatures: worldFeatures.length,
  outlineFeatures: outlineFeatures.length,
  geometryCodes: worldCodes.size,
  missingGeometry: countries.filter((country) => !country.hasGeometry).map((country) => country.iso3),
  worldBytes: worldBytes.length,
  outlineBytes: outlineBytes.length,
  separatedComponents50m: summarizeAssignments(worldResult.assignments),
  separatedComponents10m: summarizeAssignments(outlineResult.assignments),
}, null, 2))

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function writeJson(file, value, pretty = false) {
  await writeFile(file, JSON.stringify(value, null, pretty ? 2 : 0))
}

function summarizeAssignments(assignments) {
  const counts = new Map()
  for (const assignment of assignments) {
    const key = `${assignment.from} → ${assignment.to} (${assignment.name})`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts].map(([relationship, components]) => ({ relationship, components }))
}
