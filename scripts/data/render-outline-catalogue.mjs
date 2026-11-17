import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoCentroid, geoEqualEarth, geoPath } from 'd3-geo'
import { chromium } from '@playwright/test'
import { classifyGeography, SPECIAL_GEOGRAPHIC_CODES, STANDARD_CODES } from '../../src/geography/catalogue-rules.mjs'
import { outlinePlayabilitySummary, outlineRuleFor } from '../../src/games/outlines/playability.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataDir = path.join(root, 'public', 'data')
const outputDir = path.join(root, 'artifacts', 'qa', 'geography-overhaul', 'contact-sheets')
const countries = JSON.parse(readFileSync(path.join(dataDir, 'countries.json'), 'utf8')).countries
const outlines = JSON.parse(readFileSync(path.join(dataDir, 'countries-outline.geojson'), 'utf8'))
const sourceManifest = JSON.parse(readFileSync(path.join(dataDir, 'data-manifest.json'), 'utf8'))
const outlineSource = sourceManifest.sources.find((source) => source.name === 'Natural Earth 1:10m Admin 0 Countries')
if (!outlineSource) throw new Error('No Natural Earth 1:10m source record found in data-manifest.json')

const featuresByCode = new Map()
for (const feature of outlines.features) {
  const code = feature.properties?.iso3
  if (!code) continue
  const list = featuresByCode.get(code) ?? []
  list.push(feature)
  featuresByCode.set(code, list)
}
const countriesByCode = new Map(countries.map((country) => [country.iso3, country]))
const audit = countries.map((country) => makeAuditEntry(country, featuresByCode.get(country.iso3) ?? []))
const unassignedFeatures = outlines.features.filter((feature) => !feature.properties?.iso3)
const unassignedAudit = unassignedFeatures.map(makeUnassignedAuditEntry)
const codesWithoutCatalog = [...featuresByCode.keys()].filter((code) => !countriesByCode.has(code))
const codeCounts = outlines.features.reduce((counts, feature) => {
  const code = feature.properties?.iso3
  const key = code || '(no ISO3)'
  counts[key] = (counts[key] ?? 0) + 1
  return counts
}, {})

const output = {
  generatedAt: new Date().toISOString(),
  auditRules: {
    standard: 'The 195-code Maproom Standard quiz identity set (193 UN members and two UN observer-state map records).',
    extended: 'Every catalogue identity except the 12 explicitly classified special geographic records.',
    outline: 'Country outline eligibility is independently curated by ISO3; eligible shapes have one reviewed difficulty, while unsuitable silhouettes have an explicit exclusion reason.',
  },
  sources: { outline: outlineSource },
  counts: {
    catalogueIdentities: countries.length,
    standardIdentities: countries.filter((country) => STANDARD_CODES.has(country.iso3)).length,
    ordinaryExtendedIdentities: countries.filter((country) => !SPECIAL_GEOGRAPHIC_CODES.has(country.iso3)).length,
    separatelyRepresentedTerritories: countries.filter((country) => classifyGeography(country) === 'separately-represented-territory').length,
    additionalIdentities: countries.filter((country) => classifyGeography(country) === 'additional-identity').length,
    specialGeographicEntities: countries.filter((country) => classifyGeography(country) === 'special-geographic-entity').length,
    outlineFeatureRecords: outlines.features.length,
    outlineIdentityCodes: featuresByCode.size,
    outlineFeatureRecordsWithoutIso3: codeCounts['(no ISO3)'] ?? 0,
    outlineCodesWithoutCatalogueIdentity: codesWithoutCatalog,
    unassignedSourceFeatures: unassignedAudit.length,
    playability: outlinePlayabilitySummary(countries),
  },
  identities: audit,
  unassignedFeatures: unassignedAudit,
}

mkdirSync(outputDir, { recursive: true })
writeFileSync(path.join(outputDir, 'catalogue-audit.json'), `${JSON.stringify(output, null, 2)}\n`)

const groups = new Map()
for (const entry of [...audit, ...unassignedAudit]) {
  const region = entry.continent || 'Unassigned region'
  const list = groups.get(region) ?? []
  list.push(entry)
  groups.set(region, list)
}

