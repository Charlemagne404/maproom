import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const screenshotDirectory = 'artifacts/qa/historical-expansion'

type AtlasMap = {
  id: string
  sampleYear: number
  acceptedFromYear: number
  acceptedToYear: number
  assetUrl: string
  region: { name: string }
  polities: Array<{ name: string }>
}
type AtlasManifest = { maps: AtlasMap[] }
type HistoricalFlag = { entity: string; assetUrl: string; source: { url: string }; artworkLicenseUrl: string }
type FlagsManifest = { items: HistoricalFlag[] }

test.beforeAll(() => mkdirSync(screenshotDirectory, { recursive: true }))

async function startGame(page: Page, gameId: string) {
  await page.goto(`/games/${gameId}?mode=freeplay`)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.game-body')).toBeVisible()
}

async function loadAtlas(page: Page): Promise<AtlasManifest> {
  const response = await page.request.get('/data/historical/atlas/v2/manifest.json')
  expect(response.ok()).toBe(true)
  return await response.json() as AtlasManifest
}

async function currentAtlasMap(page: Page, manifest: AtlasManifest): Promise<AtlasMap> {
  const assetUrl = await page.locator('.historical-atlas-map-image').getAttribute('src')
  const map = manifest.maps.find((item) => item.assetUrl === assetUrl)
  expect(map, `atlas manifest entry for ${assetUrl}`).toBeDefined()
  return map!
}

test('Historical Geography accepts BCE years without year zero, uses source intervals and reveals attribution', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/games/historical-geography?mode=freeplay')
  await expect(page.getByRole('dialog')).toBeVisible()
  const setup = page.getByRole('dialog')
  await setup.getByLabel('Period').selectOption('ancient')
  await setup.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: /Challenge/ }).click()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  const image = page.locator('.historical-atlas-map-image')
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(100)

  const manifest = await loadAtlas(page)
  const map = await currentAtlasMap(page, manifest)
  expect(map.sampleYear).toBeLessThan(-500)
  const year = page.getByRole('textbox', { name: 'Your year estimate' })
  await year.fill('0')
  await page.getByLabel('BCE or CE').selectOption('CE')
  await page.getByRole('button', { name: 'Reveal period' }).click()
  await expect(page.getByRole('alert')).toContainText('Enter a whole CE year from 1 to 9999')

  await page.getByLabel('BCE or CE').selectOption('BCE')
  await year.fill(String(Math.abs(map.sampleYear)))
  await year.press('Enter')
  const reveal = page.locator('.historical-atlas-reveal')
  await expect(reveal).toBeVisible()
  await expect(reveal).toHaveClass(/is-within-range/)
  await expect(reveal.locator('h3')).toContainText('BCE')
  await expect(reveal).toContainText('Score:')
  const sourceDetails = reveal.locator('.historical-source-details')
  await sourceDetails.locator('summary').click()
  await expect(sourceDetails).toContainText('Cliopatria v0.2.1 data and documentation')
  await expect(sourceDetails.locator('a[href="https://creativecommons.org/licenses/by/4.0/"]')).toBeVisible()
  await page.screenshot({ path: `${screenshotDirectory}/historical-atlas-bce-desktop.png`, fullPage: true })
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog')).toContainText('Inside the source period')
  await page.locator('.game-results-dialog').getByRole('button', { name: 'Study another map' }).click()
  await expect(page.locator('.historical-atlas-map-image')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Your year estimate' })).toHaveValue('')
})

