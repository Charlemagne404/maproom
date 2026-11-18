import { expect, test } from '@playwright/test'

type SetupEntranceSnapshot = {
  href: string
  panel: { x: number; y: number; width: number; height: number }
  header?: { x: number; y: number; width: number; height: number }
}

const freePlayGames: Array<{ id: string; title: string; format?: string }> = [
  { id: 'countries', title: 'Find the country' },
  { id: 'outlines', title: 'Country Outline Quiz' },
  { id: 'routes', title: 'Border route' },
  { id: 'flags', title: 'Flag Match', format: '&format=flag-to-country' },
  { id: 'grid', title: 'Geography grid' },
  { id: 'cities', title: 'Capitals & cities', format: '&format=country-to-capital' },
  { id: 'connections', title: 'Geography Connections' },
  { id: 'higher-lower', title: 'Higher or Lower: Countries' },
  { id: 'neighbours', title: 'Neighbour Challenge' },
  { id: 'distance', title: 'City Distance & Direction' },
  { id: 'rivers', title: 'Riverways' },
  { id: 'latitude-ladder', title: 'Latitude Ladder', format: '&format=west-east' },
]

function secondsFromCssTime(value: string): number {
  const amount = Number.parseFloat(value)
  return value.trim().endsWith('ms') ? amount / 1000 : amount
}

test('Explore setup configures and starts every free-play game', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })

  for (const game of freePlayGames) {
    await page.goto('/explore')
    const target = `/games/${game.id}?mode=freeplay${game.format ?? ''}`
    await page.locator(`a.game-card-link[href="${target}"]`).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: game.title, exact: true })).toBeVisible()
    await expect(page.locator('.game-body')).toBeVisible()

    const settings = dialog.locator('.game-setup-settings')
    await expect(settings.locator('.practice-config')).toBeVisible()
    if (game.id === 'countries') {
      const timedRound = settings.getByLabel('60-second speed round')
      await timedRound.check()
      await expect(timedRound).toBeChecked()
    }
    const alternateChoice = settings.locator('.setup-choice[aria-pressed="false"]:visible').first()
    if (await alternateChoice.count()) {
      await alternateChoice.click()
    } else {
      const select = settings.locator('select').first()
      await expect(select).toBeVisible()
      await select.selectOption({ index: 1 })
    }

    await expect(dialog.locator('.game-setup-start')).toHaveAttribute('aria-disabled', 'false')
    await dialog.getByRole('button', { name: 'Start free play' }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('.game-page')).not.toHaveClass(/is-setup/)
    await expect(page.locator('.game-body')).toBeVisible()
  }
})

test('outline setup preserves pool validation and lets players recover from an empty selection', async ({ page }) => {
  await page.goto('/games/outlines?mode=freeplay')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Geographic scope' }).selectOption('Europe')
  await dialog.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: /Hard/ }).click()

  let advanced = dialog.locator('.game-setup-advanced')
  const advancedSummary = advanced.locator('summary')
  const disclosureIcon = advancedSummary.locator('svg')
  const collapsedIconTransform = await disclosureIcon.evaluate((element) => getComputedStyle(element).transform)
  await advancedSummary.click()
  await expect(advanced).toHaveJSProperty('open', true)
  await expect.poll(() => disclosureIcon.evaluate((element) => getComputedStyle(element).transform)).not.toBe(collapsedIconTransform)
  await dialog.getByRole('group', { name: 'Outline pool' }).getByRole('button', { name: 'Standard · eligible countries' }).click()
  await expect(dialog.locator('[role="status"]')).toContainText('This selection has no fair silhouettes')

  await dialog.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: /Medium/ }).click()
  advanced = dialog.locator('.game-setup-advanced')
  if (!await advanced.evaluate((element) => (element as HTMLDetailsElement).open)) await advanced.locator('summary').click()
  await dialog.getByRole('group', { name: 'Outline pool' }).getByRole('button', { name: 'Extended · balanced territories' }).click()
  await dialog.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: /Hard/ }).click()
  await expect(dialog.locator('.practice-config-note').filter({ hasText: 'suitable silhouettes' })).toContainText('3 suitable silhouettes')

  await dialog.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.outline-map-stage .geo-map path')).not.toHaveCount(0)
})

