import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const seedsPath = path.join(root, 'docs/data/historical/flag-seeds.json')
const outputRoot = path.join(root, 'public/data/historical/flags/v1')
const assetRoot = path.join(outputRoot, 'flags')
const manifestPath = path.join(outputRoot, 'manifest.json')
const artworkLicense = 'Creative Commons Attribution 4.0 International'
const artworkLicenseUrl = 'https://creativecommons.org/licenses/by/4.0/'
const designs = new Set(['plain', 'horizontal-tricolour', 'five-colour', 'vertical-tricolour', 'thirteen-stars', 'union-1801', 'spanish-naval', 'trigarante', 'brazil-empire', 'crescent-star', 'italy-savoy', 'hinomaru', 'australia-1901', 'canada-red-ensign', 'israel', 'india', 'china-stars', 'soviet', 'gdr'])
const seeds = JSON.parse(await readFile(seedsPath, 'utf8'))
if (!Array.isArray(seeds) || seeds.length < 16) throw new Error('At least 16 curated historical flags are required.')

await mkdir(assetRoot, { recursive: true })
const keep = new Set()
const items = []
const ids = new Set()
for (const [index, seed] of seeds.entries()) {
  if (!isRecord(seed) || typeof seed.id !== 'string' || !/^[a-z0-9-]+$/.test(seed.id) || ids.has(seed.id)
    || typeof seed.entity !== 'string' || !seed.entity || typeof seed.flagName !== 'string' || !seed.flagName
    || typeof seed.entityType !== 'string' || !seed.entityType
    || !Number.isInteger(seed.periodStartYear) || !Number.isInteger(seed.periodEndYear)
    || seed.periodStartYear > seed.periodEndYear || typeof seed.region !== 'string' || !seed.region
    || !['documented', 'reconstructed'].includes(seed.status)
    || typeof seed.artworkNote !== 'string' || !seed.artworkNote || typeof seed.clue !== 'string' || !seed.clue
    || typeof seed.explanation !== 'string' || !seed.explanation || typeof seed.periodLabel !== 'string' || !seed.periodLabel
    || typeof seed.sourceTitle !== 'string' || !seed.sourceTitle
    || typeof seed.sourceUrl !== 'string' || !seed.sourceUrl.startsWith('https://') || !Array.isArray(seed.colors)
    || seed.colors.length === 0 || !seed.colors.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
    || !designs.has(seed.design)
    || (seed.additionalSources !== undefined && (!Array.isArray(seed.additionalSources)
      || seed.additionalSources.some((source) => !isRecord(source) || typeof source.title !== 'string' || !source.title
        || typeof source.url !== 'string' || !source.url.startsWith('https://'))))) {
    throw new Error(`Invalid historical flag seed at index ${index}.`)
  }
  ids.add(seed.id)
  const svg = renderFlag(seed)
  const assetSha256 = sha256(svg)
  const assetUrl = `/data/historical/flags/v1/flags/${seed.id}.svg`
  await writeFile(path.join(assetRoot, `${seed.id}.svg`), svg)
  keep.add(`${seed.id}.svg`)
  items.push({
    id: seed.id,
    entity: seed.entity,
    entityType: seed.entityType,
    flagName: seed.flagName,
    periodStartYear: seed.periodStartYear,
    periodEndYear: seed.periodEndYear,
    periodLabel: seed.periodLabel,
    region: seed.region,
    designStatus: seed.status,
    artworkNote: seed.artworkNote,
    visibleClue: seed.clue,
    explanation: seed.explanation,
    source: { title: seed.sourceTitle, url: seed.sourceUrl },
    ...(Array.isArray(seed.additionalSources) ? { additionalSources: seed.additionalSources } : {}),
    artworkLicense,
    artworkLicenseUrl,
    artworkAttribution: `Maproom original vector redraw based on ${seed.sourceTitle}. ${artworkLicense}.`,
    assetUrl,
    assetSha256,
  })
}
if (new Set(items.map((item) => item.entity)).size < 14) throw new Error('The curated flag pool must include at least 14 distinct political entities.')
for (const file of await readdir(assetRoot)) {
  if (file.endsWith('.svg') && !keep.has(file)) await rm(path.join(assetRoot, file))
}
const manifest = {
  schemaVersion: 1,
  contentVersion: 'historical-flags-v1',
  artworkLicense,
  artworkLicenseUrl,
  scope: 'A curated learning set of historically documented flags and standards with explicit periods of use. A reconstructed drawing is identified as such on its question and reveal.',
  items,
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${items.length} historical flag vectors for ${new Set(items.map((item) => item.entity)).size} political entities.`)

function renderFlag(seed) {
  const c = seed.colors
  let body = ''
  if (seed.design === 'plain') body = rect(0, 0, 600, 400, c[0])
  else if (seed.design === 'horizontal-tricolour' || seed.design === 'five-colour') {
    body = c.map((color, index) => rect(0, index * 400 / c.length, 600, 400 / c.length, color)).join('')
  } else if (seed.design === 'vertical-tricolour') {
    body = c.map((color, index) => rect(index * 200, 0, 200, 400, color)).join('')
  } else if (seed.design === 'thirteen-stars') {
    body = Array.from({ length: 13 }, (_, index) => rect(0, index * 400 / 13, 600, 400 / 13, index % 2 ? c[1] : c[0])).join('')
      + rect(0, 0, 245, 216, c[2])
      + circleStars(122.5, 108, 67, 13, 13, '#ffffff')
  } else if (seed.design === 'union-1801') body = unionFlag(600, 400, c[0], c[1], c[2])
  else if (seed.design === 'spanish-naval') {
    body = rect(0, 0, 600, 100, c[0]) + rect(0, 100, 600, 200, c[1]) + rect(0, 300, 600, 100, c[0])
      + royalShield(150, 200, 58, 72, c[0], c[1])
  } else if (seed.design === 'trigarante') body = trigarante(c)
  else if (seed.design === 'brazil-empire') body = brazilEmpire(c)
  else if (seed.design === 'crescent-star') body = rect(0, 0, 600, 400, c[0]) + crescent(245, 200, 87, 72, c[1], c[0]) + star(355, 200, 54, 5, c[1])
  else if (seed.design === 'italy-savoy') {
    body = c.slice(0, 3).map((color, index) => rect(index * 200, 0, 200, 400, color)).join('')
      + `<path d="${shieldPath(300, 188, 74, 98)}" fill="#b32932" stroke="#2d6191" stroke-width="8"/><path d="M300 119V247 M263 178H337" stroke="#fff" stroke-width="15"/>`
      + crown(300, 98, 62, 43, '#d7b34a')
  } else if (seed.design === 'hinomaru') body = rect(0, 0, 600, 400, c[0]) + `<circle cx="300" cy="200" r="100" fill="${c[1]}"/>`
  else if (seed.design === 'australia-1901') {
    body = rect(0, 0, 600, 400, c[0]) + unionFlag(250, 190, '#18356b', '#ffffff', '#c63237')
      + star(145, 270, 34, 6, '#ffffff')
      + star(425, 92, 17, 5, '#ffffff') + star(485, 163, 16, 5, '#ffffff')
      + star(424, 241, 16, 5, '#ffffff') + star(365, 164, 15, 5, '#ffffff') + star(475, 286, 15, 5, '#ffffff')
  } else if (seed.design === 'canada-red-ensign') {
    body = rect(0, 0, 600, 400, c[0]) + unionFlag(250, 190, '#18356b', '#ffffff', '#c63237')
      + `<path d="${shieldPath(438, 235, 91, 116)}" fill="#f8f6ef" stroke="#303238" stroke-width="5"/><path d="M356 197H520 M356 242H520" stroke="#bd2d3c" stroke-width="28"/><path d="M397 279H479" stroke="#216944" stroke-width="17"/>`
      + `<path d="M413 270q12-14 24 0q12-14 24 0q-4 15-24 19q-20-4-24-19" fill="#c52d38"/>`
  } else if (seed.design === 'israel') {
    body = rect(0, 0, 600, 400, '#ffffff') + rect(0, 64, 600, 45, c[1]) + rect(0, 291, 600, 45, c[1])
      + `<polygon points="300,123 365,236 235,236" fill="none" stroke="${c[1]}" stroke-width="13"/><polygon points="300,277 235,164 365,164" fill="none" stroke="${c[1]}" stroke-width="13"/>`
  } else if (seed.design === 'india') {
    body = rect(0, 0, 600, 133.333, c[0]) + rect(0, 133.333, 600, 133.333, c[1]) + rect(0, 266.666, 600, 133.334, c[2])
      + `<circle cx="300" cy="200" r="47" fill="none" stroke="${c[3]}" stroke-width="5"/>`
      + Array.from({ length: 24 }, (_, index) => `<path d="M300 157V243" stroke="${c[3]}" stroke-width="2.5" transform="rotate(${index * 15} 300 200)"/>`).join('')
  } else if (seed.design === 'china-stars') {
    body = rect(0, 0, 600, 400, c[0]) + star(105, 116, 51, 5, c[1])
      + star(194, 58, 18, 5, c[1], 147) + star(236, 100, 18, 5, c[1], 180)
      + star(236, 156, 18, 5, c[1], 197) + star(194, 198, 18, 5, c[1], 223)
  } else if (seed.design === 'soviet') {
    body = rect(0, 0, 600, 400, c[0]) + star(144, 86, 37, 5, c[1]) + star(144, 86, 31, 5, c[0])
      + `<g fill="${c[1]}" transform="translate(150 225) rotate(-35)"><rect x="-12" y="-4" width="24" height="106"/><path d="M-48-43H48V-14H-48Z"/></g>`
      + `<path d="M155 193a53 53 0 1 0 50 72a39 39 0 1 1-50-72Z" fill="${c[1]}"/><circle cx="204" cy="235" r="28" fill="${c[0]}"/>`
  } else if (seed.design === 'gdr') {
    body = rect(0, 0, 600, 133.333, c[0]) + rect(0, 133.333, 600, 133.333, c[1]) + rect(0, 266.666, 600, 133.334, c[2])
      + `<circle cx="300" cy="200" r="72" fill="#e4c244"/><circle cx="300" cy="200" r="56" fill="#b38d2c"/><circle cx="300" cy="200" r="45" fill="#222222"/>`
      + `<path d="M265 189h70v18h-70z M294 164h12v72h-12z" fill="#f6f0d7"/><path d="M284 163l32 75M316 163l-32 75" stroke="#f6f0d7" stroke-width="5"/>`
      + `<circle cx="300" cy="200" r="76" fill="none" stroke="#e4c244" stroke-width="8" stroke-dasharray="7 8"/>`
  }
  const title = xml(seed.flagName)
  const artworkDescription = seed.status === 'reconstructed' ? 'a reconstructed historical flag design' : 'a documented historical flag design'
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">A Maproom vector redraw of ${artworkDescription}.</desc>${body}<rect x="1" y="1" width="598" height="398" fill="none" stroke="#282828" stroke-opacity=".28" stroke-width="2"/></svg>\n`
}

