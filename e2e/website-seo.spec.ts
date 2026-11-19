import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const productionOrigin = 'https://maproom.continental-hub.com'
const distDir = path.resolve(process.cwd(), 'dist')

function routeSnapshotPath(route: string): string {
  return route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route.slice(1), 'index.html')
}

test('build emits route-specific metadata and useful HTML snapshots before JavaScript runs', async () => {
  const cases = [
    { path: '/', title: 'Maproom | Daily geography puzzles and free games', heading: 'Today’s geography puzzles' },
    { path: '/explore', title: 'Geography games and country quizzes | Maproom', heading: 'Geography games' },
    { path: '/about', title: 'About Maproom | Free geography games', heading: 'About Maproom' },
    { path: '/data', title: 'Geography data sources | Maproom', heading: 'Geography data sources' },
    { path: '/games/cities', title: 'Capital city quiz and map game | Maproom', heading: 'Capitals & cities' },
    { path: '/games/projection-match', title: 'Map projection quiz | Maproom', heading: 'Map Projection Match' },
    { path: '/games/population-pyramid', title: 'Population Pyramid Sort | Maproom', heading: 'Population Pyramid Sort' },
  ]

  for (const route of cases) {
    const html = await readFile(routeSnapshotPath(route.path), 'utf8')
    expect(html).toContain(`<title>${route.title}</title>`)
    expect(html).toContain(`<h1>${route.heading.replaceAll('&', '&amp;')}</h1>`)
    expect(html).toContain(`rel="canonical" href="${productionOrigin}${route.path === '/' ? '/' : route.path}"`)
    expect(html).toContain('property="og:title"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('application/ld+json')
  }
})

test('the sitemap lists only canonical public content routes', async () => {
  const sitemap = await readFile(path.join(distDir, 'sitemap.xml'), 'utf8')
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!)
  expect(urls).toHaveLength(21)
  expect(urls).toContain(`${productionOrigin}/`)
  expect(urls).toContain(`${productionOrigin}/explore`)
  expect(urls).toContain(`${productionOrigin}/games/countries`)
  expect(urls).toContain(`${productionOrigin}/games/watershed-match`)
  expect(urls).toContain(`${productionOrigin}/games/historical-geography`)
  expect(urls).toContain(`${productionOrigin}/games/projection-match`)
  expect(urls).toContain(`${productionOrigin}/games/population-pyramid`)
  expect(urls).not.toContain(`${productionOrigin}/settings`)
  expect(urls).not.toContain(`${productionOrigin}/statistics`)
  expect(urls.every((url) => !url.includes('?'))).toBe(true)

  for (const url of urls) {
    const route = new URL(url).pathname
    const html = await readFile(routeSnapshotPath(route), 'utf8')
    expect(html).toContain(`rel="canonical" href="${url}"`)
    expect(html).toContain('<h1>')
  }

  const robots = await readFile(path.join(distDir, 'robots.txt'), 'utf8')
  expect(robots).toContain(`Sitemap: ${productionOrigin}/sitemap.xml`)
  expect(robots).toContain('Allow: /')
})

test('social preview image is a local 1200 by 630 PNG', async ({ request }) => {
  const response = await request.get('/social/maproom-preview.png')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('image/png')
  const bytes = await response.body()
  expect(bytes.readUInt32BE(16)).toBe(1200)
  expect(bytes.readUInt32BE(20)).toBe(630)
})

test('query variants are noindex and use their clean route as canonical', async ({ page }) => {
  await page.goto('/explore?filter=favorites')
  await expect(page).toHaveTitle('Geography games and country quizzes | Maproom')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${productionOrigin}/explore`)
})

test('unknown game routes show a noindex not-found page', async ({ page }) => {
  await page.goto('/games/not-a-game')
  await expect(page.getByRole('heading', { name: 'We can’t find that place.' })).toBeVisible()
  await expect(page).toHaveTitle('Page not found | Maproom')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow')
})