test('grid and Connections explain the rules before play and keep grid setup choices useful', async ({ page }) => {
  await page.goto('/games/grid?mode=freeplay')
  let dialog = page.getByRole('dialog')
  await expect(dialog.locator('.game-setup-description')).toHaveText('Fill nine squares with different countries that fit both the row and column clues.')
  await expect(dialog.getByRole('group', { name: 'Grid set' })).toHaveCount(0)
  await expect(dialog.getByRole('group', { name: 'Country pool' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Start free play' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.question-toolbar p')).toHaveText('Fill all nine crossings with different countries that fit both clues.')
  await expect(page.locator('.game-playfield')).toBeFocused()
  const secondGridCell = page.locator('.grid-cell-trigger').nth(1)
  await secondGridCell.focus()
  await page.keyboard.press('Enter')
  await expect(secondGridCell).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('combobox', { name: /Country for/ })).toBeVisible()

  await page.goto('/games/connections?mode=freeplay')
  dialog = page.getByRole('dialog')
  await expect(dialog.locator('.game-setup-description')).toHaveText('Select countries in groups of four to uncover four shared geographic connections. Four mistakes end the round.')
  await dialog.getByRole('button', { name: 'Start free play' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.question-toolbar h2')).toHaveText('Find four groups of four')
  await expect(page.locator('.connections-status')).toContainText('Select four countries that share a connection.')
  await expect(page.locator('.connections-mistakes')).toHaveAttribute('aria-label', '0 of 4 mistakes used')
  await expect(page.locator('.game-playfield')).toBeFocused()
  const firstTile = page.locator('.connections-board button').first()
  await firstTile.focus()
  await expect(firstTile).toBeFocused()
  await firstTile.press('Space')
  await expect(firstTile).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status')).toHaveText('1 of 4 countries selected')
})

test('setup closes to its source, daily puzzles bypass it, and the panel fits mobile dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/explore')
  const sourceLink = page.getByRole('link', { name: 'Find the country, Free play setup' })
  await sourceLink.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.locator('.game-body')).toBeVisible()
  await expect(dialog.locator('.game-setup-panel')).toBeInViewport()
  const closeButton = dialog.getByRole('button', { name: 'Close setup' })
  const startButton = dialog.getByRole('button', { name: 'Start free play' })
  await expect(closeButton).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(startButton).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(closeButton).toBeFocused()
  await dialog.getByRole('button', { name: 'Close setup' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page).toHaveURL(/\/explore$/)
  await expect(sourceLink).toBeFocused()

  await sourceLink.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page).toHaveURL(/\/explore$/)
  await expect(sourceLink).toBeFocused()

  await sourceLink.click()
  await expect(dialog).toBeVisible()
  await dialog.click({ position: { x: 5, y: 5 } })
  await expect(dialog).not.toBeVisible()
  await expect(page).toHaveURL(/\/explore$/)
  await expect(sourceLink).toBeFocused()

  await page.goto('/settings')
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark')
  await page.goto('/games/flags?mode=freeplay&format=country-to-flag')
  const darkDialog = page.getByRole('dialog')
  await expect(darkDialog).toBeVisible()
  await expect(darkDialog.locator('.game-setup-panel')).toBeInViewport()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(darkDialog.locator('.game-setup-settings .practice-config')).toBeVisible()

  await page.goto('/games/countries?mode=daily')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.game-body')).toBeVisible()

  await page.goto('/games/higher-lower?mode=freeplay')
  const directDialog = page.getByRole('dialog')
  await expect(directDialog).toBeVisible()
  await directDialog.getByRole('button', { name: 'Close setup' }).click()
  await expect(directDialog).not.toBeVisible()
  await expect(page).toHaveURL(/\/explore$/)
  await expect(page.locator('#main-content')).toBeFocused()
})

