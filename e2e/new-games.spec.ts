import { expect, test, type Page } from '@playwright/test'
import { geoEqualEarth, geoPath } from 'd3-geo'
import type { Country, RiverFeature } from '../src/geography/types'
import { buildRiverQuestionPool, riverCentreCountry } from '../src/puzzles/rivers'
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
  const [riverResponse, countryFeatures, catalogResponse] = await Promise.all([
    page.request.get(new URL('/data/rivers.json', page.url()).toString()),
    loadTopologyFeatures(page, '/data/countries.topo.json'),
    page.request.get(new URL('/data/countries.json', page.url()).toString()),
  ])
  expect(riverResponse.ok()).toBe(true)
  expect(catalogResponse.ok()).toBe(true)
  const riverData = await riverResponse.json() as { features: RiverFeature[] }
  const catalog = await catalogResponse.json() as { countries: Country[] }
  const countriesByCode = new Map(catalog.countries.map((country) => [country.iso3, country]))
  const collection = { type: 'FeatureCollection', features: countryFeatures } as unknown as GeoJSON.FeatureCollection
  const projection = geoEqualEarth().fitExtent([[16, 14], [944, 466]], collection)
  const path = geoPath(projection)
  const renderedPath = await page.locator('.map-line-feature').getAttribute('d')
  const pool = buildRiverQuestionPool(riverData.features).filter((river) => river.scaleRank <= 3)
  const target = pool.find((river) => path(river.feature as unknown as GeoJSON.Feature) === renderedPath)
  expect(target, 'the highlighted path maps to a validated question').toBeDefined()
  const wrong = pool.find((river) => river.id !== target?.id)
  const secondWrong = pool.find((river) => river.id !== target?.id && river.id !== wrong?.id)
  expect(wrong).toBeDefined()
  expect(secondWrong).toBeDefined()
  const centerCountry = riverCentreCountry(target!.feature, countryFeatures, countriesByCode)
  expect(centerCountry, 'every authored question has a country containing its calculated centre').toBeTruthy()
  return { target: target!, wrong: wrong!, secondWrong: secondWrong!, centerCountry: centerCountry! }
}

function projectionOptionFor(prompt: string): string {
  if (prompt.includes('true relative areas')) return 'Map option A'
  if (prompt.includes('constant-heading course')) return 'Map option B'
  if (prompt.includes('evenly spaced latitude')) return 'Map option C'
  if (prompt.includes('near side')) return 'Map option D'
  throw new Error(`No projection answer was defined for task: ${prompt}`)
}

test('Riverways loads its optional line layer, restores a guess, reveals the answer and replays', async ({ page }) => {
  await openGame(page, 'rivers')
  await expect(page.getByRole('group', { name: 'World map with one highlighted river trace' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Unlabelled map region/ })).toHaveCount(0)
  const line = page.locator('.riverways-map-stage .map-line-feature')
  await expect(line).toHaveCount(1)
  const pathBefore = await line.getAttribute('d')
  expect(pathBefore).toMatch(/^M/)
  const casing = page.locator('.riverways-map-stage .map-line-casing')
  await expect(casing).toHaveCount(1)
  await expect(casing).toHaveAttribute('aria-hidden', 'true')
  await expect(casing).toHaveCSS('stroke-width', '5px')
  await expect(line).toHaveCSS('stroke-width', '3px')
  await expect(line).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('.riverways-prompt p')).toContainText('Drag to pan')
  await expect(page.locator('.riverways-source-note')).toContainText('Natural Earth')

  const { target, wrong, secondWrong, centerCountry } = await highlightedRiver(page)
  const answer = page.getByLabel('Name the highlighted river')
  await answer.fill(wrong.name)
  await page.getByRole('option', { name: wrong.name, exact: true }).click()
  await page.getByRole('button', { name: 'Guess' }).click()
  await expect(page.locator('.riverways-attempts .is-used')).toHaveCount(1)
  await expect(page.locator('.answer-feedback')).toContainText(`${wrong.name} is not this river.`)
  await expect(page.locator('.answer-feedback')).toContainText(/(?:about [\d,]+ km .+ of the highlighted line’s centre|within 50 km of the highlighted line’s centre)/)

  await answer.fill(secondWrong.name)
  await page.getByRole('option', { name: secondWrong.name, exact: true }).click()
  await page.getByRole('button', { name: 'Guess' }).click()
  await expect(page.locator('.riverways-attempts .is-used')).toHaveCount(2)
  await expect(page.locator('.answer-feedback')).toContainText(`The highlighted line’s calculated centre falls in ${centerCountry}.`)
  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId: string; payload?: { attempts?: string[] } }>
    return sessions.find((session) => session.gameId === 'rivers')?.payload?.attempts?.length ?? 0
  })).toBe(2)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.riverways-attempts .is-used')).toHaveCount(2)
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
  const moveLaterLabel = await moveLater.getAttribute('aria-label')
  expect(moveLaterLabel).toBeTruthy()
  const movedCity = moveLaterLabel!.replace(/^Move (.*) later$/, '$1')
  await moveLater.focus()
  await page.keyboard.press('Space')
  await expect(rows.first()).not.toHaveText(firstBefore)
  const movedCityLater = page.getByRole('button', { name: moveLaterLabel! })
  await expect(movedCityLater).toBeFocused()
  await page.getByRole('button', { name: `Move ${movedCity} earlier` }).focus()
  await page.keyboard.press('Space')
  await expect(rows.first()).toContainText(movedCity)
  await expect(movedCityLater).toBeFocused()
  await page.keyboard.press('Space')
  await expect(rows.nth(1)).toContainText(movedCity)
  await expect(movedCityLater).toBeFocused()
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