function unionFlag(width, height, blue, white, red) {
  const h = height
  const w = width
  return rect(0, 0, w, h, blue)
    + `<path d="M0 0h${w * .12}L${w} ${h * .84}V${h}h-${w * .12}L0 ${h * .16}Z" fill="${white}"/><path d="M${w} 0h-${w * .12}L0 ${h * .84}V${h}h${w * .12}L${w} ${h * .16}Z" fill="${white}"/>`
    + `<path d="M0 0h${w * .06}L${w} ${h * .9}V${h}h-${w * .06}L0 ${h * .1}Z" fill="${red}"/><path d="M${w} 0h-${w * .06}L0 ${h * .9}V${h}h${w * .06}L${w} ${h * .1}Z" fill="${red}"/>`
    + rect(0, h * .35, w, h * .3, white) + rect(w * .42, 0, w * .16, h, white)
    + rect(0, h * .41, w, h * .18, red) + rect(w * .455, 0, w * .09, h, red)
}

function trigarante(c) {
  let body = '<g transform="rotate(-28 300 200)">'
  body += rect(-110, -260, 273, 920, c[0]) + rect(163, -260, 273, 920, c[1]) + rect(436, -260, 273, 920, c[2]) + '</g>'
  body += star(199, 200, 27, 5, c[3]) + star(300, 200, 27, 5, c[3]) + star(401, 200, 27, 5, c[3])
  body += crown(300, 129, 53, 44, c[3])
  return body
}

