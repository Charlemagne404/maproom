import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import type { Country } from '../src/geography/types'
import { eligibleCountries } from '../src/geography/eligibility'
import { validGridPresets } from '../src/puzzles/engine'

const screenshotDirectory = 'artifacts/qa/maps-gameplay-ux'

test.beforeAll(() => mkdirSync(screenshotDirectory, { recursive: true }))

async function openFreePlay(page: Page, gameId: string, format?: string) {
  const query = new URLSearchParams({ mode: 'freeplay' })
  if (format) query.set('format', format)
  await page.goto(`/games/${gameId}?${query}`)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.game-body')).toBeVisible({ timeout: 30_000 })
}

async function mapTransform(page: Page) {
  return page.locator('.geo-map .map-transform-layer').getAttribute('transform')
}

async function contentPointUnderCursor(page: Page, point: { x: number; y: number }) {
  return page.locator('.geo-map').evaluate((element, cursor) => {
    const layer = (element as SVGSVGElement).querySelector<SVGGElement>('.map-transform-layer')
    const layerMatrix = layer?.getScreenCTM()
    if (!layer || !layerMatrix) return null
    const contentPoint = new DOMPoint(cursor.x, cursor.y).matrixTransform(layerMatrix.inverse())
    return { x: contentPoint.x, y: contentPoint.y }
  }, point)
}

test('wheel zoom stays over the map, follows the cursor and leaves page scrolling available outside it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 })
  await openFreePlay(page, 'countries')
  const map = page.locator('.find-country-map-stage .geo-map')
  const layer = map.locator('.map-transform-layer')
  const bounds = await map.boundingBox()
  if (!bounds) throw new Error('The interactive map should have a visible viewport.')
  expect(await map.evaluate((node) => getComputedStyle(node).touchAction)).toBe('none')
  await expect(map.locator('.map-country.is-unavailable').first()).toHaveCSS('fill', 'rgb(183, 177, 168)')

  const cursor = { x: bounds.x + bounds.width * .64, y: bounds.y + bounds.height * .43 }
  const beforeAnchor = await contentPointUnderCursor(page, cursor)
  const beforeWheel = await layer.getAttribute('transform')
  const scrollBeforeMapWheel = await page.evaluate(() => window.scrollY)
  await page.mouse.move(cursor.x, cursor.y)
  await page.mouse.wheel(0, -120)
  await expect.poll(() => layer.getAttribute('transform')).not.toBe(beforeWheel)
  await page.waitForTimeout(190)
  const afterAnchor = await contentPointUnderCursor(page, cursor)
  expect(beforeAnchor).not.toBeNull()
  expect(afterAnchor).not.toBeNull()
  expect(Math.hypot(afterAnchor!.x - beforeAnchor!.x, afterAnchor!.y - beforeAnchor!.y)).toBeLessThan(1)
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeMapWheel)

  const beforeTrackpad = await layer.getAttribute('transform')
  const trackpadEvent = await map.evaluate((svg) => {
    const rect = svg.getBoundingClientRect()
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      deltaY: 18,
      clientX: rect.left + rect.width * .62,
      clientY: rect.top + rect.height * .46,
    })
    svg.dispatchEvent(event)
    return { prevented: event.defaultPrevented, mode: event.deltaMode }
  })
  expect(trackpadEvent).toEqual({ prevented: true, mode: 0 })
  await expect.poll(() => layer.getAttribute('transform')).not.toBe(beforeTrackpad)

  await page.getByRole('button', { name: 'Reset map view' }).click()
  const resetTransform = await layer.getAttribute('transform')
  const dragBounds = await map.boundingBox()
  if (!dragBounds) throw new Error('The map should remain visible after reset.')
  await page.mouse.move(dragBounds.x + dragBounds.width * .52, dragBounds.y + dragBounds.height * .5)
  await page.mouse.down()
  await page.mouse.move(dragBounds.x + dragBounds.width * .58, dragBounds.y + dragBounds.height * .54, { steps: 4 })
  await page.mouse.up()
  await expect.poll(() => layer.getAttribute('transform')).not.toBe(resetTransform)
  await page.screenshot({ path: `${screenshotDirectory}/find-country-desktop-light.png`, fullPage: true })

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(map.locator('.map-country.is-active, .map-country.is-correct, .map-country.is-wrong')).toHaveCount(0)
  const pageScrollBefore = await page.evaluate(() => window.scrollY)
  await page.mouse.move(5, Math.min(420, dragBounds.y + 120))
  await page.mouse.wheel(0, 240)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(pageScrollBefore)

  const zoomIn = page.getByRole('button', { name: 'Zoom in' })
  for (let step = 0; step < 10 && !(await zoomIn.isDisabled()); step += 1) await zoomIn.click()
  await expect(zoomIn).toBeDisabled()
  await page.getByRole('button', { name: 'Reset map view' }).click()
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
})

