import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

function fail(message) {
  throw new Error(`Production artifact validation failed: ${message}`)
}

async function requiredFile(relative) {
  const absolute = path.join(dist, relative)
  let metadata
  try {
    metadata = await stat(absolute)
  } catch {
    fail(`missing dist/${relative}`)
  }
  if (!metadata.isFile() || metadata.size === 0) fail(`dist/${relative} is empty or not a file`)
  return absolute
}

async function json(relative) {
  return JSON.parse(await readFile(await requiredFile(relative), 'utf8'))
}

async function filesIn(directory, prefix = '') {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name)
    if (entry.isDirectory()) files.push(...await filesIn(path.join(directory, entry.name), relative))
    else if (entry.isFile()) files.push(relative)
  }
  return files
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

const requiredFiles = [
  'index.html', 'manifest.webmanifest', 'sw.js', 'offline.html', 'precache-manifest.json',
  'robots.txt', 'sitemap.xml', 'social/maproom-preview.png', 'icons/maproom.svg',
  'data/countries.json', 'data/countries.topo.json', 'data/countries-outline.topo.json',
  'data/cities.json', 'data/cities-major.json', 'data/rivers.json', 'data/data-manifest.json',
  'data/coverage.json', 'data/region-index.json', 'data/historical/manifest.json',
]
for (const relative of requiredFiles) await requiredFile(relative)

const snapshotPaths = [
  'index.html', 'explore/index.html', 'about/index.html', 'data/index.html', 'privacy/index.html',
  'statistics/index.html', 'settings/index.html', '404/index.html',
  'games/countries/index.html', 'games/outlines/index.html', 'games/routes/index.html',
  'games/flags/index.html', 'games/grid/index.html', 'games/cities/index.html',
  'games/connections/index.html', 'games/higher-lower/index.html', 'games/neighbours/index.html',
  'games/distance/index.html', 'games/rivers/index.html', 'games/latitude-ladder/index.html',
  'games/historical-geography/index.html', 'games/projection-match/index.html',
]
for (const relative of snapshotPaths) {
  const html = await readFile(await requiredFile(relative), 'utf8')
  for (const marker of ['<title>', 'id="meta-description"', 'id="meta-robots"', 'id="canonical-url"', 'id="og-title"', 'id="twitter-title"', 'id="structured-data"', 'id="seo-snapshot"']) {
    if (!html.includes(marker)) fail(`dist/${relative} is missing ${marker}`)
  }
}

const allHtml = (await filesIn(dist)).filter((file) => file === 'index.html' || file.endsWith('/index.html'))
if (allHtml.length !== snapshotPaths.length) fail(`expected ${snapshotPaths.length} route snapshots, found ${allHtml.length}`)

const sitemap = await readFile(await requiredFile('sitemap.xml'), 'utf8')
const sitemapUrls = sitemap.match(/<loc>/g) ?? []
if (sitemapUrls.length !== 19) fail(`expected 19 indexable sitemap URLs, found ${sitemapUrls.length}`)
const deployment = await readFile(path.join(root, 'scripts/finalize-deployment.sh'), 'utf8')
const domain = deployment.match(/^readonly DOMAIN='([^']+)'$/m)?.[1]
if (!domain || !sitemap.includes(`<loc>https://${domain}/`)) fail('sitemap origin does not match the deployment hostname')
const robots = await readFile(await requiredFile('robots.txt'), 'utf8')
if (!robots.includes(`Sitemap: https://${domain}/sitemap.xml`)) fail('robots.txt has no matching sitemap URL')

const precache = await json('precache-manifest.json')
if (typeof precache.buildId !== 'string' || !/^[a-f0-9]{16}$/.test(precache.buildId)) fail('precache build ID is missing or malformed')
if (!Array.isArray(precache.assets) || precache.assets.length === 0) fail('precache manifest contains no assets')
if (new Set(precache.assets).size !== precache.assets.length) fail('precache manifest contains duplicate assets')
for (const asset of precache.assets) {
  if (typeof asset !== 'string' || !asset.startsWith('/assets/') || asset.includes('..')) fail(`invalid precache asset path: ${asset}`)
  await requiredFile(asset.slice(1))
}
const compiledFiles = await readdir(path.join(dist, 'assets'))
for (const chunk of ['CountryIdentificationGame', 'OutlineGame', 'BorderRouteGame', 'FlagGame', 'GeographyGridGame', 'CitiesGame', 'ConnectionsGame', 'HigherLowerGame', 'NeighbourGame', 'DistanceGame', 'RiverwaysGame', 'LatitudeLadderGame', 'HistoricalGeographyGame', 'ProjectionMatchGame']) {
  if (!compiledFiles.some((file) => file.startsWith(`${chunk}-`) && file.endsWith('.js'))) fail(`lazy game chunk is missing for ${chunk}`)
}
const worker = await readFile(await requiredFile('sw.js'), 'utf8')
if (worker.includes('__MAPROOM_CACHE_VERSION__') || !worker.includes(`const CACHE_VERSION = '${precache.buildId}'`)) {
  fail('service-worker cache version does not match the precache manifest')
}

