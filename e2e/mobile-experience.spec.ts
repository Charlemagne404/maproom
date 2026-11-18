import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const pageRoutes = [
  ['daily', '/'],
  ['explore', '/explore'],
  ['statistics', '/statistics'],
  ['settings', '/settings'],
] as const

const gameRoutes = [
  ['countries', 'daily'],
  ['outlines', 'daily'],
  ['routes', 'daily'],
  ['flags', 'daily'],
  ['grid', 'daily'],
  ['cities', 'daily'],
  ['connections', 'freeplay'],
  ['higher-lower', 'freeplay'],
  ['neighbours', 'freeplay'],
  ['distance', 'freeplay'],
  ['rivers', 'freeplay'],
  ['latitude-ladder', 'freeplay'],
] as const

const representativeViewports = [
  { width: 320, height: 568 },
  { width: 360, height: 740 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 960 },
]

test('core pages fit phone and tablet viewports without horizontal overflow', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: representativeViewports[0],
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  for (const viewport of representativeViewports) {
    await page.setViewportSize(viewport)
    for (const [, route] of pageRoutes) {
      await page.goto(appUrl(baseURL, route), { waitUntil: 'domcontentloaded' })
      await page.locator('.page').first().waitFor({ state: 'visible' })
      const widths = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      expect(Math.max(widths.document, widths.body), `${route} at ${viewport.width}px`).toBeLessThanOrEqual(widths.viewport)
    }
  }

  await context.close()
})

test('all twelve games open and remain within narrow phone widths', async ({ browser, baseURL }) => {
  test.setTimeout(300_000)
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport)
    for (const [gameId, mode] of gameRoutes) {
      const route = `/games/${gameId}?mode=${mode}`
      await page.goto(appUrl(baseURL, route), { waitUntil: 'domcontentloaded' })
      if (mode === 'freeplay') {
        const start = page.getByRole('button', { name: 'Start free play' })
        await expect(start).toBeVisible()
        await expect(start).toBeEnabled({ timeout: 30_000 })
        await start.click()
      }
      await page.locator('.game-body').waitFor({ state: 'visible', timeout: 30_000 })
      const widths = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      expect(Math.max(widths.document, widths.body), `${gameId} at ${viewport.width}px`).toBeLessThanOrEqual(widths.viewport)

      if (viewport.width <= 760 && gameId === 'countries') {
        const mapTools = await page.locator('.map-tool').evaluateAll((items) => items.map((item) => {
          const { width, height } = item.getBoundingClientRect()
          return { width, height }
        }))
        expect(mapTools.length).toBeGreaterThan(0)
        expect(mapTools.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true)
      }

      if (viewport.width <= 760 && gameId === 'latitude-ladder') {
        const moveButtons = await page.locator('.latitude-move-controls button').evaluateAll((items) => items.map((item) => {
          const { width, height } = item.getBoundingClientRect()
          return { width, height }
        }))
        expect(moveButtons.length).toBeGreaterThan(0)
        expect(moveButtons.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true)
      }
    }
  }

  await context.close()
})

test('mobile navigation opens, moves focus, and closes with Escape in both themes', async ({ browser, baseURL }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      viewport: { width: 320, height: 640 },
      isMobile: true,
      hasTouch: true,
      colorScheme,
    })
    const page = await context.newPage()
    await page.goto(appUrl(baseURL, '/'))
    await page.locator('.daily-grid .game-card').first().waitFor()
    await ensureTheme(page, colorScheme)
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme)

    const toggle = page.getByRole('button', { name: 'Open navigation' })
    await toggle.click()
    await expect(page.locator('.mobile-menu-toggle')).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#primary-navigation')).toBeInViewport()
    await expect(page.locator('#primary-navigation .nav-link').first()).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('.mobile-menu-toggle')).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.mobile-menu-toggle')).toBeFocused()

    const targets = await page.locator('.site-header button, .header-tools a, .filter-chip, .favorite-button').evaluateAll((items) => items
      .filter((item) => {
        const rect = item.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && getComputedStyle(item).display !== 'none'
      })
      .map((item) => {
        const { width, height } = item.getBoundingClientRect()
        return { width, height, label: item.getAttribute('aria-label') || item.textContent?.trim() || item.className }
      }))
    expect(targets.filter((target) => target.width < 44 || target.height < 44), `${colorScheme} mobile targets`).toEqual([])
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const motionStyles = await page.evaluate(() => ({
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      transitionSeconds: getComputedStyle(document.querySelector('.game-card')!).transitionDuration
        .split(',')
        .map((duration) => parseFloat(duration))
        .reduce((largest, duration) => Math.max(largest, duration), 0),
    }))
    expect(motionStyles.scrollBehavior).toBe('auto')
    expect(motionStyles.transitionSeconds).toBeLessThanOrEqual(0.001)
    await context.close()
  }
})