test('touch pointers pan and pinch without turning controls into map gestures', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  try {
    await openFreePlay(page, 'countries')
    const map = page.locator('.find-country-map-stage .geo-map')
    await expect(map).toHaveCSS('touch-action', 'none')
    const bounds = await map.boundingBox()
    if (!bounds) throw new Error('The touch map should have a visible viewport.')
    const point = { x: bounds.x + bounds.width * .48, y: bounds.y + bounds.height * .52 }
    const beforePan = await mapTransform(page)
    await map.evaluate((svg, origin) => {
      const pointer = (type: string, id: number, x: number, y: number) => svg.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: id,
        pointerType: 'touch',
        isPrimary: id === 31,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
      }))
      pointer('pointerdown', 31, origin.x, origin.y)
      pointer('pointermove', 31, origin.x + 52, origin.y + 28)
      pointer('pointerup', 31, origin.x + 52, origin.y + 28)
    }, point)
    await expect.poll(() => mapTransform(page)).not.toBe(beforePan)

    await page.getByRole('button', { name: 'Reset map view' }).click()
    const beforePinch = await mapTransform(page)
    await map.evaluate((svg, origin) => {
      const pointer = (type: string, id: number, x: number, y: number) => svg.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: id,
        pointerType: 'touch',
        isPrimary: id === 41,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
      }))
      pointer('pointerdown', 41, origin.x - 40, origin.y)
      pointer('pointerdown', 42, origin.x + 40, origin.y)
      pointer('pointermove', 42, origin.x + 72, origin.y + 4)
      pointer('pointerup', 42, origin.x + 72, origin.y + 4)
      pointer('pointerup', 41, origin.x - 40, origin.y)
    }, point)
    await expect.poll(() => mapTransform(page)).not.toBe(beforePinch)
    await page.getByRole('button', { name: 'Switch to dark appearance' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.screenshot({ path: `${screenshotDirectory}/find-country-mobile-dark.png`, fullPage: true })
  } finally {
    await context.close()
  }
})

test('small island hit areas remain selectable and unknown map features stay gray', async ({ page }) => {
  await openFreePlay(page, 'countries')
  const map = page.locator('.find-country-map-stage .geo-map')
  const islandTarget = map.locator('.map-country-hit-target[data-country-code="MHL"]')
  await expect(islandTarget).toHaveCount(1)
  await map.evaluate((svg) => {
    svg.addEventListener('click', (event) => {
      const target = event.target as SVGElement
      ;(window as Window & { __lastMapClickTarget?: string }).__lastMapClickTarget = `${target.tagName}.${target.getAttribute('class') ?? ''}:${target.getAttribute('data-country-code') ?? ''}`
    }, true)
  })
  await islandTarget.click({ force: true })
  expect(await page.evaluate(() => (window as Window & { __lastMapClickTarget?: string }).__lastMapClickTarget)).toContain('circle.map-country-hit-target:MHL')
  await expect(map.locator('.map-country[data-country-code="MHL"]')).toHaveClass(/is-active/, { timeout: 900 })
  await expect(map.locator('.map-country.is-unavailable').first()).toHaveCSS('fill', 'rgb(183, 177, 168)')
  await page.screenshot({ path: `${screenshotDirectory}/find-country-island-selection.png`, fullPage: true })
  await expect(page.locator('.country-answer-feedback')).toBeHidden()
  const keyboardIsland = map.locator('.map-country[data-country-code="MHL"]')
  await keyboardIsland.focus()
  await page.keyboard.press('Enter')
  await expect(keyboardIsland).toHaveClass(/is-active/)
})