test('Historical Geography orders three maps with keyboard controls and restores the chosen order', async ({ page }) => {
  await page.goto('/games/historical-geography?mode=freeplay')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Order similar maps' }).click()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('heading', { name: /^Order the .+ maps$/ })).toBeVisible()
  const rows = page.locator('.historical-sequence-list > li')
  await expect(rows).toHaveCount(3)
  const imageUrls = await rows.locator('img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  const later = rows.first().getByRole('button', { name: /Move map .* later/ })
  await later.focus()
  await expect(later).toBeFocused()
  await page.keyboard.press('Space')
  await expect.poll(() => rows.locator('img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))).not.toEqual(imageUrls)
  const savedOrder = await rows.locator('img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  const expectedOrderIds = savedOrder.map((url) => url?.slice(url.lastIndexOf('/') + 1).replace(/\.svg$/, ''))
  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId?: string; mode?: string; payload?: { order?: string[] } }>
    return sessions.find((session) => session.gameId === 'historical-geography' && session.mode === 'freeplay')?.payload?.order ?? null
  })).toEqual(expectedOrderIds)
  await page.reload()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('heading', { name: /^Order the .+ maps$/ })).toBeVisible()
  await expect.poll(() => rows.locator('img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))).toEqual(savedOrder)
  await page.getByRole('button', { name: 'Check sequence' }).click()
  await expect(page.locator('.historical-sequence-answer > li')).toHaveCount(3)
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await page.screenshot({ path: `${screenshotDirectory}/historical-sequence-results-desktop.png`, fullPage: true })
  await page.locator('.game-results-dialog').getByRole('button', { name: 'Order another set' }).click()
  await expect(rows).toHaveCount(3)
})

test('Historical States & Empires saves an answered round, finishes a ten-map set and replays', async ({ page }) => {
  await startGame(page, 'historical-states')
  const manifest = await loadAtlas(page)

  async function answerCurrentMap() {
    const map = await currentAtlasMap(page, manifest)
    expect(map.polities.length).toBeGreaterThan(0)
    const answer = map.polities[0]!.name
    await expect(page.locator('.historical-atlas-clue')).toContainText(map.region.name)
    await expect(page.getByText('Source period:', { exact: false })).toHaveCount(0)
    await page.getByRole('button', { name: answer, exact: true }).click()
    await expect(page.locator('.historical-flag-reveal')).toContainText(answer)
    await expect(page.locator('.historical-flag-reveal')).toContainText('Source period:')
    return map
  }

  const firstMap = await answerCurrentMap()
  await page.locator('.historical-source-details summary').click()
  await expect(page.locator('.historical-source-details')).toContainText('Cliopatria v0.2.1 data and documentation')
  await page.reload()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.historical-flag-reveal')).toContainText(firstMap.polities[0]!.name)
  await page.getByRole('button', { name: 'Next map' }).click()

  for (let index = 1; index < 10; index += 1) {
    await answerCurrentMap()
    await page.getByRole('button', { name: index === 9 ? 'Finish set' : 'Next map' }).click()
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog .game-results-summary')).toContainText('10 / 10 correct')
  await expect(page.locator('.game-results-dialog .game-results-score')).toContainText('1,000')
  await page.screenshot({ path: `${screenshotDirectory}/historical-states-results-desktop.png`, fullPage: true })
  await page.locator('.game-results-dialog').getByRole('button', { name: 'Study another set' }).click()
  await expect(page.locator('.historical-round-heading .eyebrow')).toContainText('map 1 of 10')
})

test('Historical Flags restores an answered question, shows its source and completes a set', async ({ page }) => {
  await startGame(page, 'historical-flags')
  const response = await page.request.get('/data/historical/flags/v1/manifest.json')
  expect(response.ok()).toBe(true)
  const manifest = await response.json() as FlagsManifest

  async function answerCurrentFlag() {
    const assetUrl = await page.locator('.historical-flag-prompt img').getAttribute('src')
    const flag = manifest.items.find((item) => item.assetUrl === assetUrl)
    expect(flag, `flag manifest entry for ${assetUrl}`).toBeDefined()
    await page.getByRole('button', { name: flag!.entity, exact: true }).click()
    await expect(page.locator('.historical-flag-reveal h3')).toHaveText(flag!.entity)
    return flag!
  }

  const firstFlag = await answerCurrentFlag()
  await page.locator('.historical-source-details summary').click()
  await expect(page.locator(`.historical-source-details a[href="${firstFlag.source.url}"]`)).toBeVisible()
  await expect(page.locator(`.historical-source-details a[href="${firstFlag.artworkLicenseUrl}"]`)).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.historical-flag-reveal h3')).toHaveText(firstFlag.entity)
  await page.getByRole('button', { name: 'Next flag' }).click()

  for (let index = 1; index < 10; index += 1) {
    await answerCurrentFlag()
    await page.getByRole('button', { name: index === 9 ? 'Finish set' : 'Next flag' }).click()
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog .game-results-summary')).toContainText('10 / 10 correct')
  await page.screenshot({ path: `${screenshotDirectory}/historical-flags-results-desktop.png`, fullPage: true })
  await page.locator('.game-results-dialog').getByRole('button', { name: 'Study another set' }).click()
  await expect(page.locator('.historical-round-heading .eyebrow')).toContainText('question 1 of 10')
  await page.getByRole('button', { name: 'Historical flag settings' }).click()
  await page.getByRole('group', { name: 'Historical flag settings' }).getByLabel('Format').selectOption('polity-to-flag')
  await expect(page.locator('.historical-flag-polity-prompt')).toBeVisible()
  await expect(page.locator('.historical-flag-image-answers .historical-flag-image-answer')).toHaveCount(4)
})

test('historical games share the Explore grid and fit a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/explore')
  await expect(page.locator('.historical-explore-collection')).toHaveCount(0)
  for (const gameId of ['historical-geography', 'historical-flags', 'historical-states']) {
    await expect(page.locator(`.explore-grid .game-card-${gameId}`)).toBeVisible()
  }
  await page.getByRole('button', { name: 'Historical Geography', exact: true }).click()
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(3)
  await page.screenshot({ path: `${screenshotDirectory}/historical-explore-desktop.png`, fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
  await page.screenshot({ path: `${screenshotDirectory}/historical-explore-mobile.png`, fullPage: true })
})
