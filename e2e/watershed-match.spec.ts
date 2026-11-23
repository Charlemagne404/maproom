import { expect, test, type Page } from '@playwright/test'

async function openGame(page: Page) {
  await page.goto('/games/watershed-match?mode=freeplay')
  const setup = page.getByRole('dialog')
  await expect(setup).toBeVisible()
  await expect(setup.getByRole('heading', { name: 'Watershed Match' })).toBeVisible()
  await setup.getByRole('button', { name: 'Start free play' }).click()
  await expect(setup).toBeHidden()
  await expect(page.locator('.watershed-match-game')).toBeVisible({ timeout: 30_000 })
}

test('Watershed Match separates markers on its tightest map frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript((seedToken) => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', { configurable: true, value: () => seedToken })
  }, 'audit-138')
  await openGame(page)
  await expect(page.locator('#watershed-task-title')).toHaveText('Little River')
  await expect(page.locator('.watershed-map-marker')).toHaveCount(4)
  await expect(page.locator('.watershed-map-marker.is-source text')).toHaveText('S')
  await expect(page.locator('.watershed-marker-connection')).toHaveCount(1)

  const markerPoints = await page.locator('.watershed-map-marker').evaluateAll((markers) => markers.map((marker) => {
    const match = marker.getAttribute('transform')?.match(/translate\(([-\d.]+)\s+([-\d.]+)\)/)
    return match ? [Number(match[1]), Number(match[2])] : null
  }))
  expect(markerPoints.every((point) => point !== null)).toBe(true)
  const points = markerPoints as Array<[number, number]>
  for (let index = 0; index < points.length; index += 1) {
    for (const other of points.slice(index + 1)) {
      expect(Math.hypot(points[index]![0] - other[0], points[index]![1] - other[1])).toBeGreaterThanOrEqual(37.99)
    }
  }
  await page.screenshot({ path: 'artifacts/qa/product-quality/watershed-match-marker-spacing.png', fullPage: true })
})

test('Watershed Match reveals ToHUC answers, saves a round, scores five questions and replays', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openGame(page)
  await expect(page.locator('.watershed-choice')).toHaveCount(3)
  await expect(page.locator('.watershed-choice').first()).toHaveAccessibleDescription(/On this map, the center of this candidate area is .* of the center of the blue starting area\./)
  await expect(page.locator('.watershed-shape')).toHaveCount(4)
  await expect(page.locator('.watershed-match-source')).toContainText('Appalachians, Columbia and Susquehanna')
  await expect(page.locator('.watershed-match-source a')).toHaveAttribute('href', /wbd12_20250107/)
  await expect(page.getByRole('button', { name: 'Check destination' })).toBeDisabled()
  await page.screenshot({ path: 'artifacts/qa/product-quality/watershed-match-desktop.png', fullPage: true })

  const firstChoice = page.locator('.watershed-choice').first()
  await firstChoice.focus()
  await page.keyboard.press('Space')
  await expect(firstChoice).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Check destination' })).toBeEnabled()
  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId: string; payload?: { selected?: string } }>
    return sessions.find((session) => session.gameId === 'watershed-match')?.payload?.selected ?? ''
  })).not.toBe('')

  await page.getByRole('button', { name: 'Check destination' }).click()
  await expect(page.locator('.watershed-match-feedback')).toContainText('The WBD defines ToHUC')
  await expect(page.locator('.watershed-choice.is-correct')).toHaveCount(1)
  await page.screenshot({ path: 'artifacts/qa/product-quality/watershed-match-reveal.png', fullPage: true })

  const seenRegions = new Set<string>()
  seenRegions.add((await page.locator('.watershed-match-heading .eyebrow').innerText()).split('·')[1]?.trim().toLowerCase() ?? '')
  for (let round = 1; round < 5; round += 1) {
    await page.getByRole('button', { name: 'Next watershed' }).click()
    await expect(page.getByRole('progressbar', { name: 'watershed questions progress' })).toHaveAttribute('aria-valuenow', String(round + 1))
    seenRegions.add((await page.locator('.watershed-match-heading .eyebrow').innerText()).split('·')[1]?.trim().toLowerCase() ?? '')
    await page.locator('.watershed-choice').nth(round % 3).click()
    await page.getByRole('button', { name: 'Check destination' }).click()
  }
  expect([...seenRegions].sort()).toEqual(['appalachians', 'columbia', 'susquehanna'])
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog .game-results-summary')).toContainText('/ 5 correct')
  await expect(page.locator('.game-results-dialog .game-results-message')).toContainText('500 points')
  await page.locator('.game-results-dialog').getByRole('button', { name: 'Follow another set' }).click()
  await expect(page.getByRole('progressbar', { name: 'watershed questions progress' })).toHaveAttribute('aria-valuenow', '1')

  for (let round = 0; round < 5; round += 1) {
    await page.locator('.watershed-choice').nth((round + 1) % 3).click()
    await page.getByRole('button', { name: 'Check destination' }).click()
    if (round < 4) await page.getByRole('button', { name: 'Next watershed' }).click()
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
})

test('Watershed Match fits mobile, supports dark theme and loads its map offline', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  try {
    await openGame(page)
    await page.getByRole('button', { name: 'Switch to dark appearance' }).tap()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await expect(page.locator('.watershed-map')).toBeVisible()
    await page.screenshot({ path: 'artifacts/qa/product-quality/watershed-match-mobile-dark.png', fullPage: true })

    await page.locator('.watershed-choice').first().tap()
    await page.getByRole('button', { name: 'Check destination' }).tap()
    await expect(page.locator('.watershed-match-feedback')).toContainText('The WBD defines ToHUC')

    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible()
    await page.getByRole('button', { name: 'Start free play' }).tap()
    await expect(page.locator('.watershed-choice')).toHaveCount(3)
    await expect(page.locator('.watershed-match-feedback')).toContainText('The WBD defines ToHUC')
  } finally {
    await context.close()
  }
})