test('search stays focused through a keyboard-sized viewport and uses a non-zooming text size', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  await page.goto(appUrl(baseURL, '/explore'))
  const search = page.getByRole('textbox', { name: 'Search games' })
  await search.focus()
  expect(await search.evaluate((input) => getComputedStyle(input).fontSize)).toBe('16px')
  await page.setViewportSize({ width: 390, height: 430 })
  await expect(search).toBeFocused()
  const searchRect = await search.boundingBox()
  expect(searchRect).not.toBeNull()
  expect(searchRect!.y).toBeGreaterThanOrEqual(0)
  expect(searchRect!.y + searchRect!.height).toBeLessThan(430)
  await context.close()
})

test('mobile autocomplete supports keyboard selection and fits its scroll area', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  await page.goto(appUrl(baseURL, '/games/outlines?mode=daily'))
  await page.locator('.game-body').waitFor({ state: 'visible' })

  const answer = page.getByRole('combobox')
  await answer.fill('S')
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  const listRect = await listbox.boundingBox()
  expect(listRect).not.toBeNull()
  expect(listRect!.x).toBeGreaterThanOrEqual(0)
  expect(listRect!.x + listRect!.width).toBeLessThanOrEqual(320)
  expect(parseFloat(await listbox.evaluate((element) => getComputedStyle(element).maxHeight))).toBeLessThanOrEqual(240)

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[role="option"][aria-selected="true"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(answer).toHaveAttribute('aria-expanded', 'false')
  await expect(answer).toBeFocused()
  await context.close()
})

test('touch gameplay controls and settings remain usable on a small phone', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  await page.goto(appUrl(baseURL, '/games/flags?mode=daily'))
  await page.locator('.game-body').waitFor({ state: 'visible' })
  const flagChoice = page.locator('.flag-choice').first()
  await flagChoice.tap()
  await expect(flagChoice).toHaveAttribute('aria-pressed', 'true')

  await page.goto(appUrl(baseURL, '/games/connections?mode=freeplay'))
  await startFreePlay(page)
  const settings = page.locator('.game-settings-button')
  await settings.tap()
  const settingsPanel = page.locator('.game-settings-panel')
  await expect(settingsPanel).toBeVisible()
  const settingsRect = await settingsPanel.boundingBox()
  expect(settingsRect).not.toBeNull()
  expect(settingsRect!.x).toBeGreaterThanOrEqual(0)
  expect(settingsRect!.x + settingsRect!.width).toBeLessThanOrEqual(320)
  expect(settingsRect!.y + settingsRect!.height).toBeLessThanOrEqual(640)
  await page.keyboard.press('Escape')
  const countryTile = page.locator('.connections-tile').first()
  await countryTile.tap()
  await expect(countryTile).toHaveAttribute('aria-pressed', 'true')

  await page.goto(appUrl(baseURL, '/games/distance?mode=freeplay'))
  await startFreePlay(page)
  await page.locator('.distance-city-choice').first().tap()
  await expect(page.locator('.distance-city-choice.is-revealed')).toHaveCount(2)
  await expect(page.locator('.answer-feedback')).toBeVisible()
  await context.close()
})

test('setup overlay fits a small phone and keeps its close and start actions reachable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  await page.goto(appUrl(baseURL, '/games/latitude-ladder?mode=freeplay'))
  const panel = page.locator('.game-setup-panel')
  const close = page.getByRole('button', { name: 'Close setup' })
  const start = page.getByRole('button', { name: 'Start free play' })
  await expect(panel).toBeVisible()
  await expect(close).toBeVisible()
  await expect(start).toBeVisible()
  const panelRect = await panel.boundingBox()
  expect(panelRect).not.toBeNull()
  expect(panelRect!.x).toBeGreaterThanOrEqual(0)
  expect(panelRect!.y).toBeGreaterThanOrEqual(0)
  expect(panelRect!.x + panelRect!.width).toBeLessThanOrEqual(320)
  expect(panelRect!.y + panelRect!.height).toBeLessThanOrEqual(568)
  await close.click()
  await expect(panel).toBeHidden()
  await context.close()
})

