import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const deploymentConfig = await readFile(path.join(root, 'scripts/finalize-deployment.sh'), 'utf8')
const domain = deploymentConfig.match(/^readonly DOMAIN='([^']+)'$/m)?.[1]
if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) {
  throw new Error('Could not read a valid production hostname from scripts/finalize-deployment.sh.')
}
const origin = `https://${domain}`

const vite = await createServer({ root, logLevel: 'error', server: { middlewareMode: true } })
let metadata
try {
  metadata = await vite.ssrLoadModule('/src/seo/routeMetadata.ts')
} finally {
  await vite.close()
}

const { allMetadataPages, gamePages, getStructuredData } = metadata
const template = await readFile(path.join(dist, 'index.html'), 'utf8')
const socialImage = `${origin}/social/maproom-preview.png`

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function updateMeta(html, id, content) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\bid="${id}")[^>]*>`, 'i')
  const tag = html.match(pattern)?.[0]
  if (!tag) throw new Error(`Missing metadata tag: ${id}`)
  const attributes = tag.replace(/\scontent="[^"]*"/i, '').replace(/\s*\/?\s*>$/, '')
  return html.replace(pattern, `${attributes} content="${escapeHtml(content)}" />`)
}

function updateCanonical(html, canonicalUrl) {
  const pattern = /<link\b(?=[^>]*\bid="canonical-url")[^>]*>/i
  const tag = html.match(pattern)?.[0]
  if (!tag) throw new Error('Missing canonical link element.')
  const attributes = tag.replace(/\shref="[^"]*"/i, '').replace(/\s*\/?\s*>$/, '')
  return html.replace(pattern, `${attributes} href="${escapeHtml(canonicalUrl)}" />`)
}

function renderSnapshot(page) {
  const links = page.game
    ? '<p><a href="/explore">Browse all geography games</a> · <a href="/">Today’s daily puzzles</a></p>'
    : page.path === '/explore'
      ? `<ul class="seo-game-links">${gamePages.map((game) => `<li><a href="${escapeHtml(game.path)}">${escapeHtml(game.game.title)}</a><span> — ${escapeHtml(game.summary)}</span></li>`).join('')}</ul>`
      : page.path === '/'
        ? '<p><a href="/explore">Explore all geography games</a></p>'
        : page.path === '/about'
          ? '<p><a href="/explore">Browse geography games</a> · <a href="/data">Read about geography data sources</a> · <a href="/privacy">Privacy</a></p>'
          : page.path === '/data'
            ? '<p><a href="/about">About Maproom</a> · <a href="/explore">Explore geography games</a></p>'
            : page.path === '/privacy'
              ? '<p><a href="/about">About Maproom</a></p>'
              : '<p><a href="/">Return to today’s puzzles</a> · <a href="/explore">Explore games</a></p>'

  return `<main id="seo-snapshot" class="seo-snapshot"><p>Maproom · Geography games</p><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.summary)}</p>${links}</main>`
}

function renderPage(page) {
  const canonicalUrl = new URL(page.path, origin).href
  const structuredData = JSON.stringify(getStructuredData(page, canonicalUrl)).replaceAll('<', '\\u003c')
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
  html = updateMeta(html, 'meta-description', page.description)
  html = updateMeta(html, 'meta-robots', page.robots)
  html = updateMeta(html, 'og-title', page.title)
  html = updateMeta(html, 'og-description', page.description)
  html = updateMeta(html, 'og-url', canonicalUrl)
  html = updateMeta(html, 'og-image', socialImage)
  html = updateMeta(html, 'twitter-title', page.title)
  html = updateMeta(html, 'twitter-description', page.description)
  html = updateMeta(html, 'twitter-image', socialImage)
  html = updateCanonical(html, canonicalUrl)
  html = html.replace(/<script id="structured-data"[^>]*>[\s\S]*?<\/script>/i, `<script id="structured-data" type="application/ld+json">${structuredData}</script>`)
  html = html.replace('<div id="root"></div>', `<div id="root">${renderSnapshot(page)}</div>`)
  if (!html.includes('seo-snapshot')) throw new Error(`Could not render the static content snapshot for ${page.path}.`)
  return html
}

for (const page of allMetadataPages) {
  const outputPath = page.path === '/'
    ? path.join(dist, 'index.html')
    : path.join(dist, page.path.slice(1), 'index.html')
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, renderPage(page))
}

const sitemapPages = allMetadataPages.filter((page) => page.robots === 'index,follow')
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapPages.map((page) => `  <url><loc>${escapeHtml(new URL(page.path, origin).href)}</loc></url>`),
  '</urlset>',
  '',
].join('\n')
await writeFile(path.join(dist, 'sitemap.xml'), sitemap)

const robotsPath = path.join(dist, 'robots.txt')
const robots = (await readFile(robotsPath, 'utf8')).replace(/^Sitemap:.*$/m, `Sitemap: ${origin}/sitemap.xml`)
await writeFile(robotsPath, robots)

console.log(`Generated ${allMetadataPages.length} route snapshots and a sitemap with ${sitemapPages.length} indexable URLs for ${origin}.`)
