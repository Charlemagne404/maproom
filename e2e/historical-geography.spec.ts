import { expect, test, type Page } from '@playwright/test'

type HistoricalMapEntry = { id: string; assetUrl: string; depictedYear: number }
type HistoricalManifest = { maps: HistoricalMapEntry[] }

const toleranceFor = { easy: 100, medium: 50, hard: 25 } as const

async function startHistorical(page: Page) {
  await page.goto('/games/historical-geography?mode=freeplay')
  const start = page.getByRole('button', { name: 'Start free play' })
  await expect(start).toBeEnabled({ timeout: 30_000 })
  await start.click()
  await expect(page.locator('.game-setup-panel')).toBeHidden()
  await expect(page.locator('.historical-map-image')).toBeVisible()
  await expect.poll(() => page.locator('.historical-map-image').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(100)
}

async function currentMap(page: Page): Promise<HistoricalMapEntry> {
  const source = await page.locator('.historical-map-image').getAttribute('src')
  const response = await page.request.get('/data/historical/manifest.json')
  expect(response.ok()).toBe(true)
  const manifest = await response.json() as HistoricalManifest
  const map = manifest.maps.find((item) => item.assetUrl === source)
  expect(map, `manifest entry for ${source}`).toBeDefined()
  return map!
}

async function setDifficulty(page: Page, difficulty: keyof typeof toleranceFor) {
  await page.getByRole('button', { name: 'Historical game settings' }).click()
  await page.getByRole('group', { name: 'Historical game settings' }).getByLabel('Difficulty').selectOption(difficulty)
}

async function submitYear(page: Page, year: number) {
  const yearInput = page.getByRole('spinbutton', { name: 'Your year guess' })
  await expect(yearInput).toBeVisible()
  await yearInput.fill(String(year))
  await expect(yearInput).toHaveValue(String(year))
  await page.getByRole('button', { name: 'Reveal year' }).click()
  await expect(page.locator('.historical-reveal')).toBeVisible()
}

test('Explore and direct routes launch the authored historical game, accept inclusive bounds, reveal sources and replay', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.getByRole('heading', { name: 'Borders across time' })).toBeVisible()
  await expect(page.getByText('20 generated snapshots · 1886–2011')).toBeVisible()
  await expect(page.getByText(/CC BY-NC-SA 4.0 · non-commercial use/)).toBeVisible()
  await page.getByRole('link', { name: /Play When Was This Map/ }).click()
  await expect(page.locator('.game-setup-panel')).toBeVisible()
  await page.getByRole('button', { name: 'Hard · within 25 years' }).click()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.game-setup-panel')).toBeHidden()
  await expect(page.locator('.historical-round-heading p')).toContainText('Maproom-generated snapshot')
  await expect(page.locator('.historical-attribution')).toContainText('non-commercial')

  const firstMap = await currentMap(page)
  await submitYear(page, firstMap.depictedYear + toleranceFor.hard)
  await expect(page.locator('.historical-reveal')).toHaveClass(/is-within-range/)
  await expect(page.locator('.historical-range-note')).toContainText('Hard accepted')
  await page.locator('.historical-source-details summary').click()
  await expect(page.locator('.historical-source-details')).toHaveAttribute('open', '')
  await expect(page.locator('.historical-source-details')).toContainText('Maproom-generated CShapes 2.1 snapshot')
  await expect(page.locator('.historical-source-details')).toContainText('CC BY-NC-SA 4.0')
  await expect(page.locator('.historical-source-details a[href="https://creativecommons.org/licenses/by-nc-sa/4.0/"]')).toBeVisible()

  for (const difficulty of ['medium', 'easy'] as const) {
    await expect(page.getByRole('button', { name: 'Study another map' })).toBeVisible()
    await page.getByRole('button', { name: 'Study another map' }).click()
    await expect(page.locator('.historical-map-image')).toBeVisible()
    await setDifficulty(page, difficulty)
    const map = await currentMap(page)
    await submitYear(page, map.depictedYear + toleranceFor[difficulty])
    await expect(page.locator('.historical-reveal')).toHaveClass(/is-within-range/)
    await expect(page.locator('.historical-range-note')).toContainText(`${difficulty[0]!.toUpperCase()}${difficulty.slice(1)} accepted`)
  }

  await page.goto('/games/historical-geography?mode=freeplay')
  await expect(page.locator('.game-setup-panel')).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.game-body')).toBeVisible()
})

