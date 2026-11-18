import { expect, test } from '@playwright/test'

test('interactive country maps use one tab stop and spatial arrow navigation', async ({ page }) => {
  await page.goto('/games/neighbours?mode=freeplay')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.game-body')).toBeVisible()

  const countries = page.locator('.map-country[role="button"]')
  await expect(countries).toHaveCount(195)
  await expect(page.locator('.map-country[tabindex="0"]')).toHaveCount(1)
  await expect(page.locator('.geo-map')).toHaveAttribute('aria-describedby', /.+/)

  const firstTabStop = page.locator('.map-country[tabindex="0"]')
  const initialIndex = await firstTabStop.evaluate((node) => Array.from(document.querySelectorAll('.map-country[role="button"]')).indexOf(node))
  const firstBox = await firstTabStop.boundingBox()
  const mapBox = await page.locator('.geo-map').boundingBox()
  if (!firstBox || !mapBox) throw new Error('The initial map focus target should have visible geometry.')
  expect(firstBox.x < mapBox.x + mapBox.width && firstBox.x + firstBox.width > mapBox.x
    && firstBox.y < mapBox.y + mapBox.height && firstBox.y + firstBox.height > mapBox.y).toBe(true)

  const activeIndex = () => page.evaluate(() => Array.from(document.querySelectorAll('.map-country[role="button"]')).indexOf(document.activeElement!))
  await firstTabStop.press('ArrowRight')
  await expect.poll(activeIndex).not.toBe(initialIndex)
  await expect(page.locator('.map-country[tabindex="0"]')).toHaveCount(1)

  const selectedIndex = await activeIndex()
  await page.keyboard.press('Enter')
  await expect(countries.nth(selectedIndex)).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('End')
  await expect.poll(activeIndex).toBe(194)
  await page.keyboard.press('Home')
  await expect.poll(activeIndex).toBe(0)
})