const regionOrder = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America', 'Antarctica', 'Unassigned region', 'Unassigned Natural Earth source feature']
const pageRecords = []
for (const region of regionOrder) {
  const entries = groups.get(region)
  if (!entries?.length) continue
  entries.sort((left, right) => String(left.iso3 ?? left.featureId ?? '').localeCompare(String(right.iso3 ?? right.featureId ?? '')))
  for (let index = 0; index < entries.length; index += 30) {
    const pageNumber = Math.floor(index / 30) + 1
    const slug = region.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')
    const filename = `${slug}-${String(pageNumber).padStart(2, '0')}`
    const pageEntries = entries.slice(index, index + 30)
    const html = renderPage(region, pageNumber, entries.length, pageEntries)
    const htmlPath = path.join(outputDir, `${filename}.html`)
    writeFileSync(htmlPath, html)
    pageRecords.push({ region, pageNumber, filename, count: pageEntries.length, htmlPath })
  }
}

const indexHtml = renderIndex(pageRecords, output)
writeFileSync(path.join(outputDir, 'index.html'), indexHtml)

const browserPath = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ?? ['/usr/bin/chromium', '/snap/bin/chromium'].find((candidate) => existsSync(candidate))
const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 })
  for (const record of pageRecords) {
    await page.goto(`file://${record.htmlPath}`, { waitUntil: 'load' })
    for (const theme of ['light', 'dark']) {
      await page.locator('body').evaluate((body, value) => body.setAttribute('data-theme', value), theme)
      await page.screenshot({ path: path.join(outputDir, `${record.filename}-${theme}.png`), fullPage: true, animations: 'disabled' })
    }
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({
  outputDir,
  pages: pageRecords.map(({ region, pageNumber, count, filename }) => ({ region, pageNumber, count, filename })),
  counts: output.counts,
}, null, 2))

function makeAuditEntry(country, features) {
  const geometry = geometrySummary(features)
  const classification = classifyGeography(country)
  const rule = outlineRuleFor(country.iso3)
  return {
    iso3: country.iso3,
    name: country.name,
    officialName: country.officialName,
    aliases: country.aliases,
    continent: country.continent,
    subregion: country.subregion,
    classification,
    parentIso3: country.parentIso3,
    standardEligible: STANDARD_CODES.has(country.iso3),
    extendedEligible: !SPECIAL_GEOGRAPHIC_CODES.has(country.iso3),
    outline: rule,
    geometry: {
      source: outlineSource.name,
      sourceVersion: outlineSource.version,
      license: outlineSource.license,
      attribution: outlineSource.attribution,
      ...geometry,
    },
    localCenter: country.coordinates,
  }
}

function makeUnassignedAuditEntry(feature) {
  return {
    featureId: feature.id ?? null,
    iso3: null,
    name: feature.properties?.name ?? feature.properties?.mapUnit ?? 'Unnamed Natural Earth feature',
    continent: 'Unassigned Natural Earth source feature',
    subregion: null,
    classification: 'unassigned-source-feature',
    parentIso3: null,
    standardEligible: false,
    extendedEligible: false,
    outline: {
      status: 'excluded',
      difficulty: null,
      reason: 'This Natural Earth boundary has no ISO3 identity in Maproom’s catalogue; it is not selectable in any country question pool.',
      contextRequired: true,
      quality: 'unmatched-source-feature',
      geometrySource: outlineSource.name,
    },
    geometry: {
      source: outlineSource.name,
      sourceVersion: outlineSource.version,
      license: outlineSource.license,
      attribution: outlineSource.attribution,
      ...geometrySummary([feature]),
    },
    localCenter: null,
    unassignedFeature: feature,
  }
}

