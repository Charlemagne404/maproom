import { expect, test } from '@playwright/test'

test('autocomplete keeps focus in its combobox while arrow keys explore suggestions', async ({ page }) => {
  await page.goto('/games/outlines?mode=freeplay')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.game-body')).toBeVisible()

  const input = page.getByRole('combobox', { name: 'Name the country shown' })
  await input.fill('ger')
  const options = page.getByRole('option')
  await expect(options).toHaveCount(2)
  await expect(input).toHaveAttribute('aria-expanded', 'true')
  await expect(input).not.toHaveAttribute('aria-activedescendant', /.+/)

  await input.press('ArrowDown')
  const firstActiveOption = await input.getAttribute('aria-activedescendant')
  expect(firstActiveOption).toBeTruthy()
  await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true')
  expect(await input.evaluate((element) => document.activeElement === element)).toBe(true)

  await input.press('ArrowDown')
  await expect(input).not.toHaveAttribute('aria-activedescendant', firstActiveOption!)
  await input.press('ArrowUp')
  await expect(input).toHaveAttribute('aria-activedescendant', firstActiveOption!)
  await input.press('Escape')
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  await expect(input).not.toHaveAttribute('aria-activedescendant', /.+/)
  await expect(input).toHaveValue('ger')

  await input.press('Tab')
  expect(await page.locator('.answer-submit').evaluate((element) => document.activeElement === element)).toBe(true)

  await input.fill('Nige')
  await input.press('Enter')
  await expect(input).toHaveValue('Niger')
  await expect(page.locator('.guess-list span')).toHaveCount(0)
  await input.press('Enter')
  await expect(page.locator('.guess-list span')).toHaveCount(1)
})