test('Map Projection Match renders the four map views, restores checked feedback and completes a Free Play set', async ({ page }) => {
  await page.goto('/explore')
  const catalogueCard = page.locator('.game-card-projection-match')
  await expect(catalogueCard).toBeVisible()
  await expect(catalogueCard.getByRole('heading', { name: 'Map Projection Match' })).toBeVisible()
  await expect(catalogueCard.getByRole('link')).toHaveAttribute('href', '/games/projection-match?mode=freeplay')
  await expect(catalogueCard.locator('.art-projection-match svg')).toBeVisible()

  await openGame(page, 'projection-match')
  const task = page.getByRole('heading', { level: 3 })
  const firstPrompt = await task.innerText()
  await expect(page.locator('.projection-map-option')).toHaveCount(4)
  await expect(page.locator('.projection-map-visual path.projection-map-land')).toHaveCount(4)
  for (const path of await page.locator('.projection-map-land').all()) expect((await path.getAttribute('d'))?.length ?? 0).toBeGreaterThan(100)
  const optionNames = await page.locator('.projection-map-option').evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label') ?? ''))
  expect(optionNames).toHaveLength(4)
  expect(new Set(optionNames).size).toBe(4)
  expect(optionNames.join(' ').toLowerCase()).toContain('curved meridians')
  expect(optionNames.join(' ').toLowerCase()).toContain('evenly spaced meridians')
  expect(optionNames.join(' ').toLowerCase()).toContain('hemisphere')
  await expect(page.getByRole('button', { name: /oval world map/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /latitude lines get farther apart toward the poles/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /evenly spaced meridians/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /round, globe-like view/i })).toBeVisible()
  await page.screenshot({ path: 'artifacts/qa/product-quality/map-projection-match-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.projection-map-grid')).toHaveCSS('grid-template-columns', /\d+px \d+px/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  await page.screenshot({ path: 'artifacts/qa/product-quality/map-projection-match-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 960 })

  await page.getByRole('button', { name: projectionOptionFor(firstPrompt) }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Check map' }).click()
  await expect(page.getByRole('status')).toBeFocused()
  await expect(page.getByRole('status')).toContainText('Good match.')
  await expect(page.locator('.projection-option-name')).toHaveCount(4)
  const checkedOptionNames = await page.locator('.projection-map-option').evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label') ?? ''))
  for (const name of ['Equal Earth', 'Mercator', 'Equirectangular', 'Orthographic']) {
    expect(checkedOptionNames.join(' ')).toContain(name)
  }
  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId: string; payload?: { answers?: string[] } }>
    return sessions.find((session) => session.gameId === 'projection-match')?.payload?.answers?.length ?? 0
  })).toBe(1)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(task).toHaveText(firstPrompt)
  await expect(page.getByRole('status')).toBeFocused()
  await expect(page.getByRole('status')).toContainText('Good match.')
  await page.getByRole('button', { name: 'Next mapping task' }).click()
  await expect(page.getByRole('heading', { level: 3 })).toBeFocused()

  for (let round = 1; round < 4; round += 1) {
    await page.getByRole('button', { name: projectionOptionFor(await task.innerText()) }).click()
    await page.getByRole('button', { name: 'Check map' }).click()
    if (round < 3) {
      await expect(page.getByRole('status')).toContainText('Good match.')
      await page.getByRole('button', { name: 'Next mapping task' }).click()
    }
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog .game-results-summary')).toContainText('4 / 4 correct')
  await expect(page.locator('.game-results-dialog .game-results-score')).toContainText('1,000')
  await expect(page.locator('.game-results-dialog')).toContainText('tradeoffs')
  await page.locator('.game-results-dialog').getByRole('button', { name: 'Match another set' }).click()
  await expect(page.locator('.projection-match-heading .eyebrow')).toContainText('1 of 4')
})

test('the new games remain usable with touch at a narrow viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  try {
    await openGame(page, 'rivers')
    await page.getByRole('button', { name: 'Switch to dark appearance' }).tap()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('.map-line-feature')).toHaveCSS('stroke', 'rgb(242, 154, 98)')
    await expect(page.locator('.map-line-casing')).toHaveCSS('stroke', 'rgb(24, 22, 20)')
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

    await openGame(page, 'projection-match')
    await expect(page.locator('.projection-map-land').first()).toHaveCSS('fill', 'rgb(213, 196, 173)')
    await page.getByRole('button', { name: 'Map option A' }).tap()
    await page.getByRole('button', { name: 'Check map' }).tap()
    await expect(page.getByRole('status')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  } finally {
    await context.close()
  }
})