test('City Location places a marker on the map and keeps coordinate entry secondary', async ({ page }) => {
  await openFreePlay(page, 'cities', 'locate-city')
  const stage = page.locator('.city-map-stage')
  const map = stage.locator('.geo-map')
  const bounds = await stage.boundingBox()
  if (!bounds) throw new Error('The city map should have a visible viewport.')
  expect(bounds.height).toBeGreaterThan(450)
  expect(await page.locator('.coordinate-tools').evaluate((node) => (node as HTMLDetailsElement).open)).toBe(false)
  await map.click({ position: { x: bounds.width * .5, y: bounds.height * .5 } })
  await expect(map.locator('.map-marker-guess')).toHaveCount(1)
  const placeMarker = page.getByRole('button', { name: 'Place marker' })
  await placeMarker.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.cities-map-game-body > .answer-feedback')).toBeVisible()
  await expect(map.locator('.map-marker-answer')).toHaveCount(1)
  await page.screenshot({ path: `${screenshotDirectory}/city-location-marker-feedback.png`, fullPage: true })
})

test('capital autocomplete gives no country-name hint for a country-to-capital prompt', async ({ page }) => {
  await openFreePlay(page, 'cities', 'country-to-capital')
  const input = page.getByRole('combobox', { name: 'Type the capital city' })
  await input.fill('a')
  const option = page.getByRole('option').first()
  await expect(option).toBeVisible()
  await expect(option.locator('small')).toHaveCount(0)
  await page.screenshot({ path: `${screenshotDirectory}/capital-answer-options.png`, fullPage: true })
})

test('Flag Study colors the selected answer and reveals correctness on the option', async ({ page }) => {
  await openFreePlay(page, 'flags')
  const choices = page.locator('.flag-choice')
  await choices.first().click()
  const rightChoice = page.locator('.flag-choice.is-right')
  await expect(rightChoice).toHaveCount(1)
  const rightColor = await rightChoice.evaluate((node) => getComputedStyle(node).backgroundColor)
  expect(rightColor).not.toBe('rgba(0, 0, 0, 0)')
  await page.screenshot({ path: `${screenshotDirectory}/flag-study-answer-feedback.png`, fullPage: true })
})

test('Geography Grid opens a tile overlay and shows icon-and-color clue feedback', async ({ page }) => {
  await openFreePlay(page, 'grid')
  const countryResponse = await page.request.get(new URL('/data/countries.json', page.url()).toString())
  expect(countryResponse.ok()).toBe(true)
  const countries = eligibleCountries((await countryResponse.json()).countries as Country[], 'standard')
  const title = await page.locator('.question-toolbar h2').innerText()
  const preset = validGridPresets(countries, { expanded: true }).find((item) => item.title === title)
  expect(preset).toBeDefined()
  let target: { key: string; name: string } | null = null
  for (const [rowIndex, row] of preset!.rows.entries()) {
    for (const [columnIndex, column] of preset!.columns.entries()) {
      const invalid = countries.find((country) => !row.matches(country) || !column.matches(country))
      if (invalid) {
        target = { key: `${rowIndex}:${columnIndex}`, name: invalid.name }
        break
      }
    }
    if (target) break
  }
  expect(target).not.toBeNull()
  await page.locator(`[data-cell-key="${target!.key}"] .grid-cell-trigger`).click()
  await expect(page.locator('.grid-entry-scrim')).toBeVisible()
  const dialog = page.getByRole('dialog', { name: /Answer for/ })
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  const input = dialog.getByRole('combobox')
  await input.fill(target!.name)
  await page.getByRole('option', { name: new RegExp(`^${target!.name}`) }).click()
  await expect(dialog.locator('.grid-criteria-feedback')).toBeVisible()
  expect(await dialog.locator('.grid-criteria-feedback .is-missed').count()).toBeGreaterThan(0)
  await page.screenshot({ path: `${screenshotDirectory}/geography-grid-overlay-feedback.png`, fullPage: true })
})