test('reduced motion shortens setup and answer animations while keeping focus transfer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/games/higher-lower?mode=freeplay')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close setup' })).toBeFocused()
  const setupAnimation = await dialog.locator('.game-setup-panel').evaluate((element) => getComputedStyle(element).animationDuration)
  expect(secondsFromCssTime(setupAnimation)).toBeLessThanOrEqual(0.001)

  await dialog.getByRole('button', { name: 'Start free play' }).click()
  await expect(dialog).toBeHidden()
  const playfield = page.locator('.game-playfield')
  await expect(playfield).toBeFocused()

  const choice = page.locator('.higher-lower-country').first()
  await choice.click()
  await expect(choice).toHaveClass(/is-revealed/)
  const answerAnimation = await choice.evaluate((element) => getComputedStyle(element).animationDuration)
  expect(secondsFromCssTime(answerAnimation)).toBeLessThanOrEqual(0.001)
  await expect(page.getByRole('status')).toContainText(/Correct|Not quite/)
})

test('Explore opens setup before revealing the prepared game and preserves browser history', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => {
    window.addEventListener('animationend', (event) => {
      if (event.animationName !== 'setup-panel-enter' || !(event.target instanceof HTMLElement)) return
      const panel = event.target
      const rect = panel.getBoundingClientRect()
      const headerRect = document.querySelector('.site-header')?.getBoundingClientRect()
      ;(window as typeof window & { setupEntranceSnapshot?: SetupEntranceSnapshot }).setupEntranceSnapshot = {
        href: `${location.pathname}${location.search}`,
        panel: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        header: headerRect ? { x: headerRect.x, y: headerRect.y, width: headerRect.width, height: headerRect.height } : undefined,
      }
    }, true)
  })
  await page.goto('/explore')

  await page.getByRole('link', { name: 'Find the country, Free play setup' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.game-setup-settings .practice-config')).toBeVisible()
  await dialog.evaluate((element) => {
    ;(window as typeof window & { setupDialogNode?: Element }).setupDialogNode = element
  })

  await expect(page).toHaveURL(/\/games\/countries\?mode=freeplay/)
  await expect(page.locator('.game-body')).toBeVisible()
  await expect.poll(() => dialog.evaluate((element) => {
    return (window as typeof window & { setupDialogNode?: Element }).setupDialogNode === element
  })).toBe(true)
  const entranceSnapshot = await page.evaluate(() => (window as typeof window & { setupEntranceSnapshot?: SetupEntranceSnapshot }).setupEntranceSnapshot)
  expect(entranceSnapshot).toBeDefined()
  expect(entranceSnapshot!.href).toBe('/explore')
  const panelBounds = await dialog.locator('.game-setup-panel').boundingBox()
  expect(panelBounds).not.toBeNull()
  expect(panelBounds!.x).toBeCloseTo(entranceSnapshot!.panel.x, 0)
  expect(panelBounds!.y).toBeCloseTo(entranceSnapshot!.panel.y, 0)
  expect(panelBounds!.width).toBeCloseTo(entranceSnapshot!.panel.width, 0)
  expect(panelBounds!.height).toBeCloseTo(entranceSnapshot!.panel.height, 0)
  const headerBounds = await page.locator('.site-header').boundingBox()
  expect(headerBounds).not.toBeNull()
  expect(headerBounds!.x).toBeCloseTo(entranceSnapshot!.header!.x, 0)
  expect(headerBounds!.y).toBeCloseTo(entranceSnapshot!.header!.y, 0)
  expect(headerBounds!.width).toBeCloseTo(entranceSnapshot!.header!.width, 0)
  expect(headerBounds!.height).toBeCloseTo(entranceSnapshot!.header!.height, 0)
  await expect(dialog.locator('.game-setup-start')).toHaveAttribute('aria-disabled', 'false')
  await dialog.getByRole('button', { name: 'Start free play' }).click()
  await expect(dialog).not.toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/explore$/)
  await page.goForward()
  await expect(page).toHaveURL(/\/games\/countries\?mode=freeplay/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.game-body')).toBeVisible()
})
