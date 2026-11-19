import { expect, test, type Page } from '@playwright/test'
import { CONNECTIONS_PUZZLES } from '../src/puzzles/connections-content'

async function startConnections(page: Page, seed?: string) {
  if (seed) {
    await page.addInitScript((value) => {
      Object.defineProperty(window.crypto, 'randomUUID', { configurable: true, value: () => value })
    }, seed)
  }
  await page.goto('/games/connections?mode=freeplay')
  const setup = page.getByRole('dialog')
  await expect(setup).toBeVisible()
  await setup.getByRole('button', { name: 'Start free play' }).click()
  await expect(setup).toBeHidden()
  await expect(page.locator('.connection-board button')).toHaveCount(16)
}

async function activePuzzle(page: Page) {
  const label = await page.locator('.connection-kicker').innerText()
  const number = label.match(/Atlas set\s+(\d+)/i)?.[1]
  expect(number, `Missing puzzle number in ${label}`).toBeDefined()
  const puzzle = CONNECTIONS_PUZZLES.find((candidate) => candidate.id === `atlas-${number}`)
  expect(puzzle, `Missing authored puzzle atlas-${number}`).toBeDefined()
  return puzzle!
}

async function selectCodes(page: Page, codes: string[]) {
  for (const code of codes) await page.locator(`.connection-tile[data-country-code="${code}"]`).click()
}

function findNoMatch(puzzle: Awaited<ReturnType<typeof activePuzzle>>): string[] {
  const codes = puzzle.groups.flatMap((group) => group.countryCodes)
  for (let a = 0; a < codes.length; a += 1) {
    for (let b = a + 1; b < codes.length; b += 1) {
      for (let c = b + 1; c < codes.length; c += 1) {
        for (let d = c + 1; d < codes.length; d += 1) {
          const guess = [codes[a], codes[b], codes[c], codes[d]]
          if (puzzle.groups.every((group) => group.countryCodes.filter((code) => guess.includes(code)).length < 3)) return guess
        }
      }
    }
  }
  throw new Error(`No non-one-away decoy guess is available for ${puzzle.id}`)
}

test('tile selection, one-away feedback, mistake limit and answer review work end to end', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await startConnections(page)
  const puzzle = await activePuzzle(page)

  const firstTile = page.locator('.connection-board button').first()
  await firstTile.click()
  await expect(firstTile).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status')).toHaveText('1 of 4 countries selected')
  await firstTile.click()
  await expect(firstTile).toHaveAttribute('aria-pressed', 'false')

  const [target, decoyGroup] = puzzle.groups
  const oneAway = [...target.countryCodes.slice(0, 3), decoyGroup.countryCodes[0]]
  const status = page.locator('.connections-status')
  const neutralStatusColor = await status.evaluate((element) => getComputedStyle(element).backgroundColor)
  await selectCodes(page, oneAway)
  const fifthCode = decoyGroup.countryCodes[1]
  await page.locator(`.connection-tile[data-country-code="${fifthCode}"]`).click()
  await expect(page.locator('.connection-selection-count > strong')).toHaveText('4')
  await expect(page.locator(`.connection-tile[data-country-code="${fifthCode}"]`)).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Check group' })).toBeEnabled()
  await page.getByRole('button', { name: 'Check group' }).click()
  await expect(page.locator('.connection-status-message')).toContainText('One away')
  await expect(status).toHaveClass(/is-error/)
  expect(await status.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(neutralStatusColor)
  await expect(page.locator('.connection-mistake-meter')).toHaveAttribute('aria-label', '1 of 4 mistakes used')
  await expect(page.locator('.connection-tile').first()).toBeEnabled()

  const noMatch = findNoMatch(puzzle)
  for (let mistake = 2; mistake <= 4; mistake += 1) {
    await expect(page.locator('.connection-tile').first()).toBeEnabled()
    await selectCodes(page, noMatch)
    await page.getByRole('button', { name: 'Check group' }).click()
    await expect(page.locator('.connection-mistake-meter')).toHaveAttribute('aria-label', `${mistake} of 4 mistakes used`)
  }
  await expect(page.locator('.connection-reveal-row')).toHaveCount(4)
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toContainText('0 / 4 correct')
  await page.screenshot({ path: 'artifacts/qa/connections/four-mistakes-desktop.png', fullPage: true })
})