function brazilEmpire(c) {
  return rect(0, 0, 600, 400, c[0])
    + `<polygon points="300,42 535,200 300,358 65,200" fill="${c[1]}"/>`
    + `<circle cx="300" cy="200" r="73" fill="${c[2]}" stroke="${c[3]}" stroke-width="12"/>`
    + circleStars(300, 200, 48, 19, 19, '#ffffff')
    + `<path d="M300 111l-32 24h64z" fill="#c52d38" stroke="${c[3]}" stroke-width="8"/>`
    + crown(300, 111, 53, 42, c[3])
}

function royalShield(cx, cy, width, height, red, gold) {
  return `<path d="${shieldPath(cx, cy, width, height)}" fill="${red}" stroke="${gold}" stroke-width="6"/><path d="M${cx} ${cy - height * .32}v${height * .6} M${cx - width * .3} ${cy - height * .02}h${width * .6}" stroke="#f8f6ef" stroke-width="7"/>${crown(cx, cy - height * .55, width * .46, height * .27, gold)}`
}

function crown(cx, cy, width, height, fill) {
  const points = `${cx - width / 2},${cy + height / 2} ${cx - width / 2},${cy + height / 5} ${cx - width / 3},${cy - height / 3} ${cx - width / 8},${cy + height / 8} ${cx},${cy - height / 2} ${cx + width / 8},${cy + height / 8} ${cx + width / 3},${cy - height / 3} ${cx + width / 2},${cy + height / 5} ${cx + width / 2},${cy + height / 2}`
  return `<polygon points="${points}" fill="${fill}" stroke="#72581e" stroke-width="4"/><path d="M${cx - width / 2} ${cy + height * .53}H${cx + width / 2}" stroke="#72581e" stroke-width="8"/>`
}

