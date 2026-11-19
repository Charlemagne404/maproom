import { expect, test } from '@playwright/test'
import { getDailyGameLineup } from '../src/daily/schedule'
import { DAILY_GAME_IDS } from '../src/games/catalog'

test('restores the same seeded daily puzzle after an offline reload', async ({ page, context }) => {
  await page.goto('/games/countries?mode=daily')
  await expect(page.locator('.game-context-daily')).toHaveText('Today’s puzzle')
  await expect(page.locator('.game-body h2').first()).toBeVisible()
  const firstQuestion = await page.locator('.game-body h2').first().innerText()

  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect(page.locator('.game-body h2').first()).toHaveText(firstQuestion)
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.game-context-daily')).toHaveText('Today’s puzzle')
  await expect(page.locator('.game-body h2').first()).toHaveText(firstQuestion)
})

test('Daily shows six ordered cards and launches all eight eligible games on scheduled dates', async ({ page, browser }) => {
  const firstTwentyEightDates = Array.from({ length: 28 }, (_, offset) => {
    const date = new Date(Date.parse('2026-01-01T12:00:00.000Z') + offset * 86_400_000).toISOString().slice(0, 10)
    return { date, lineup: getDailyGameLineup(date) }
  })
  const firstDateWithBoth = firstTwentyEightDates.find(({ lineup }) => lineup.includes('rivers') && lineup.includes('latitude-ladder'))
  expect(firstDateWithBoth).toBeDefined()

  await page.clock.install({ time: new Date(`${firstDateWithBoth!.date}T12:00:00.000Z`) })
  await page.goto('/')
  const cards = page.locator('.daily-grid .game-card')
  await expect(cards).toHaveCount(6)
  const visibleIds = await page.locator('.daily-grid .game-card-link').evaluateAll((items) => items.map((item) => {
    const href = (item as HTMLAnchorElement).href
    return new URL(href).pathname.split('/').at(-1)
  }))
  expect(visibleIds).toEqual(firstDateWithBoth!.lineup)
  expect(firstDateWithBoth!.lineup.every((id) => (DAILY_GAME_IDS as readonly string[]).includes(id))).toBe(true)

  for (const gameId of ['rivers', 'latitude-ladder'] as const) {
    await page.locator(`.daily-grid a[href^="/games/${gameId}?mode=daily"]`).click()
    await expect(page.locator(`.game-page-${gameId}`)).toBeVisible()
    await expect(page.locator('.game-context-daily')).toHaveText('Today’s puzzle')
    await expect(page.locator('.game-body')).toBeVisible()
    await page.goto('/')
    await expect(page.locator('.daily-grid .game-card')).toHaveCount(6)
  }

  const firstScheduledDate = new Map<string, string>()
  for (const { date, lineup } of firstTwentyEightDates) {
    for (const gameId of lineup) if (!firstScheduledDate.has(gameId)) firstScheduledDate.set(gameId, date)
  }
  expect(new Set(firstScheduledDate.keys())).toEqual(new Set(DAILY_GAME_IDS))

  for (const [gameId, date] of firstScheduledDate) {
    const context = await browser.newContext()
    const scheduledPage = await context.newPage()
    await scheduledPage.clock.install({ time: new Date(`${date}T12:00:00.000Z`) })
    await scheduledPage.goto('/')
    const scheduledCard = scheduledPage.locator(`.daily-grid a[href^="/games/${gameId}?mode=daily"]`)
    await expect(scheduledCard).toBeVisible()
    await scheduledCard.click()
    await expect(scheduledPage.locator(`.game-page-${gameId}`)).toBeVisible()
    await expect(scheduledPage.locator('.game-context-daily')).toHaveText('Today’s puzzle')
    await expect(scheduledPage.locator('.game-body')).toBeVisible()
    await context.close()
  }
})
