import { expect, test } from '@playwright/test'

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