function shieldPath(cx, cy, width, height) {
  return `M${cx - width / 2} ${cy - height / 2}H${cx + width / 2}V${cy + height * .06}Q${cx + width * .42} ${cy + height * .36} ${cx} ${cy + height / 2}Q${cx - width * .42} ${cy + height * .36} ${cx - width / 2} ${cy + height * .06}Z`
}

function crescent(cx, cy, radius, cutout, fill, background) {
  const innerRadius = radius * .72
  const offset = radius - cutout + innerRadius * .28
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}"/><circle cx="${cx + offset}" cy="${cy}" r="${innerRadius}" fill="${background}"/>`
}

function circleStars(cx, cy, radius, count, starRadius, fill) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2
    return star(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, starRadius, 5, fill)
  }).join('')
}

function star(cx, cy, radius, points, fill, rotationDegrees = -90) {
  const inner = radius * .43
  const coords = []
  for (let index = 0; index < points * 2; index += 1) {
    const angle = index * Math.PI / points + rotationDegrees * Math.PI / 180
    const r = index % 2 ? inner : radius
    coords.push(`${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`)
  }
  return `<polygon points="${coords.join(' ')}" fill="${fill}"/>`
}

function rect(x, y, width, height, fill) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`
}

function xml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function sha256(value) { return createHash('sha256').update(value).digest('hex') }
