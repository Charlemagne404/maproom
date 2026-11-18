import { expect, test, type Page } from '@playwright/test'
import { geoEqualEarth, geoPath } from 'd3-geo'
import type { RiverFeature } from '../src/geography/types'
import { buildRiverQuestionPool } from '../src/puzzles/rivers'
import { loadTopologyFeatures } from './topology'

async function openGame(page: Page, id: string, format?: string) {
  const query = new URLSearchParams({ mode: 'freeplay' })
  if (format) query.set('format', format)
  await page.goto(`/games/${id}?${query}`)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.game-body')).toBeVisible({ timeout: 30_000 })
}

async function highlightedRiver(page: Page) {
  const [riverResponse, countryFeatures] = await Promise.all([
    page.request.get(new URL('/data/rivers.json', page.url()).toString()),
    loadTopologyFeatures(page, '/data/countries.topo.json'),
  ])
  expect(riverResponse.ok()).toBe(true)
  const riverData = await riverResponse.json() as { features: RiverFeature[] }
  const collection = { type: 'FeatureCollection', features: countryFeatures } as unknown as GeoJSON.FeatureCollection
  const projection = geoEqualEarth().fitExtent([[16, 14], [944, 466]], collection)
  const path = geoPath(projection)
  const renderedPath = await page.locator('.map-line-feature').getAttribute('d')
  const pool = buildRiverQuestionPool(riverData.features).filter((river) => river.scaleRank <= 3)
  const target = pool.find((river) => path(river.feature as unknown as GeoJSON.Feature) === renderedPath)
  expect(target, 'the highlighted path maps to a validated question').toBeDefined()
  const wrong = pool.find((river) => river.id !== target?.id)
  expect(wrong).toBeDefined()
  return { target: target!, wrong: wrong! }
}

test('Riverways loads its optional line layer, restores a guess, reveals the answer and replays', async ({ page }) => {
  await openGame(page, 'rivers')
  await expect(page.getByRole('group', { name: 'World map with one highlighted river trace' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Unlabelled map region/ })).toHaveCount(0)
  const line = page.locator('.riverways-map-stage .map-line-feature')
  await expect(line).toHaveCount(1)
  const pathBefore = await line.getAttribute('d')
  expect(pathBefore).toMatch(/^M/)
  await expect(page.locator('.riverways-source-note')).toContainText('Natural Earth')

  const { target, wrong } = await highlightedRiver(page)
  const answer = page.getByLabel('Name the highlighted river')
  await answer.fill(wrong.name)
  await page.getByRole('option', { name: wrong.name, exact: true }).click()
  await page.getByRole('button', { name: 'Guess' }).click()
  await expect(page.locator('.riverways-attempts .is-used')).toHaveCount(1)
  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId: string; payload?: { attempts?: string[] } }>
    return sessions.find((session) => session.gameId === 'rivers')?.payload?.attempts?.length ?? 0
  })).toBe(1)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.riverways-attempts .is-used')).toHaveCount(1)
  await expect(page.locator('.map-line-feature')).toHaveAttribute('d', pathBefore!)

  const restoredAnswer = page.getByRole('combobox', { name: 'Name the highlighted river' })
  await restoredAnswer.click()
  await restoredAnswer.pressSequentially(target.name)
  await expect(restoredAnswer).toHaveValue(target.name)
  await expect(page.getByRole('option', { name: target.name, exact: true })).toBeVisible()
  await page.getByRole('option', { name: target.name, exact: true }).click()
  await page.getByRole('button', { name: 'Guess' }).click()
  await expect(page.locator('.answer-feedback.is-correct')).toContainText(target.name)
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog .game-results-summary')).toContainText('1 / 1 correct')

  await page.locator('.game-results-dialog').getByRole('button', { name: 'Trace another river' }).click()
  await expect(page.locator('.riverways-prompt .eyebrow')).toContainText('round 2')
  await expect(page.locator('.map-line-feature')).not.toHaveAttribute('d', pathBefore!)
})

test('Latitude Ladder supports both setup formats, city ordering, result maps and replay', async ({ page }) => {
  await openGame(page, 'latitude-ladder', 'west-east')
  await expect(page.locator('.latitude-axis-badge')).toContainText('Longitude')
  const rows = page.locator('.latitude-order-list > li')
  await expect(rows).toHaveCount(5)
  const firstBefore = await rows.first().innerText()
  const moveLater = page.getByRole('button', { name: /Move .* later/ }).first()
  await moveLater.focus()
  await page.keyboard.press('Space')
  await expect(rows.first()).not.toHaveText(firstBefore)
  const movedOrder = await rows.allInnerTexts()
  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId: string; payload?: { order?: string[] } }>
    return sessions.find((session) => session.gameId === 'latitude-ladder')?.payload?.order?.length ?? 0
  })).toBe(5)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect.poll(() => rows.allInnerTexts()).toEqual(movedOrder)
  await page.getByRole('button', { name: 'Check the line' }).click()

  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.map-marker-answer')).toHaveCount(5)
  await expect(page.locator('.latitude-city-coordinate').first()).toContainText(/[EW]/)
  await expect(page.locator('.latitude-order-message')).toBeVisible()
  await page.locator('.game-results-dialog').getByRole('button', { name: 'Build another line' }).click()
  await expect(page.locator('.latitude-ladder-prompt .eyebrow')).toContainText('round 2')
  await expect(page.locator('.latitude-axis-badge')).toContainText('Longitude')
})

test('the new games remain usable with touch at a narrow viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  try {
    await openGame(page, 'rivers')
    await page.getByRole('button', { name: 'Switch to dark appearance' }).tap()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('.map-line-feature')).toHaveCSS('stroke', 'rgb(242, 154, 98)')
    const riverInput = page.getByLabel('Name the highlighted river')
    await riverInput.tap()
    await riverInput.fill('a')
    await expect(page.getByRole('option').first()).toBeVisible()
    await page.getByRole('option').first().tap()
    await page.getByRole('button', { name: 'Guess' }).tap()
    await expect(page.locator('.riverways-attempts .is-used')).toHaveCount(1)

    await openGame(page, 'latitude-ladder', 'north-south')
    await expect(page.locator('.latitude-order-panel')).toHaveCSS('background-color', 'rgb(64, 58, 52)')
    const moveButton = page.getByRole('button', { name: /Move .* later/ }).first()
    await expect(moveButton).toBeVisible()
    await moveButton.tap()
    await page.getByRole('button', { name: 'Check the line' }).tap()
    await expect(page.locator('.map-marker-answer')).toHaveCount(5)
    await expect(page.locator('.latitude-axis-badge')).toContainText('Latitude')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  } finally {
    await context.close()
  }
})