function geometrySummary(features) {
  let polygonCount = 0
  let ringCount = 0
  let vertexCount = 0
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  let hasAntimeridianEdge = false
  const types = new Set()
  for (const feature of features) {
    const geometry = feature.geometry
    if (!geometry) continue
    types.add(geometry.type)
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
    polygonCount += polygons.length
    for (const polygon of polygons) {
      ringCount += polygon.length
      for (const ring of polygon) {
        vertexCount += ring.length
        for (let index = 0; index < ring.length; index += 1) {
          const [lon, lat] = ring[index]
          minLon = Math.min(minLon, lon)
          maxLon = Math.max(maxLon, lon)
          minLat = Math.min(minLat, lat)
          maxLat = Math.max(maxLat, lat)
          const next = ring[(index + 1) % ring.length]
          if (Math.abs(next[0] - lon) > 180) hasAntimeridianEdge = true
        }
      }
    }
  }
  return {
    featureCount: features.length,
    geometryTypes: [...types],
    polygonCount,
    ringCount,
    vertexCount,
    rawBounds: Number.isFinite(minLon) ? [minLon, minLat, maxLon, maxLat] : null,
    hasAntimeridianEdge,
    sourceScale: features.map((feature) => feature.properties?.sourceScale).filter(Boolean).sort()[0] ?? null,
    separatedFrom: [...new Set(features.map((feature) => feature.properties?.separatedFrom).filter(Boolean))],
  }
}