test('an out-of-range year is marked incorrect and the historical context is revealed', async ({ page }) => {
  await startHistorical(page)
  await submitYear(page, 1)
  await expect(page.locator('.historical-reveal')).toHaveClass(/is-outside-range/)
  await expect(page.locator('.historical-context')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('Free Play can order curated snapshots, explain the timeline and restore sequence progress', async ({ page }) => {
  await startHistorical(page)
  await page.getByRole('button', { name: 'Historical game settings' }).click()
  await page.getByRole('group', { name: 'Historical game settings' }).getByLabel('Format').selectOption('sequence')
  await expect(page.getByRole('heading', { name: 'Put the maps in order' })).toBeVisible()
  await expect(page.locator('.historical-sequence-list > li')).toHaveCount(3)
  await expect.poll(() => page.locator('.historical-sequence-list .historical-map-image').evaluateAll((images: HTMLImageElement[]) => images.every((image) => image.naturalWidth > 100))).toBe(true)

  const manifestResponse = await page.request.get('/data/historical/manifest.json')
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json() as HistoricalManifest
  const yearByUrl = new Map(manifest.maps.map((entry) => [entry.assetUrl, entry.depictedYear]))

  async function visibleSequence() {
    return page.locator('.historical-sequence-list > li').evaluateAll((items) => items.map((item) => {
      const image = item.querySelector<HTMLImageElement>('.historical-map-image')
      return image?.getAttribute('src') ?? ''
    }))
  }

  const currentUrls = await visibleSequence()
  const expectedUrls = [...currentUrls].sort((left, right) => (yearByUrl.get(left) ?? 0) - (yearByUrl.get(right) ?? 0))
  await page.locator('.historical-sequence-list > li').nth(2).getByRole('button', { name: /Move map .* earlier/ }).focus()
  await page.locator('.historical-sequence-list > li').nth(2).getByRole('button', { name: /Move map .* earlier/ }).press('Enter')
  await expect.poll(visibleSequence).toEqual([currentUrls[0], currentUrls[2], currentUrls[1]])
  for (let targetIndex = 0; targetIndex < expectedUrls.length; targetIndex += 1) {
    let urls = await visibleSequence()
    let currentIndex = urls.indexOf(expectedUrls[targetIndex]!)
    while (currentIndex > targetIndex) {
      await page.locator('.historical-sequence-list > li').nth(currentIndex).getByRole('button', { name: /Move map .* earlier/ }).click()
      currentIndex -= 1
      urls = await visibleSequence()
    }
    expect(urls[targetIndex]).toBe(expectedUrls[targetIndex])
  }

  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId?: string; payload?: { format?: string; order?: string[] } }>
    const session = sessions.find((item) => item.gameId === 'historical-geography')
    return session?.payload?.format === 'sequence' && session.payload.order?.length === 3
  })).toBe(true)

  const savedOrder = await visibleSequence()
  await page.reload()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.game-setup-panel')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Put the maps in order' })).toBeVisible()
  await expect.poll(visibleSequence).toEqual(savedOrder)

  await page.getByRole('button', { name: 'Check sequence' }).click()
  await expect(page.locator('.historical-sequence-answer > li')).toHaveCount(3)
  for (const [index, url] of expectedUrls.entries()) {
    await expect(page.locator('.historical-sequence-answer > li > strong').nth(index)).toContainText(yearByUrl.get(url)!.toLocaleString('en-US'))
  }
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('3 / 3 correct')
  await expect(page.locator('.historical-sequence-attribution')).toContainText('non-commercial')

  await page.getByRole('button', { name: 'Order another set' }).click()
  await expect(page.locator('.historical-sequence-list > li')).toHaveCount(3)
})

test('historical sequence controls fit a dark, reduced-motion mobile screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await startHistorical(page)
  await page.getByRole('button', { name: 'Historical game settings' }).click()
  await page.getByRole('group', { name: 'Historical game settings' }).getByLabel('Format').selectOption('sequence')
  await expect(page.locator('.historical-sequence-list > li')).toHaveCount(3)
  await page.getByRole('button', { name: 'Switch to dark appearance' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    page: document.querySelector('.historical-geography-game')?.getBoundingClientRect().width ?? 0,
    cards: [...document.querySelectorAll<HTMLElement>('.historical-sequence-item')].map((item) => item.getBoundingClientRect().width),
    controls: [...document.querySelectorAll<HTMLElement>('.historical-sequence-controls .button')].map((button) => button.getBoundingClientRect().height),
  }))
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport)
  expect(dimensions.cards.length).toBe(3)
  expect(dimensions.cards.every((width) => width > 250)).toBe(true)
  expect(dimensions.controls.every((height) => height >= 42)).toBe(true)
  await context.close()
})

test('a fetched historical map and unfinished guess reopen offline through the service worker', async ({ page, context }) => {
  await startHistorical(page)
  const map = await currentMap(page)
  const yearInput = page.getByRole('spinbutton', { name: 'Your year guess' })
  await yearInput.fill(String(map.depictedYear))
  await expect(yearInput).toHaveValue(String(map.depictedYear))
  await expect.poll(() => page.evaluate((year) => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId?: string; payload?: { guess?: string } }>
    return sessions.some((session) => session.gameId === 'historical-geography' && session.payload?.guess === String(year))
  }, map.depictedYear)).toBe(true)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  const cachedAssets = await page.evaluate(async ({ manifestUrl, mapUrl }) => {
    await Promise.all([fetch(manifestUrl), fetch(mapUrl)])
    const cacheNames = await caches.keys()
    const cached = await Promise.all(cacheNames.map(async (name) => {
      const cache = await caches.open(name)
      return [Boolean(await cache.match(manifestUrl)), Boolean(await cache.match(mapUrl))]
    }))
    return { manifest: cached.some(([manifest]) => manifest), map: cached.some(([, asset]) => asset) }
  }, { manifestUrl: '/data/historical/manifest.json', mapUrl: map.assetUrl })
  expect(cachedAssets).toEqual({ manifest: true, map: true })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.game-setup-panel')).toBeHidden()
  await expect(page.getByRole('spinbutton', { name: 'Your year guess' })).toHaveValue(String(map.depictedYear))
  await expect.poll(() => page.locator('.historical-map-image').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(100)
})

test('the historical game stays readable on a dark reduced-motion phone viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await startHistorical(page)
  const theme = page.getByRole('button', { name: 'Switch to dark appearance' })
  await theme.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    page: document.querySelector('.historical-geography-game')?.getBoundingClientRect().width ?? 0,
    input: document.querySelector<HTMLInputElement>('#historical-year-guess')?.getBoundingClientRect().width ?? 0,
  }))
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport)
  expect(dimensions.input).toBeGreaterThan(100)
  await context.close()
})