test('correct solutions reveal colored rows, finish the round and replay a different authored set', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await startConnections(page)
  const firstPuzzle = await activePuzzle(page)
  const neutralStatusColor = await page.locator('.connections-status').evaluate((element) => getComputedStyle(element).backgroundColor)
  await page.screenshot({ path: 'artifacts/qa/connections/unsolved-light-desktop.png', fullPage: true })

  for (const [index, group] of firstPuzzle.groups.entries()) {
    await selectCodes(page, group.countryCodes)
    await page.getByRole('button', { name: 'Check group' }).click()
    if (index === 0) {
      const status = page.locator('.connections-status')
      await expect(status).toHaveClass(/is-success/)
      expect(await status.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(neutralStatusColor)
    }
    await expect(page.locator('.connection-solved-row')).toHaveCount(index + 1)
    await expect(page.locator('.connection-progress-block > span')).toContainText(`${index + 1} / 4 groups`)
    if (index === 0) {
      await expect(page.locator('.connection-tile:focus')).toHaveCount(1)
      const focusedCode = await page.locator('.connection-tile:focus').getAttribute('data-country-code')
      expect(group.countryCodes).not.toContain(focusedCode)
    }
    if (index < 3) await expect(page.locator('.connection-board button')).toHaveCount(12 - index * 4)
  }

  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toContainText('4 / 4 correct')
  await expect(page.locator('.connection-board button')).toHaveCount(0)
  await page.screenshot({ path: 'artifacts/qa/connections/solved-light-desktop.png', fullPage: true })
  await page.locator('.game-results-dialog').getByRole('button', { name: 'Play another set' }).click()
  await expect(page.locator('.game-results-dialog')).toBeHidden()
  await expect(page.locator('.connection-board button')).toHaveCount(16)
  expect((await activePuzzle(page)).id).not.toBe(firstPuzzle.id)
})

test('keyboard movement and selection work, and shuffle reorders the active tiles', async ({ page }) => {
  await startConnections(page)
  const board = page.locator('.connection-board')
  const before = await board.locator('button').evaluateAll((items) => items.map((item) => item.getAttribute('data-country-code')))
  const first = board.locator('button').first()
  await first.focus()
  await first.press('Space')
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowRight')
  const second = await page.evaluate(() => document.activeElement?.getAttribute('data-country-code'))
  expect(second).not.toBe(before[0])
  await page.keyboard.press('Space')
  await expect(page.locator('.connection-selection-count > strong')).toHaveText('2')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.locator('.connection-selection-count > strong')).toHaveText('0')
  await board.locator('button').first().click()
  await expect(page.locator('.connection-selection-count > strong')).toHaveText('1')
  await page.getByRole('button', { name: 'Shuffle' }).click()
  await expect(page.locator('.connection-selection-count > strong')).toHaveText('0')
  const after = await board.locator('button').evaluateAll((items) => items.map((item) => item.getAttribute('data-country-code')))
  expect(after).not.toEqual(before)
})

test('free-play difficulty settings switch to a board in the selected tier', async ({ page }) => {
  await startConnections(page)
  await page.getByRole('button', { name: 'Game settings' }).click()
  const settings = page.locator('.game-settings-panel')
  await expect(settings).toBeVisible()
  await settings.getByLabel('Difficulty').selectOption('hard')
  await expect(page.locator('.connection-board button')).toHaveCount(16)
  expect((await activePuzzle(page)).difficulty).toBe('hard')
})

test('the revised medium board reveals its Nordic subset and France border group', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await startConnections(page, 'connection-audit-2')
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.locator('.game-settings-panel').getByLabel('Difficulty').selectOption('medium')
  const puzzle = await activePuzzle(page)
  expect(puzzle.id).toBe('atlas-14')

  for (const id of ['atlas-14-nordic', 'atlas-14-france']) {
    const group = puzzle.groups.find((candidate) => candidate.id === id)
    expect(group).toBeDefined()
    await selectCodes(page, group!.countryCodes)
    await page.getByRole('button', { name: 'Check group' }).click()
    await expect(page.locator('.connection-solved-row').last()).toContainText(group!.label)
    await expect(page.locator('.connection-solved-row').last()).toContainText(group!.explanation)
  }
  await page.screenshot({ path: 'artifacts/qa/product-quality/connections-atlas-14-revealed.png', fullPage: true })
})

test('the revised hard board completes with its four authored groups', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await startConnections(page, 'connection-audit-11')
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.locator('.game-settings-panel').getByLabel('Difficulty').selectOption('hard')
  const puzzle = await activePuzzle(page)
  expect(puzzle.id).toBe('atlas-23')

  for (const [index, group] of puzzle.groups.entries()) {
    await selectCodes(page, group.countryCodes)
    await page.getByRole('button', { name: 'Check group' }).click()
    await expect(page.locator('.connection-solved-row').last()).toContainText(group.label)
    await expect(page.locator('.connection-solved-row').last()).toContainText(group.explanation)
    await expect(page.locator('.connection-solved-row')).toHaveCount(index + 1)
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toContainText('4 / 4 correct')
  await page.screenshot({ path: 'artifacts/qa/product-quality/connections-atlas-23-complete.png', fullPage: true })
})

test('mobile dark theme has no horizontal overflow and honors reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  try {
    await startConnections(page)
    const themeToggle = page.getByRole('button', { name: 'Switch to dark appearance' })
    await themeToggle.click()
    await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe('dark')
    const panelColor = await page.locator('.connection-experience').evaluate((element) => getComputedStyle(element).getPropertyValue('--connection-panel').trim())
    expect(panelColor).toBe('#39332d')
    const animationDuration = await page.locator('.connection-tile').first().evaluate((element) => getComputedStyle(element).animationDuration)
    expect(Number.parseFloat(animationDuration)).toBeLessThanOrEqual(.001)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await page.screenshot({ path: 'artifacts/qa/connections/unsolved-dark-mobile.png', fullPage: true })
    await page.locator('.connection-tile').first().tap()
    await expect(page.locator('.connection-tile').first()).toHaveAttribute('aria-pressed', 'true')
  } finally {
    await context.close()
  }
})
