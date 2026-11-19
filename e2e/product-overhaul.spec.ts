import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { exploreGameCardCount } from './gameCatalogCounts'

const screenshotDirectory = 'artifacts/screenshots/product-overhaul'

test.beforeAll(() => mkdirSync(screenshotDirectory, { recursive: true }))

async function openFreePlay(page: Page, format: string) {
  await page.goto(`/games/flags?mode=freeplay&format=${format}`)
  await expect(page.getByRole('group', { name: 'Free play setup' })).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.game-body')).toBeVisible()
}

async function captureTheme(page: Page, viewport: 'desktop' | 'mobile', theme: 'light' | 'dark') {
  const prefix = `${viewport}-${theme}`
  await page.goto('/settings')
  await page.getByLabel('Appearance', { exact: true }).selectOption(theme)
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

  await page.goto('/')
  await expect(page.locator('.daily-grid .game-card')).toHaveCount(6)
  await expect(page.getByRole('heading', { name: 'Play anytime' })).toBeVisible()
  await page.screenshot({ path: `${screenshotDirectory}/${prefix}-home.png`, fullPage: true })

  await page.goto('/explore')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(exploreGameCardCount)
  const historicalCollection = page.locator('.historical-explore-collection')
  await expect(historicalCollection).toBeVisible()
  await expect(historicalCollection.locator('.historical-explore-license')).toContainText('non-commercial use')
  await expect(historicalCollection.getByRole('link', { name: 'Play When Was This Map?' })).toHaveAttribute('href', '/games/historical-geography?mode=freeplay')
  const exploreGrid = await page.locator('.game-grid.explore-grid[aria-label="Free play games and formats"]').boundingBox()
  for (const gameId of ['rivers', 'latitude-ladder']) {
    const cardWidths = await page.locator(`.game-card-${gameId}`).evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width))
    expect(cardWidths.length).toBeGreaterThan(0)
    expect(cardWidths.every((width) => width > (exploreGrid?.width ?? 0) * 0.25)).toBe(true)
  }
  await page.screenshot({ path: `${screenshotDirectory}/${prefix}-explore.png`, fullPage: true })

  await page.goto('/settings')
  await page.screenshot({ path: `${screenshotDirectory}/${prefix}-settings.png`, fullPage: true })

  await page.goto('/statistics')
  const calendarDays = await page.locator('#activity button.activity-cell').count()
  expect(calendarDays).toBeGreaterThanOrEqual(364)
  expect(calendarDays).toBeLessThanOrEqual(370)
  await expect(page.locator('.activity-total')).toContainText('1 completed in the past year')
  await page.screenshot({ path: `${screenshotDirectory}/${prefix}-statistics.png`, fullPage: true })

  await page.goto('/games/countries?mode=daily')
  await expect(page.locator('.game-context-daily')).toHaveText('Today’s puzzle')
  await expect(page.locator('.game-body')).toBeVisible()
  await page.screenshot({ path: `${screenshotDirectory}/${prefix}-daily-game.png` })

  await page.goto('/games/flags?mode=freeplay&format=country-to-flag')
  await expect(page.getByRole('group', { name: 'Free play setup' })).toBeVisible()
  await page.screenshot({ path: `${screenshotDirectory}/${prefix}-freeplay-setup.png`, fullPage: true })
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.image-choice-grid .flag-choice')).toHaveCount(4)
  await page.screenshot({ path: `${screenshotDirectory}/${prefix}-freeplay-game.png` })

  if (viewport === 'desktop') {
    const gameModes = [
      ['countries', 'daily'], ['outlines', 'daily'], ['routes', 'daily'], ['flags', 'daily'],
      ['grid', 'daily'], ['cities', 'daily'], ['connections', 'freeplay'], ['higher-lower', 'freeplay'],
      ['neighbours', 'freeplay'], ['distance', 'freeplay'], ['rivers', 'daily'],
      ['latitude-ladder', 'daily'], ['historical-geography', 'freeplay'],
    ] as const
    for (const [gameId, mode] of gameModes) {
      await page.goto(`/games/${gameId}?mode=${mode}`)
      if (mode === 'freeplay') await page.getByRole('button', { name: 'Start free play' }).click()
      await expect(page.locator('.game-body')).toBeVisible()
      await page.screenshot({ path: `${screenshotDirectory}/${prefix}-game-${gameId}.png`, animations: 'disabled' })
    }
  }
}

test('captures the product experience in light and dark at desktop and mobile sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await openFreePlay(page, 'flag-to-country')
  const countryResponse = await page.request.get(new URL('/data/countries.json', page.url()).toString())
  expect(countryResponse.ok()).toBe(true)
  const countries = (await countryResponse.json()).countries as Array<{ name: string; flagCode?: string; flagEligible?: boolean }>
  for (let index = 0; index < 10; index += 1) {
    const flagClass = await page.locator('.flag-display [role="img"]').getAttribute('class')
    const flagCode = flagClass?.split(/\s+/).find((name) => name.startsWith('fi-') && name !== 'fi')?.slice(3)
    const expected = countries.find((country) => country.flagCode === flagCode && country.flagEligible !== false)?.name
    expect(expected).toBeTruthy()
    const choices = page.locator('.flag-choice')
    let correctChoice = -1
    for (let choiceIndex = 0; choiceIndex < await choices.count(); choiceIndex += 1) {
      if ((await choices.nth(choiceIndex).locator('.flag-choice-name').innerText()) === expected) correctChoice = choiceIndex
    }
    expect(correctChoice).toBeGreaterThanOrEqual(0)
    await choices.nth(correctChoice).click()
    await expect(page.locator('.flag-choice.is-right')).toBeVisible()
    if (index < 9) await expect(page.getByRole('progressbar', { name: 'flags progress' })).toHaveAttribute('aria-valuenow', String(index + 2), { timeout: 5_000 })
  }

  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await page.goto('/statistics')
  await expect(page.locator('.stat-cell').filter({ hasText: 'Games completed' })).toContainText('1')
  await expect(page.locator('.activity-total')).toContainText('1 completed in the past year')

  await captureTheme(page, 'desktop', 'light')
  await captureTheme(page, 'desktop', 'dark')
  await page.setViewportSize({ width: 390, height: 844 })
  await captureTheme(page, 'mobile', 'light')
  await captureTheme(page, 'mobile', 'dark')
})