const indexHtml = await readFile(await requiredFile('index.html'), 'utf8')
if (!/name="viewport"[^>]*viewport-fit=cover/.test(indexHtml)) fail('the application viewport does not include viewport-fit=cover')
const inlineScripts = [...indexHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\bsrc=/i.test(match[1] ?? '') && !/application\/ld\+json/i.test(match[1] ?? ''))
if (inlineScripts.length !== 1) fail(`expected one non-JSON inline bootstrap script, found ${inlineScripts.length}`)
const bootstrapHash = `sha256-${createHash('sha256').update(inlineScripts[0]?.[2] ?? '').digest('base64')}`
const cspLine = deployment.match(/^\s*Content-Security-Policy "([^"]+)"$/m)?.[1]
const scriptPolicy = cspLine?.split(';').map((part) => part.trim()).find((part) => part.startsWith('script-src '))
if (!scriptPolicy?.includes(`'${bootstrapHash}'`) || scriptPolicy.includes("'unsafe-inline'")) {
  fail(`Caddy script-src must allow the exact theme bootstrap hash (${bootstrapHash}) without unsafe-inline`)
}

const dataManifest = await json('data/data-manifest.json')
const artifacts = dataManifest.artifacts
const countryCatalog = await json('data/countries.json')
if (!Array.isArray(countryCatalog.countries)) fail('the country catalog has no country records')
const lifeExpectancyValues = countryCatalog.countries.filter((country) => country.lifeExpectancyYears2023 !== null)
if (countryCatalog.countries.some((country) => country.lifeExpectancyYears2023 !== null
  && (!Number.isFinite(country.lifeExpectancyYears2023) || country.lifeExpectancyYears2023 <= 0))) {
  fail('life expectancy values must be positive finite numbers or null')
}
if (lifeExpectancyValues.length < 190) fail('the country catalog has too few 2023 life expectancy observations')
if (!dataManifest.sources.some((source) => source.name === 'World Bank World Development Indicators life expectancy at birth'
  && /^[a-f0-9]{64}$/.test(source.sha256 ?? ''))) {
  fail('the 2023 life expectancy source is missing from the data manifest')
}
const checksums = new Map([
  ['data/countries.topo.json', artifacts.countriesTopologySha256],
  ['data/countries-outline.topo.json', artifacts.countriesOutlineTopologySha256],
  ['data/countries.json', artifacts.countriesCatalogSha256],
  ['data/cities.json', artifacts.citiesSha256],
  ['data/cities-major.json', artifacts.majorCitiesSha256],
  ['data/rivers.json', artifacts.riversSha256],
  ['data/coverage.json', artifacts.coverageSha256],
  ['data/region-index.json', artifacts.regionIndexSha256],
])
for (const [relative, expected] of checksums) {
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) fail(`manifest checksum is invalid for dist/${relative}`)
  const actual = sha256(await readFile(await requiredFile(relative)))
  if (actual !== expected) fail(`checksum mismatch for dist/${relative}`)
}

const regionPackages = artifacts.regionPackages
if (!Array.isArray(regionPackages) || regionPackages.length === 0) fail('the geography manifest has no regional packages')
const regionFiles = (await readdir(path.join(dist, 'data/regions'))).filter((file) => file.endsWith('.topo.json')).sort()
if (regionFiles.length !== regionPackages.length) fail(`expected ${regionPackages.length} regional packages, found ${regionFiles.length}`)
for (const entry of regionPackages) {
  if (!/^[A-Z0-9]{3}$/.test(entry.iso3) || !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isInteger(entry.bytes)) {
    fail(`regional package metadata is invalid for ${entry.iso3}`)
  }
  const relative = `data/regions/${entry.iso3}.topo.json`
  const bytes = await readFile(await requiredFile(relative))
  if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) fail(`regional package does not match its manifest: dist/${relative}`)
}

const historical = await json('data/historical/manifest.json')
if (!Array.isArray(historical.maps) || historical.maps.length !== 20) fail('historical map manifest must contain exactly 20 maps')
if (historical.dataset?.license !== 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International') {
  fail('historical dataset license does not preserve CC BY-NC-SA 4.0')
}
for (const map of historical.maps) {
  if (!/^\/data\/historical\/maps\/historical-map-\d{2}\.svg$/.test(map.assetUrl) || !/^[a-f0-9]{64}$/.test(map.assetSha256)) {
    fail(`historical map asset metadata is invalid for ${map.id}`)
  }
  const relative = map.assetUrl.slice(1)
  if (sha256(await readFile(await requiredFile(relative))) !== map.assetSha256) fail(`historical map checksum mismatch for dist/${relative}`)
}

console.log(`Validated ${snapshotPaths.length} route snapshots, ${sitemapUrls.length} sitemap URLs, ${precache.assets.length} precached assets, ${regionPackages.length} regional packages, 20 historical maps, and data/CSP hashes.`)