test('changed game inputs remain usable with touch on a narrow dark viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  try {
    await openFreePlay(page, 'routes')
    await page.getByRole('button', { name: 'Switch to dark appearance' }).tap()
    const routeInput = page.getByRole('combobox', { name: 'Add an intermediate country in any order' })
    await routeInput.tap()
    await routeInput.fill('a')
    const routeOption = page.getByRole('option').first()
    await expect(routeOption).toBeVisible()
    await routeOption.tap()
    await expect(page.locator('.route-selected-set button')).toHaveCount(1)
    await page.screenshot({ path: `${screenshotDirectory}/border-route-mobile-dark.png`, fullPage: true })

    await openFreePlay(page, 'countries')
    const islandMap = page.locator('.find-country-map-stage .geo-map')
    const islandHit = islandMap.locator('.map-country-hit-target[data-country-code="MHL"]')
    await expect(islandHit).toHaveCount(1)
    const islandBounds = await islandHit.boundingBox()
    if (!islandBounds) throw new Error('The small-island touch target should have visible bounds.')
    await page.touchscreen.tap(islandBounds.x + islandBounds.width / 2, islandBounds.y + islandBounds.height / 2)
    await expect(islandMap.locator('.map-country[data-country-code="MHL"]')).toHaveClass(/is-active/)

    await openFreePlay(page, 'cities', 'locate-city')
    const cityMap = page.locator('.city-map-stage .geo-map')
    const cityBounds = await cityMap.boundingBox()
    if (!cityBounds) throw new Error('The city map should have visible bounds on a narrow viewport.')
    await page.touchscreen.tap(cityBounds.x + cityBounds.width / 2, cityBounds.y + cityBounds.height / 2)
    await expect(cityMap.locator('.map-marker-guess')).toHaveCount(1)
    await page.getByRole('button', { name: 'Place marker' }).tap()
    await expect(page.locator('.cities-map-game-body > .answer-feedback')).toBeVisible()
    await page.screenshot({ path: `${screenshotDirectory}/city-location-mobile-dark.png`, fullPage: true })

    await openFreePlay(page, 'flags')
    await page.locator('.flag-choice').first().tap()
    await expect(page.locator('.flag-choice.is-right')).toBeVisible()
    await page.screenshot({ path: `${screenshotDirectory}/flag-study-mobile-dark.png`, fullPage: true })

    await openFreePlay(page, 'grid')
    const countryResponse = await page.request.get(new URL('/data/countries.json', page.url()).toString())
    expect(countryResponse.ok()).toBe(true)
    const countries = eligibleCountries((await countryResponse.json()).countries as Country[], 'standard')
    const title = await page.locator('.question-toolbar h2').innerText()
    const preset = validGridPresets(countries, { expanded: true }).find((item) => item.title === title)
    expect(preset).toBeDefined()
    let invalidPick: { key: string; name: string } | null = null
    for (const [rowIndex, row] of preset!.rows.entries()) {
      for (const [columnIndex, column] of preset!.columns.entries()) {
        const country = countries.find((candidate) => !row.matches(candidate) || !column.matches(candidate))
        if (country) {
          invalidPick = { key: `${rowIndex}:${columnIndex}`, name: country.name }
          break
        }
      }
      if (invalidPick) break
    }
    expect(invalidPick).not.toBeNull()
    await page.locator(`[data-cell-key="${invalidPick!.key}"] .grid-cell-trigger`).tap()
    const gridDialog = page.getByRole('dialog', { name: /Answer for/ })
    await expect(gridDialog).toBeVisible()
    const gridInput = gridDialog.getByRole('combobox')
    await gridInput.fill(invalidPick!.name)
    await page.getByRole('option', { name: new RegExp(`^${invalidPick!.name}`) }).tap()
    await expect(gridDialog.locator('.grid-criteria-feedback .is-missed').first()).toBeVisible()
    await page.screenshot({ path: `${screenshotDirectory}/geography-grid-mobile-dark.png`, fullPage: true })
  } finally {
    await context.close()
  }
})