function renderPage(region, pageNumber, regionCount, entries) {
  const cards = entries.map(renderCard).join('\n')
  const noun = region === 'Unassigned Natural Earth source feature' ? 'source features' : 'identities'
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(region)} outline catalogue · ${pageNumber}</title>
<style>
:root{font:14px/1.35 'Nunito Sans',Arial,sans-serif;color-scheme:light;--paper:#f5eee5;--ink:#292622;--border:#d5c7b7;--muted:#756b61;--water:#292622;--shape:#e57937;--excluded-shape:#b8aa99;--edge:#f5eee5;--tag:#fffaf3;--exclude:#6c6257;--exclude-bg:#eee5d9}
body[data-theme=dark]{color-scheme:dark;--paper:#292521;--ink:#f2e7d9;--border:#61574d;--muted:#b8aa99;--water:#211e1b;--shape:#f29a62;--edge:#292521;--tag:#37322c;--exclude:#c3b8aa;--exclude-bg:#403a34}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);padding:18px 22px 24px}header{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:0 auto 16px;max-width:1140px}h1{margin:0;font-size:22px;font-weight:700}header p{margin:3px 0 0;color:var(--muted);font-size:12px}.legend{font-size:11px;color:var(--muted);text-align:right}.grid{max-width:1140px;margin:0 auto;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.card{min-width:0;overflow:hidden;border:1px solid var(--border);border-radius:6px;background:var(--tag);padding:7px}.card.excluded{border-style:dashed}.map{height:105px;background:var(--water);border-radius:3px;overflow:hidden}.map svg{width:100%;height:100%;display:block}.map path{fill:var(--shape);stroke:var(--edge);stroke-width:1.4;stroke-linejoin:round;vector-effect:non-scaling-stroke}.card.excluded .map path{fill:var(--excluded-shape)}.title{display:flex;justify-content:space-between;gap:6px;align-items:center;margin-top:5px;font-size:11px;font-weight:700}.title .code{font-size:10px;color:var(--muted);letter-spacing:.05em}.chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:3px}.chip{border-radius:9px;padding:1px 5px;background:var(--exclude-bg);color:var(--exclude);font-size:9px;white-space:nowrap}.chip.ok{background:color-mix(in srgb,var(--shape) 18%,var(--tag));color:var(--ink)}.reason{height:25px;margin-top:4px;overflow:hidden;color:var(--muted);font-size:8.5px;line-height:1.3}.source{font-size:8px;color:var(--muted)}@media(max-width:900px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:560px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}
</style></head><body data-theme="light">
<header><div><h1>${escapeHtml(region)} · outline catalogue ${pageNumber}</h1><p>Showing ${entries.length} of ${regionCount} ${noun} in ${escapeHtml(region)}. Each geometry is locally fitted as in Country Outlines.</p></div><div class="legend">Orange: silhouette eligible · Dashed card: excluded from pure outlines<br>Classification, pool eligibility, difficulty, source and review reason shown per identity.</div></header>
<main class="grid">${cards}</main></body></html>`
}

function renderCard(entry) {
  const features = entry.unassignedFeature ? [entry.unassignedFeature] : featuresByCode.get(entry.iso3) ?? []
  const collection = { type: 'FeatureCollection', features }
  const preferred = entry.localCenter
  const center = preferred && Number.isFinite(preferred.lon) && Number.isFinite(preferred.lat)
    ? [preferred.lon, preferred.lat]
    : geoCentroid(collection)
  const projection = geoEqualEarth().rotate([-center[0], -center[1]]).fitExtent([[16, 14], [944, 466]], collection)
  const path = geoPath(projection)
  const paths = features.map((feature) => `<path d="${path(feature) ?? ''}"></path>`).join('')
  const classification = entry.classification.replaceAll('-', ' ')
  const outline = entry.outline
  const difficulty = outline?.status === 'eligible' ? `Outline ${outline.difficulty}` : 'Outline excluded'
  const status = outline?.status === 'eligible' ? 'eligible' : 'excluded'
  const standard = entry.iso3 ? (entry.standardEligible ? 'Standard' : 'Extended') : 'No catalogue ID'
  const extended = entry.iso3 ? (entry.extendedEligible ? 'Extended eligible' : 'Special only') : 'Not in question pools'
  const reason = outline?.reason ?? 'No outline playability rule found.'
  const geometry = `${entry.geometry.featureCount} feature${entry.geometry.featureCount === 1 ? '' : 's'} · ${entry.geometry.polygonCount} polygons · ${entry.geometry.vertexCount.toLocaleString()} vertices`
  const codeLabel = entry.iso3 ?? (entry.featureId ? `NE ${entry.featureId}` : 'No ISO3')
  return `<article class="card ${status}"><div class="map"><svg viewBox="0 0 960 480" role="img" aria-label="${escapeHtml(entry.name)} silhouette">${paths}</svg></div><div class="title"><span>${escapeHtml(entry.name)}</span><span class="code">${escapeHtml(codeLabel)}</span></div><div class="chips"><span class="chip">${escapeHtml(classification)}</span><span class="chip">${standard}</span><span class="chip">${extended}</span><span class="chip ${status === 'eligible' ? 'ok' : ''}">${difficulty}</span></div><div class="reason">${escapeHtml(reason)}</div><div class="source">${geometry} · ${escapeHtml(entry.geometry.source)} · ${escapeHtml(entry.geometry.license)}</div></article>`
}

function renderIndex(pages, summary) {
  const links = pages.map((page) => `<li><a href="${page.filename}.html">${escapeHtml(page.region)} · sheet ${page.pageNumber}</a> (${page.count} identities; <a href="${page.filename}-light.png">light</a> / <a href="${page.filename}-dark.png">dark</a>)</li>`).join('\n')
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maproom outline catalogue audit</title><style>body{font:15px/1.5 system-ui,sans-serif;max-width:900px;margin:32px auto;padding:0 20px;color:#292622;background:#f5eee5}h1{font-size:28px}li{margin:6px 0}a{color:#ad4d1e}.counts{padding:14px;background:#fffaf3;border:1px solid #d5c7b7;border-radius:6px}</style><h1>Maproom visual outline audit</h1><p>Every one of the ${summary.counts.catalogueIdentities} catalogue identities is represented. Review the HTML gallery or both theme screenshots for each regional sheet.</p><p class="counts">${summary.counts.standardIdentities} Standard · ${summary.counts.ordinaryExtendedIdentities} ordinary Extended · ${summary.counts.separatelyRepresentedTerritories} separately represented territories · ${summary.counts.specialGeographicEntities} special records · outline: ${summary.counts.playability.easy} Easy / ${summary.counts.playability.medium} Medium / ${summary.counts.playability.hard} Hard / ${summary.counts.playability.excluded} excluded.</p><p>Geometry source: <a href="${summary.sources.outline.source}">${escapeHtml(summary.sources.outline.name)}</a> · ${escapeHtml(summary.sources.outline.license)} · ${escapeHtml(summary.sources.outline.attribution)}</p><ul>${links}</ul><p>Machine-readable audit: <a href="catalogue-audit.json">catalogue-audit.json</a>.</p></html>`
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}
