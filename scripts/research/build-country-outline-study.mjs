import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { outlineRuleFor } from '../../src/games/outlines/playability.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const targetPath = resolve(root, 'docs/research/competitive-landscape/STUDIES/country-outlines-difficulty.html')
const templatePath = resolve(root, 'scripts/research/country-outline-study.template.html')
const topology = JSON.parse(readFileSync(resolve(root, 'public/data/countries-outline.topo.json'), 'utf8'))
const countryCatalog = JSON.parse(readFileSync(resolve(root, 'public/data/countries.json'), 'utf8')).countries
const dataManifest = JSON.parse(readFileSync(resolve(root, 'public/data/data-manifest.json'), 'utf8'))
const source = dataManifest.sources.find((entry) => entry.name === 'Natural Earth 1:10m Admin 0 Countries')
const outlineCollection = feature(topology, topology.objects.countries)

const sample = [
  ['AFG', 'easy'], ['DZA', 'easy'], ['CUB', 'easy'], ['AUS', 'easy'],
  ['ARM', 'medium'], ['AGO', 'medium'], ['BLZ', 'medium'], ['PNG', 'medium'],
  ['BHR', 'hard'], ['DJI', 'hard'], ['BRB', 'hard'], ['SLB', 'hard'],
]

const orders = {
  A: ['AFG', 'AGO', 'BHR', 'CUB', 'BLZ', 'DJI', 'AUS', 'PNG', 'SLB', 'DZA', 'ARM', 'BRB'],
  B: ['BLZ', 'DJI', 'AUS', 'PNG', 'SLB', 'DZA', 'ARM', 'BRB', 'AFG', 'AGO', 'BHR', 'CUB'],
  C: ['SLB', 'DZA', 'ARM', 'BRB', 'AFG', 'AGO', 'BHR', 'CUB', 'BLZ', 'DJI', 'AUS', 'PNG'],
}

if (!source || !source.license || !source.attribution) throw new Error('Natural Earth outline source metadata is missing.')
if (Object.values(orders).some((order) => order.length !== sample.length || new Set(order).size !== sample.length || order.some((code) => !sample.some(([sampleCode]) => sampleCode === code)))) {
  throw new Error('Study presentation orders must each contain every sample target exactly once.')
}

const geometriesByCode = new Map(outlineCollection.features.map((entry) => [entry.properties.iso3, entry]))
const countriesByCode = new Map(countryCatalog.map((country) => [country.iso3, country]))
const stimuli = sample.map(([code, difficulty]) => {
  const rule = outlineRuleFor(code)
  const country = countriesByCode.get(code)
  const geometry = geometriesByCode.get(code)
  if (!rule || rule.status !== 'eligible' || rule.difficulty !== difficulty || !country || !geometry) {
    throw new Error(`Study target ${code} is missing geometry or is no longer in its reviewed ${difficulty} tier.`)
  }

  const projection = geoEqualEarth()
  if (country.coordinates && Number.isFinite(country.coordinates.lon) && Number.isFinite(country.coordinates.lat)) {
    projection.rotate([-country.coordinates.lon, -country.coordinates.lat])
  }
  projection.fitExtent([[16, 14], [944, 466]], geometry)
  const path = geoPath(projection).digits(2)(geometry)
  if (!path) throw new Error(`Study target ${code} did not produce a renderable outline.`)
  return {
    code,
    difficulty,
    name: country.name,
    continent: country.continent,
    aliases: [...new Set([country.name, ...country.aliases, code])],
    path,
  }
})

const template = readFileSync(templatePath, 'utf8')
const html = template
  .replace('__STIMULI_JSON__', JSON.stringify({ stimuli, orders }).replace(/</g, '\\u003c'))
  .replace('__GEOMETRY_ATTRIBUTION__', escapeHtml(source.attribution))
  .replace('__GEOMETRY_LICENSE__', escapeHtml(source.license))
  .replace('__GEOMETRY_SOURCE_URL__', escapeHtml(source.source))

mkdirSync(dirname(targetPath), { recursive: true })
writeFileSync(targetPath, html)
console.log(`Wrote ${targetPath} with ${stimuli.length} checked, inline silhouettes and three counterbalanced orders.`)

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}