test('captures the mobile page and game gallery in light and dark themes', async ({ browser, baseURL }) => {
  test.setTimeout(300_000)
  const screenshotDirectory = path.join(process.cwd(), 'e2e', 'mobile', 'screenshots')
  await mkdir(screenshotDirectory, { recursive: true })

  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      colorScheme,
    })
    const page = await context.newPage()
    await page.goto(appUrl(baseURL, '/'))
    await page.locator('.daily-grid .game-card').first().waitFor()
    await ensureTheme(page, colorScheme)
    for (const [name, route] of pageRoutes) {
      await page.goto(appUrl(baseURL, route), { waitUntil: 'domcontentloaded' })
      await page.locator('.page').first().waitFor({ state: 'visible' })
      await page.waitForTimeout(100)
      await page.screenshot({
        path: path.join(screenshotDirectory, `${name}-${colorScheme}-390x844.png`),
        fullPage: true,
        animations: 'disabled',
      })
    }

    const setupRoute = '/games/latitude-ladder?mode=freeplay'
    await page.goto(appUrl(baseURL, setupRoute), { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.game-setup-panel')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start free play' })).toBeEnabled({ timeout: 30_000 })
    await page.screenshot({ path: path.join(screenshotDirectory, `setup-${colorScheme}-390x844.png`), animations: 'disabled' })
    await page.getByRole('button', { name: 'Start free play' }).click()
    await page.locator('.game-body').waitFor({ state: 'visible', timeout: 30_000 })
    await page.screenshot({ path: path.join(screenshotDirectory, `latitude-ladder-${colorScheme}-390x844.png`), animations: 'disabled' })

    await page.setViewportSize({ width: 320, height: 568 })
    for (const name of ['daily', 'explore'] as const) {
      const route = pageRoutes.find(([routeName]) => routeName === name)![1]
      await page.goto(appUrl(baseURL, route), { waitUntil: 'domcontentloaded' })
      await page.locator('.page').first().waitFor({ state: 'visible' })
      await page.screenshot({
        path: path.join(screenshotDirectory, `${name}-${colorScheme}-320x568.png`),
        fullPage: true,
        animations: 'disabled',
      })
    }
    await page.goto(appUrl(baseURL, '/games/latitude-ladder?mode=freeplay'), { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Start free play' })).toBeEnabled({ timeout: 30_000 })
    await page.screenshot({ path: path.join(screenshotDirectory, `setup-${colorScheme}-320x568.png`), animations: 'disabled' })
    await page.setViewportSize({ width: 390, height: 844 })

    for (const [gameId, mode] of gameRoutes) {
      if (gameId === 'latitude-ladder') continue
      await page.goto(appUrl(baseURL, `/games/${gameId}?mode=${mode}`), { waitUntil: 'domcontentloaded' })
      if (mode === 'freeplay') {
        const start = page.getByRole('button', { name: 'Start free play' })
        await expect(start).toBeEnabled({ timeout: 30_000 })
        await start.click()
      }
      await page.locator('.game-body').waitFor({ state: 'visible', timeout: 30_000 })
      await page.screenshot({ path: path.join(screenshotDirectory, `${gameId}-${colorScheme}-390x844.png`), animations: 'disabled' })
    }

    await page.goto(appUrl(baseURL, '/games/connections?mode=freeplay'), { waitUntil: 'domcontentloaded' })
    await startFreePlay(page)
    await revealConnectionResults(page)
    const resultDialog = page.locator('.game-results-dialog[open]')
    await expect(resultDialog).toBeVisible()
    await page.screenshot({ path: path.join(screenshotDirectory, `results-${colorScheme}-390x844.png`), animations: 'disabled' })

    await context.close()
  }
})

function appUrl(baseURL: string | undefined, route: string): string {
  return new URL(route, baseURL ?? 'http://127.0.0.1:4173').toString()
}

async function startFreePlay(page: import('@playwright/test').Page) {
  const start = page.getByRole('button', { name: 'Start free play' })
  await expect(start).toBeEnabled({ timeout: 30_000 })
  await start.click()
  await page.locator('.game-body').waitFor({ state: 'visible', timeout: 30_000 })
}

async function revealConnectionResults(page: import('@playwright/test').Page) {
  const resultDialog = page.locator('.game-results-dialog[open]')
  for (let attempt = 0; attempt < 10 && await resultDialog.count() === 0; attempt++) {
    const tiles = page.locator('.connections-tile')
    const count = await tiles.count()
    for (let index = 0; index < Math.min(4, count); index++) await tiles.nth(index).tap()
    await page.getByRole('button', { name: 'Check group' }).tap()
    await page.waitForTimeout(120)
  }
  await expect(resultDialog).toBeVisible({ timeout: 10_000 })
}

async function ensureTheme(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  const toggle = page.getByRole('button', { name: /Switch to (light|dark) appearance/ })
  const label = await toggle.getAttribute('aria-label')
  if (theme === 'dark' && label?.includes('dark')) await toggle.click()
  if (theme === 'light' && label?.includes('light')) await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}
