import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import type { Country, GeoFeature } from '../src/geography/types'
import { eligibleCountries } from '../src/geography/eligibility'
import { loadTopologyFeatures } from './topology'
import { isCurrentWholeSettlement } from '../src/geography/cityRecords'
import { buildOutlineCandidateGroups, EMPTY_OUTLINE_PROGRESS, outlineQuestionAt } from '../src/games/outlines/questionPool'
import { flagCountryPool } from '../src/games/flags/questionPool'
import { gridCandidates, shortestPath, validGridPresets } from '../src/puzzles/engine'
import { CONNECTIONS_PUZZLES } from '../src/puzzles/connections-content'
import { exploreExperienceCount, freePlayCardCount } from './gameCatalogCounts'

test.beforeAll(() => {
  mkdirSync('artifacts/qa/product-consistency', { recursive: true })
  mkdirSync('artifacts/qa/maps-gameplay-ux', { recursive: true })
})

interface CountryRecord {
  iso3: string
  name: string
  continent: string | null
  subregion: string | null
  landlocked: boolean
  hasGeometry: boolean
  borders: string[]
  population: number | null
  areaKm2: number | null
  capital: string | null
  capitalCoordinates?: { lat: number; lon: number } | null
  flagCode?: string
  independent?: boolean
}

interface CityRecord {
  id: string
  name: string
  countryIso3: string
  population: number
  lat: number
  lon: number
  featureCode: string
  capital?: boolean
}

async function openGame(page: Page, id: string, mode: 'daily' | 'freeplay' = 'freeplay', format?: string) {
  const query = new URLSearchParams({ mode: mode === 'daily' ? 'daily' : 'freeplay' })
  if (format) query.set('format', format)
  await page.goto(`/games/${id}?${query}`)
  await expect(page.locator('.game-context-bar')).toBeVisible()
  await expect(page.locator('.game-context-title')).toHaveCount(1)
  if (mode !== 'daily') {
    await page.getByRole('button', { name: 'Start free play' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect.poll(() => page.evaluate(() => {
      const playfield = document.querySelector('.game-playfield')
      return Boolean(playfield && playfield.contains(document.activeElement))
    })).toBe(true)
  }
  await expect(page.locator('.game-body')).toBeVisible({ timeout: 30_000 })
}

async function submitText(page: Page, selector: string, answer: string) {
  const input = page.locator(selector)
  await input.fill(answer)
  if (await page.locator('.suggestion-option').count()) {
    await input.press('Enter')
    await expect(page.locator('.suggestion-option')).toHaveCount(0)
  }
  await input.press('Enter')
}

async function chooseSuggestion(page: Page, selector: string, answer: string) {
  const input = page.locator(selector)
  await input.fill(answer)
  const option = page.locator('.suggestion-option').filter({ has: page.getByText(answer, { exact: true }) }).first()
  await expect(option).toBeVisible()
  await option.click()
}

async function setGameSetting(page: Page, label: string, value: string | { label: string }) {
  const panel = page.getByRole('group', { name: 'Game settings' })
  if (!(await panel.isVisible())) await page.getByRole('button', { name: 'Game settings' }).click()
  await panel.getByRole('combobox', { name: label, exact: true }).selectOption(value)
}

async function answerOnMapByKeyboard(page: Page, answer: string) {
  const mapCountries = page.locator('.geo-map path[role="button"]')
  const index = await mapCountries.evaluateAll((elements, name) => elements.findIndex((element) => element.getAttribute('aria-label') === name), answer)
  expect(index, `map country ${answer}`).toBeGreaterThanOrEqual(0)
  await mapCountries.nth(index).evaluate((element) => (element as SVGElement).focus())
  await page.keyboard.press('Enter')
}

async function waitForRoundProgress(page: Page, label: string, value: number) {
  await expect(page.getByRole('progressbar', { name: `${label} progress` })).toHaveAttribute('aria-valuenow', String(value), { timeout: 5_000 })
}

async function countryData(page: Page): Promise<CountryRecord[]> {
  const response = await page.request.get(new URL('/data/countries.json', page.url()).toString())
  expect(response.ok()).toBe(true)
  return (await response.json()).countries as CountryRecord[]
}

async function cityData(page: Page): Promise<CityRecord[]> {
  const response = await page.request.get(new URL('/data/cities.json', page.url()).toString())
  expect(response.ok()).toBe(true)
  return (await response.json()).cities as CityRecord[]
}

async function mapPathPoint(page: Page, selector: string, index: number): Promise<{ x: number; y: number } | null> {
  const path = page.locator(selector).nth(index)
  await path.scrollIntoViewIfNeeded()
  return path.evaluate((element) => {
    const shape = element as SVGPathElement
    const bounds = shape.getBBox()
    const matrix = shape.getScreenCTM()
    if (!matrix || bounds.width === 0 || bounds.height === 0) return null
    for (let yStep = 1; yStep < 30; yStep += 1) {
      for (let xStep = 1; xStep < 30; xStep += 1) {
        const point = new DOMPoint(bounds.x + bounds.width * xStep / 30, bounds.y + bounds.height * yStep / 30)
        if (shape.isPointInFill(point)) {
          return {
            x: matrix.a * point.x + matrix.c * point.y + matrix.e,
            y: matrix.b * point.x + matrix.d * point.y + matrix.f,
          }
        }
      }
    }
    return null
  })
}

async function mapFeatureIndex(page: Page, iso3: string, eligibleCodes: Set<string>): Promise<number> {
  const collection = await loadTopologyFeatures(page, '/data/countries.topo.json')
  const features = collection.filter((feature) => feature.geometry && feature.properties?.iso3 && eligibleCodes.has(feature.properties.iso3))
  return features.findIndex((feature) => feature.properties?.iso3 === iso3)
}

async function waitForDailySession(page: Page, gameId: string) {
  await expect.poll(() => page.evaluate((id) => {
    const sessions = JSON.parse(window.localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId?: string; mode?: string; date?: string; puzzleId?: string; seed?: string; payload?: Record<string, unknown> }>
    return sessions.find((session) => session.gameId === id && session.mode === 'daily') ?? null
  }, gameId), { timeout: 10_000 }).not.toBeNull()
  return page.evaluate((id) => {
    const sessions = JSON.parse(window.localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId?: string; mode?: string; date?: string; puzzleId?: string; seed?: string; payload?: Record<string, unknown> }>
    return sessions.find((session) => session.gameId === id && session.mode === 'daily') ?? null
  }, gameId)
}

async function displayedFlagCountry(page: Page, region = 'All regions'): Promise<string> {
  const iconClass = await page.locator('.flag-display [role="img"]').getAttribute('class')
  const flagCode = iconClass?.split(/\s+/).find((name) => name.startsWith('fi-') && name !== 'fi')?.slice(3)
  expect(flagCode, 'flag icon should expose its bundled flag code to the test').toBeTruthy()
  const countries = await countryData(page)
  const visibleChoiceNames = new Set(await page.locator('.flag-choice-name').allTextContents())
  const candidates = visibleChoiceNames.size
    ? countries.filter((item) => item.flagCode === flagCode && visibleChoiceNames.has(item.name))
    : flagCountryPool(countries as unknown as Country[], region, 'standard').filter((item) => item.flagCode === flagCode)
  const country = candidates.find((item) => item.independent) ?? candidates[0]
  expect(country, `eligible country with flag code ${flagCode}`).toBeDefined()
  return country!.name
}

async function flagChoiceForCountry(page: Page, countryName: string) {
  const country = (await countryData(page)).find((item) => item.name === countryName)
  expect(country?.flagCode).toBeTruthy()
  const choices = page.locator('.flag-choice')
  for (let index = 0; index < await choices.count(); index += 1) {
    const iconClass = await choices.nth(index).locator('[role="img"]').getAttribute('class')
    if (iconClass?.split(/\s+/).includes(`fi-${country!.flagCode}`)) return choices.nth(index)
  }
  throw new Error(`No flag choice for ${countryName}`)
}

async function shellGeometry(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const { x, y, width, height } = element.getBoundingClientRect()
      return [x, y, width, height].map((value) => Math.round(value * 10) / 10)
    }
    return {
      header: rect('.site-header'),
      brand: rect('.brand'),
      nav: rect('.primary-nav'),
      utility: rect('.header-tools'),
      menu: rect('.mobile-menu-toggle'),
      brandFontSize: getComputedStyle(document.querySelector('.brand')!).fontSize,
    }
  })
}

async function expectCenteredFlagLayout(page: Page, direction: 'flag-to-country' | 'country-to-flag') {
  const layout = await page.evaluate(() => {
    const bounds = (element: Element | null) => {
      if (!element) return null
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height, right: x + width, bottom: y + height }
    }
    const frameSelector = '.flag-frame-large'
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      nav: bounds(document.querySelector('.site-header')),
      context: bounds(document.querySelector('.game-context-bar')),
      round: bounds(document.querySelector('.flag-round')),
      question: bounds(document.querySelector('.flag-question-row h1')),
      display: bounds(document.querySelector('.flag-display')),
      flag: bounds(document.querySelector(frameSelector)),
      answerGrid: bounds(document.querySelector('.flag-choice-grid, .answer-form')),
      cards: [...document.querySelectorAll('.image-choice-grid .flag-choice')].map((element) => bounds(element)),
      images: [...document.querySelectorAll('.image-choice-grid .flag-frame')].map((element) => bounds(element)),
      pageWidth: document.documentElement.scrollWidth,
    }
  })
  expect(layout.nav).not.toBeNull()
  expect(layout.round).not.toBeNull()
  expect(layout.question).not.toBeNull()
  const round = layout.round!
  const question = layout.question!
  expect(Math.abs((question.x + question.width / 2) - layout.viewport.width / 2)).toBeLessThan(2)
  expect(layout.context).not.toBeNull()
  expect(question.y).toBeGreaterThanOrEqual(layout.context!.bottom - 1)
  expect(Math.abs((round.y + round.height / 2) - ((layout.context!.bottom + layout.viewport.height) / 2))).toBeLessThan(48)
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport.width)

  if (direction === 'flag-to-country') {
    expect(layout.display).not.toBeNull()
    expect(layout.flag).not.toBeNull()
    expect(layout.answerGrid).not.toBeNull()
    const display = layout.display!
    const flag = layout.flag!
    const answers = layout.answerGrid!
    expect(flag.width).toBeGreaterThan(150)
    expect(flag.width).toBeLessThanOrEqual(560)
    expect(flag.height).toBeLessThanOrEqual(360)
    expect(flag.x).toBeGreaterThanOrEqual(display.x - 1)
    expect(flag.right).toBeLessThanOrEqual(display.right + 1)
    expect(flag.y).toBeGreaterThanOrEqual(display.y - 1)
    expect(flag.bottom).toBeLessThanOrEqual(display.bottom + 1)
    expect(display.y).toBeGreaterThanOrEqual(question.bottom - 1)
    expect(answers.y).toBeGreaterThanOrEqual(display.bottom - 1)
  } else {
    expect(layout.answerGrid).not.toBeNull()
    expect(layout.cards).toHaveLength(4)
    expect(layout.images).toHaveLength(4)
    const answers = layout.answerGrid!
    expect(Math.abs((answers.x + answers.width / 2) - layout.viewport.width / 2)).toBeLessThan(2)
    for (const [index, image] of layout.images.entries()) {
      const card = layout.cards[index]!
      expect(image!.width).toBeGreaterThan(layout.viewport.width < 600 ? 100 : 150)
      expect(image!.height).toBeGreaterThan(60)
      expect(image!.x).toBeGreaterThanOrEqual(card!.x - 1)
      expect(image!.right).toBeLessThanOrEqual(card!.right + 1)
      expect(image!.y).toBeGreaterThanOrEqual(card!.y - 1)
      expect(image!.bottom).toBeLessThanOrEqual(card!.bottom + 1)
    }
  }
}

test('daily home, library search, favorites, keyboard access and mobile layout', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') consoleErrors.push(message.text()) })

  await page.goto('/')
  await expect(page.locator('.welcome-hero h1')).toBeVisible()
  const homeFavoriteNames = await page.locator('.daily-grid .favorite-button, .other-games-carousel .favorite-button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''))
  expect(new Set(homeFavoriteNames).size).toBe(homeFavoriteNames.length)
  await expect(page.locator('.daily-section-heading h2')).toHaveText('Today’s puzzles')
  await expect(page.locator('.daily-grid .game-card')).toHaveCount(6)
  await expect(page.locator('.other-games-carousel .game-card')).toHaveCount(freePlayCardCount)
  await expect(page.locator('.other-games-carousel .game-card-link').first()).toHaveAttribute('href', /mode=freeplay/)
  await expect(page.getByRole('link', { name: 'Explore all games' })).toBeVisible()
  const practiceCarousel = page.locator('.other-games-carousel')
  await page.setViewportSize({ width: 800, height: 900 })
  await practiceCarousel.focus()
  const carouselBefore = await practiceCarousel.evaluate((element) => element.scrollLeft)
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => practiceCarousel.evaluate((element) => element.scrollLeft)).toBeGreaterThan(carouselBefore)
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.locator('.daily-grid .game-card-link').first().click()
  await expect(page).toHaveURL(/mode=daily$/)
  await expect(page.locator('.game-context-daily')).toHaveText('Today’s puzzle')
  await expect(page.locator('.mode-switch')).toHaveCount(0)
  await expect(page.locator('.game-body')).toBeVisible()
  await page.goto('/')
  await page.locator('.other-games-carousel .game-card-link').first().click()
  await expect(page).toHaveURL(/mode=freeplay$/)
  await expect(page.getByRole('group', { name: 'Free play setup' })).toBeVisible()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.game-body')).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.game-card-action span')).toHaveCount(0)
  await expect(page.locator('.header-tools .settings-shortcut')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Data sources', exact: true })).toBeVisible()
  const wordmarkSize = await page.locator('.brand').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
  expect(wordmarkSize).toBeGreaterThanOrEqual(27)
  const centeredNavigation = await page.locator('.primary-nav').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2)
  })
  expect(centeredNavigation).toBeLessThan(1)
  const exploreNav = page.locator('.primary-nav .nav-link').filter({ hasText: 'Explore' })
  await exploreNav.hover()
  const underlineScale = () => exploreNav.evaluate((element) => new DOMMatrix(getComputedStyle(element, '::after').transform).a)
  await expect.poll(underlineScale).toBeLessThan(.02)
  const underlineDuration = await exploreNav.evaluate((element) => getComputedStyle(element, '::after').transitionDuration)
  expect(underlineDuration).toBe('0s')
  const currentNav = page.locator('.primary-nav .nav-link.is-current')
  await expect.poll(() => currentNav.evaluate((element) => getComputedStyle(element, '::after').opacity)).toBe('1')
  await expect.poll(() => currentNav.evaluate((element) => new DOMMatrix(getComputedStyle(element, '::after').transform).a)).toBeGreaterThan(.98)
  const exploreUnderlineOpacity = () => exploreNav.evaluate((element) => getComputedStyle(element, '::after').opacity)
  await page.mouse.move(0, 0)
  await expect.poll(exploreUnderlineOpacity).toBe('0')
  const leadCard = page.locator('.daily-grid .game-card').first()
  const leadCardBackground = await leadCard.evaluate((element) => getComputedStyle(element).backgroundColor)
  await leadCard.hover()
  const hoverLift = () => leadCard.evaluate((element) => {
    const transform = getComputedStyle(element).transform
    return transform === 'none' ? 0 : new DOMMatrix(transform).m42
  })
  await expect.poll(hoverLift).toBeLessThan(-2.8)
  await expect.poll(() => leadCard.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(leadCardBackground)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/home-tile-hover-desktop.png', fullPage: true })
  const countryMap = page.locator('.daily-grid .game-card-countries .art-world')
  await expect(countryMap).toHaveJSProperty('complete', true)
  await expect(countryMap).toHaveCSS('object-fit', 'contain')
  await expect(page.locator('.daily-grid .game-card-routes .art-route img')).toHaveCount(1)
  await expect(page.locator('.daily-grid .game-card-cities .art-city-target')).toHaveCount(1)
  await page.mouse.move(0, 0)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/home-desktop.png', fullPage: true })
  const keyboardPage = await page.context().newPage()
  await keyboardPage.goto('/')
  await keyboardPage.keyboard.press('Tab')
  await expect(keyboardPage.locator('.skip-link')).toBeFocused()
  await keyboardPage.close()

  await page.goto('/explore')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(exploreExperienceCount)
  const formatFavorites = page.locator('.explore-grid .game-format-card .favorite-button')
  const formatFavoriteNames = await formatFavorites.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''))
  expect(new Set(formatFavoriteNames).size).toBe(formatFavoriteNames.length)
  expect(formatFavoriteNames).toContain('Add Flag Match (Identify the country) to favorites')
  expect(formatFavoriteNames).toContain('Add Capitals & cities (Country to capital) to favorites')
  const flagCard = page.locator('.game-card-flags').first()
  const favorite = flagCard.locator('.favorite-button')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await expect(favorite).toHaveAttribute('aria-label', 'Remove Flag Match (Identify the country) from favorites')
  const favoriteFlagNames = await page.locator('.game-card-flags .favorite-button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''))
  expect(new Set(favoriteFlagNames).size).toBe(favoriteFlagNames.length)
  await expect(favorite.locator('svg')).toHaveCSS('animation-name', 'favorite-pop')
  await expect(favorite).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Favorites/ }).click()
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(2)
  await expect(page.locator('.explore-grid .game-card-flags')).toHaveCount(2)
  await expect(page.locator('.explore-grid .game-card-flags').nth(0)).toContainText('Identify the country')
  await expect(page.locator('.explore-grid .game-card-flags').nth(1)).toContainText('Find the flag')
  await page.getByRole('button', { name: 'All games' }).click()
  await page.getByRole('button', { name: /Favorites/ }).click()
  await page.getByLabel('Search games').fill('capitals')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(4)
  await expect(page.locator('.explore-grid .game-card-cities')).toHaveCount(4)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.welcome-hero h1')).toBeVisible()
  const menuToggle = page.locator('.mobile-menu-toggle')
  await menuToggle.click()
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await page.mouse.click(3, 400)
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'false')
  await menuToggle.click()
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(menuToggle).toBeFocused()
  await menuToggle.click()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Explore', exact: true }).click()
  await expect(page).toHaveURL(/\/explore$/)
  await page.goto('/')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/home-mobile.png', fullPage: true })
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
  expect(widths.document).toBeLessThanOrEqual(widths.viewport)
  expect(widths.body).toBeLessThanOrEqual(widths.viewport)

  await page.setViewportSize({ width: 320, height: 740 })
  for (const route of ['/', '/explore', '/settings', '/data', '/games/countries?mode=daily', '/games/grid?mode=daily', '/games/connections?mode=daily', '/games/higher-lower?mode=daily', '/games/neighbours?mode=daily', '/games/distance?mode=daily']) {
    await page.goto(route)
    await expect(page.locator('main h1').first()).toBeVisible()
    const narrowWidths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
    expect(narrowWidths.document, `${route} document overflow`).toBeLessThanOrEqual(narrowWidths.viewport)
    expect(narrowWidths.body, `${route} body overflow`).toBeLessThanOrEqual(narrowWidths.viewport)
  }
  expect(consoleErrors).toEqual([])
})

test('daily completion appears as a green check on the puzzle tile', async ({ page }) => {
  await openGame(page, 'countries', 'daily')
  for (let index = 0; index < 8; index += 1) {
    const answer = await page.locator('.question-toolbar h2 em').innerText()
    await answerOnMapByKeyboard(page, answer)
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    if (index < 7) await waitForRoundProgress(page, 'countries', index + 2)
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await page.goto('/')
  const countryTile = page.locator('.game-card-countries')
  const completionMark = countryTile.locator('.completed-mark')
  await expect(completionMark).toBeVisible()
  await expect(completionMark).toHaveAttribute('aria-label', 'Find the country played today')
  await expect(countryTile.locator('.completed-label')).toHaveCount(0)
  const geometry = await completionMark.evaluate((element) => {
    const mark = element.getBoundingClientRect()
    const card = element.closest('.game-card')!.getBoundingClientRect()
    return { markLeft: mark.left, cardLeft: card.left, markTop: mark.top, cardTop: card.top }
  })
  expect(geometry.markLeft - geometry.cardLeft).toBeLessThan(40)
  expect(geometry.markTop - geometry.cardTop).toBeLessThan(45)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/home-complete-desktop.png', fullPage: true })

  await page.goto('/games/countries?mode=daily')
  await expect(page.locator('.completed-daily-result')).toBeVisible()
  const completedBounds = await page.locator('.completed-daily-result').boundingBox()
  const mainBounds = await page.locator('main').boundingBox()
  expect(completedBounds?.x).toBeGreaterThan((mainBounds?.x ?? 0) + 120)
  expect(Math.abs((completedBounds?.y ?? 0) + (completedBounds?.height ?? 0) / 2 - ((mainBounds?.y ?? 0) + (mainBounds?.height ?? 0) / 2))).toBeLessThan(45)
  await expect(page.locator('.site-header')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Play in Free play' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/qa/product-consistency/countries-completed-daily-desktop.png', fullPage: true })
})

test('daily puzzle version changes discard stale unfinished sessions', async ({ page }) => {
  await page.goto('/')
  const date = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00'
    return `${part('year')}-${part('month')}-${part('day')}`
  })
  await page.evaluate(async (dailyDate) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('maproom-progress', 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = db.transaction('sessions', 'readwrite')
    transaction.objectStore('sessions').put({
      id: `flags:${dailyDate}`, gameId: 'flags', mode: 'daily', puzzleId: `flags:${dailyDate}:v1`, seed: `flags:${dailyDate}:v1`, date: dailyDate,
      startedAt: `${dailyDate}T09:00:00.000Z`, updatedAt: `${dailyDate}T09:04:00.000Z`, version: 1,
      payload: { index: 7, questionNumber: 8, locked: true, finished: false, answer: 'GGY', questionCodes: ['GGY'], choiceCodes: [['GGY']], correct: 7, score: 700, resolvedCount: 7, wrongCount: 0, missedQuestions: [], reveal: false, input: '', message: '' },
    })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    db.close()
  }, date)

  await page.reload()
  await openGame(page, 'flags', 'daily')
  await waitForRoundProgress(page, 'flags', 1)
  await expect(page.locator('.answer-feedback')).toHaveCount(0)
  const migrated = await waitForDailySession(page, 'flags')
  expect(migrated?.puzzleId).toBe(`flags:${date}:v2`)
  expect(migrated?.payload?.questionCodes).not.toContain('GGY')
})

test('older completed daily results remain intact while their stale saves are discarded', async ({ page }) => {
  await page.goto('/')
  const date = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00'
    return `${part('year')}-${part('month')}-${part('day')}`
  })
  await page.evaluate(async (dailyDate) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('maproom-progress', 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = db.transaction(['history', 'sessions'], 'readwrite')
    transaction.objectStore('history').put({
      id: `flags:${dailyDate}:v1`, gameId: 'flags', mode: 'daily', puzzleId: `flags:${dailyDate}:v1`, date: dailyDate,
      startedAt: `${dailyDate}T09:00:00.000Z`, completedAt: `${dailyDate}T09:05:00.000Z`, score: 700, correct: 7, total: 8, completed: true, elapsedSeconds: 300,
    })
    transaction.objectStore('sessions').put({
      id: `flags:${dailyDate}`, gameId: 'flags', mode: 'daily', puzzleId: `flags:${dailyDate}:v1`, seed: `flags:${dailyDate}:v1`, date: dailyDate,
      startedAt: `${dailyDate}T09:00:00.000Z`, updatedAt: `${dailyDate}T09:04:00.000Z`, version: 1,
      payload: { index: 7, questionNumber: 8, locked: true, finished: false, answer: 'GGY', questionCodes: ['GGY'], choiceCodes: [['GGY']], correct: 7, score: 700, resolvedCount: 7, wrongCount: 0, missedQuestions: [], reveal: false, input: '', message: '' },
    })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    db.close()
  }, date)

  await page.goto(`/games/flags?mode=daily`)
  await expect(page.locator('.completed-daily-result')).toBeVisible()
  await expect(page.locator('.completed-daily-summary')).toContainText('7 / 8')
  await expect.poll(() => page.evaluate(() => {
    const sessions = JSON.parse(window.localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ gameId?: string; mode?: string; date?: string }>
    return sessions.some((session) => session.gameId === 'flags' && session.mode === 'daily')
  })).toBe(false)

  await page.goto('/')
  await expect(page.locator('.game-card-flags .completed-mark')).toBeVisible()
})

test('all six daily families restore their saved question and in-progress state', async ({ page, context, browser }) => {
  await openGame(page, 'countries', 'daily')
  const countryQuestion = await page.locator('.question-toolbar h2 em').innerText()
  await page.clock.pauseAt(new Date())
  await answerOnMapByKeyboard(page, countryQuestion)
  await expect(page.locator('.answer-feedback')).toBeVisible()
  const countrySession = await waitForDailySession(page, 'countries')
  expect(countrySession?.payload?.answerLocked).toBe(true)
  await page.reload()
  await page.clock.resume()
  await expect(page.locator('.question-toolbar h2 em')).toHaveText(countryQuestion)
  await expect(page.locator('.answer-feedback')).toBeVisible()
  await waitForRoundProgress(page, 'countries', 2)

  await openGame(page, 'outlines', 'daily')
  await page.locator('#outline-answer').fill('Can')
  await waitForDailySession(page, 'outlines')
  await page.reload()
  await expect(page.locator('#outline-answer')).toHaveValue('Can')

  await openGame(page, 'routes', 'daily')
  await page.getByRole('button', { name: 'Hint' }).click()
  const routeStep = (await page.locator('.route-hint').innerText()).match(/includes (.+)\.$/)?.[1]
  expect(routeStep).toBeTruthy()
  await submitText(page, '#route-country', routeStep!)
  const routeSession = await waitForDailySession(page, 'routes')
  expect(routeSession?.payload?.route).toHaveLength(2)
  await page.goto('/')
  await openGame(page, 'routes', 'daily')
  await expect(page.locator('.route-selected-set button')).toHaveCount(1)
  await expect(page.locator('.route-selected-set')).toContainText(routeStep!)

  await openGame(page, 'flags', 'daily')
  const flagAnswer = await displayedFlagCountry(page)
  const flagChoices = page.locator('.flag-choice')
  let wrongFlagChoice = -1
  for (let index = 0; index < await flagChoices.count(); index += 1) {
    if (await flagChoices.nth(index).locator('.flag-choice-name').innerText() !== flagAnswer) {
      wrongFlagChoice = index
      break
    }
  }
  expect(wrongFlagChoice).toBeGreaterThanOrEqual(0)
  await page.clock.pauseAt(new Date())
  await flagChoices.nth(wrongFlagChoice).click()
  await expect(page.locator('.flag-choice.is-wrong')).toBeVisible()
  await expect(page.locator('.flag-choice.is-right')).toBeVisible()
  const flagSession = await waitForDailySession(page, 'flags')
  expect(flagSession?.payload?.locked).toBe(true)
  await page.clock.resume()
  await page.reload()
  await expect(page.locator('.flag-choice.is-wrong')).toBeVisible()
  await expect(page.locator('.flag-choice.is-right')).toBeVisible()
  await waitForRoundProgress(page, 'flags', 1)

  await openGame(page, 'grid', 'daily')
  const originalGridTitle = await page.locator('.question-toolbar h2').innerText()
  await page.locator('.grid-cell-trigger').first().click()
  await page.locator('#grid-answer-input').fill('Can')
  const gridSession = await waitForDailySession(page, 'grid')
  expect(gridSession?.payload?.inputs).toMatchObject({ '0:0': 'Can' })
  const reopened = await context.newPage()
  await openGame(reopened, 'grid', 'daily')
  await expect(reopened.locator('.question-toolbar h2')).toHaveText(originalGridTitle)
  await expect(reopened.locator('#grid-answer-input')).toHaveValue('Can')
  await reopened.close()

  await openGame(page, 'cities', 'daily')
  const cityQuestion = await page.locator('.question-toolbar h2').innerText()
  const capitalChoices = page.locator('.capital-choice-grid .answer-choice')
  if (await capitalChoices.count()) {
    await capitalChoices.first().click()
    await expect(page.locator('.answer-feedback')).toBeVisible()
    await waitForDailySession(page, 'cities')
    await page.reload()
    await expect(page.locator('.question-toolbar h2')).toHaveText(cityQuestion)
    await expect(page.locator('.answer-feedback')).toBeVisible()
  } else if (await page.locator('#city-identify-answer').count()) {
    await page.locator('#city-identify-answer').fill('Part')
    await waitForDailySession(page, 'cities')
    await page.reload()
    await expect(page.locator('.question-toolbar h2')).toHaveText(cityQuestion)
    await expect(page.locator('#city-identify-answer')).toHaveValue('Part')
  } else {
    await page.getByText('Enter coordinates', { exact: true }).click()
    await page.getByLabel('Latitude').fill('12.34')
    await waitForDailySession(page, 'cities')
    await page.reload()
    await expect(page.locator('.question-toolbar h2')).toHaveText(cityQuestion)
    await page.getByText('Enter coordinates', { exact: true }).click()
    await expect(page.getByLabel('Latitude')).toHaveValue('12.34')
  }

  const reopenedContext = await browser.newContext({ storageState: await context.storageState({ indexedDB: true }) })
  try {
    const reopenedBrowserPage = await reopenedContext.newPage()
    await openGame(reopenedBrowserPage, 'cities', 'daily')
    await expect(reopenedBrowserPage.locator('.question-toolbar h2')).toHaveText(cityQuestion)
    const resumedFeedback = reopenedBrowserPage.locator('.answer-feedback')
    if (await resumedFeedback.count()) await expect(resumedFeedback).toBeVisible()
    else if (await reopenedBrowserPage.locator('#city-identify-answer').count()) {
      await expect(reopenedBrowserPage.locator('#city-identify-answer')).toHaveValue('Part')
    } else {
      await reopenedBrowserPage.getByText('Enter coordinates', { exact: true }).click()
      await expect(reopenedBrowserPage.getByLabel('Latitude')).toHaveValue('12.34')
    }
  } finally {
    await reopenedContext.close()
  }
})

test('the application shell keeps identical navigation geometry across routes and game states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  const routes = ['/', '/explore', '/statistics', '/settings', '/data', '/about', '/privacy',
    '/games/countries?mode=daily', '/games/countries?mode=practice',
    '/games/outlines?mode=daily', '/games/routes?mode=practice', '/games/flags?mode=daily',
    '/games/grid?mode=practice', '/games/cities?mode=daily']
  let desktopGeometry: Awaited<ReturnType<typeof shellGeometry>> | undefined
  for (const route of routes) {
    await page.goto(route)
    if (route.includes('mode=practice')) {
      await page.getByRole('button', { name: 'Start free play' }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
    }
    await expect(page.locator('.site-header')).toBeVisible()
    if (route.includes('/games/')) await expect(page.locator('.game-context-bar')).toBeVisible()
    else await expect(page.locator('main h1').first()).toBeVisible()
    const geometry = await shellGeometry(page)
    if (!desktopGeometry) desktopGeometry = geometry
    else expect(geometry, `${route} navbar geometry`).toEqual(desktopGeometry)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  let mobileGeometry: Awaited<ReturnType<typeof shellGeometry>> | undefined
  for (const route of ['/', '/explore', '/settings', '/games/countries?mode=practice', '/games/flags?mode=daily', '/games/grid?mode=practice']) {
    await page.goto(route)
    if (route.includes('mode=practice')) {
      await page.getByRole('button', { name: 'Start free play' }).click()
      await expect(page.getByRole('dialog')).toBeHidden()
    }
    const geometry = await shellGeometry(page)
    if (!mobileGeometry) mobileGeometry = geometry
    else expect(geometry, `${route} mobile navbar geometry`).toEqual(mobileGeometry)
    const menu = page.locator('.mobile-menu-toggle')
    await expect(menu).toBeVisible()
    await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeFocused()
  }
})

test('navbar theme, streak and settings controls work across the product shell', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(navigation.getByRole('link', { name: 'Daily' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Explore' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Statistics' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Settings' })).toHaveCount(0)
  const theme = page.getByRole('button', { name: 'Switch to dark appearance' })
  await expect(theme).toBeVisible()
  await theme.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Switch to light appearance' })).toBeVisible()
  await page.getByRole('link', { name: /Current streak .* view activity in Statistics/ }).click()
  await expect(page).toHaveURL(/\/statistics#activity$/)
  await expect(page.locator('#activity .activity-heatmap')).toBeVisible()
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('country identification uses the map data, accepts an answer and saves a full Free play result', async ({ page }) => {
  await openGame(page, 'countries')
  for (let index = 0; index < 10; index += 1) {
    const answer = await page.locator('.question-toolbar h2 em').innerText()
    await answerOnMapByKeyboard(page, answer)
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    if (index < 9) {
      await waitForRoundProgress(page, 'countries', index + 2)
      await expect(page.locator('.question-toolbar h2')).toBeFocused()
    }
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-score')).toContainText('1,000')
  await page.locator('main').getByRole('link', { name: 'Statistics', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible()
  await expect(page.locator('.stat-cell').filter({ hasText: 'Games completed' })).toContainText('1')
  await expect(page.locator('.activity-total')).toContainText('1 completed in the past year')
  await expect(page.locator('.activity-day-detail')).toContainText('1 puzzle completed')
  await expect(page.locator('.history-row')).toContainText('Free play')
  await page.reload()
  await expect(page.locator('.stat-cell').filter({ hasText: 'Games completed' })).toContainText('1')
})

test('country identification advances automatically and returns focus to the prompt on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await openGame(page, 'countries')
  const answer = await page.locator('.question-toolbar h2 em').innerText()
  await answerOnMapByKeyboard(page, answer)
  await waitForRoundProgress(page, 'countries', 2)
  const prompt = page.locator('.question-toolbar h2')
  await expect(prompt).toBeFocused()
  await expect.poll(() => prompt.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth
  })).toBe(true)
})

test('country catalogue games avoid map boundaries while map games load them', async ({ page }) => {
  const geometryRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/data/countries.topo.json') geometryRequests.push(request.url())
  })

  for (const gameId of ['flags', 'grid', 'connections', 'higher-lower', 'distance']) {
    await openGame(page, gameId)
    expect(geometryRequests, `${gameId} does not need country geometry`).toHaveLength(0)
  }

  await openGame(page, 'countries')
  expect(geometryRequests, 'Find the country loads its map geometry').toHaveLength(1)
})

test('city comparison games load the compact pool while Capitals & Cities keeps the full gazetteer', async ({ page }) => {
  const cityRequests: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname === '/data/cities.json' || pathname === '/data/cities-major.json') cityRequests.push(pathname)
  })

  await openGame(page, 'distance')
  await expect(page.locator('.distance-city-choice')).toHaveCount(2)
  expect(cityRequests).toEqual(['/data/cities-major.json'])

  await openGame(page, 'latitude-ladder')
  await expect(page.locator('.latitude-order-list > li')).toHaveCount(5)
  expect(cityRequests).toEqual(['/data/cities-major.json', '/data/cities-major.json'])

  await openGame(page, 'cities')
  await expect(page.locator('.question-toolbar')).toBeVisible()
  expect(cityRequests.at(-1)).toBe('/data/cities.json')
})

test('map controls and favorites remain touch-sized on mobile', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto('/')
  const favorite = page.locator('.favorite-button').first()
  const favoriteBox = await favorite.boundingBox()
  expect(favoriteBox?.width).toBeGreaterThanOrEqual(40)
  expect(favoriteBox?.height).toBeGreaterThanOrEqual(40)

  await openGame(page, 'countries')
  const zoom = page.getByRole('button', { name: 'Zoom in' })
  const zoomBox = await zoom.boundingBox()
  expect(zoomBox?.width).toBeGreaterThanOrEqual(40)
  expect(zoomBox?.height).toBeGreaterThanOrEqual(40)
  const mapLayer = page.locator('.geo-map > g').first()
  const before = await mapLayer.getAttribute('transform')
  await zoom.tap()
  await expect(mapLayer).not.toHaveAttribute('transform', before ?? '')
  const gameMenu = page.locator('.mobile-menu-toggle')
  await gameMenu.tap()
  await expect(gameMenu).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(gameMenu).toHaveAttribute('aria-expanded', 'false')
  await expect(gameMenu).toBeFocused()
  await context.close()
})

test('country outlines reveal the answer after six valid guesses and save the result', async ({ page }) => {
  const seed = 'product-outline-valid-six'
  await page.goto('/settings')
  const date = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '00'
    return `${part('year')}-${part('month')}-${part('day')}`
  })
  await page.evaluate(({ dateValue, seedValue }) => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<Record<string, unknown>>
    const kept = sessions.filter((item) => !(item.gameId === 'outlines' && item.mode === 'freeplay'))
    kept.push({
      id: `outlines:${dateValue}:browser:${seedValue}`,
      gameId: 'outlines',
      mode: 'freeplay',
      puzzleId: `outlines:practice:${seedValue}`,
      seed: seedValue,
      date: dateValue,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      payload: {},
    })
    localStorage.setItem('maproom-sessions-v1', JSON.stringify(kept))
  }, { dateValue: date, seedValue: seed })

  await page.goto('/games/outlines?mode=freeplay')
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible()
  const setup = page.getByRole('dialog')
  await setup.getByRole('button', { name: /Medium/ }).click()
  await setup.getByRole('combobox', { name: 'Geographic scope' }).selectOption('World')
  const advanced = setup.locator('.game-setup-advanced')
  if (!await advanced.evaluate((element) => (element as HTMLDetailsElement).open)) await advanced.locator('summary').click()
  await setup.getByRole('group', { name: 'Outline pool' }).getByRole('button', { name: 'Standard · eligible countries' }).click()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.game-body')).toBeVisible()

  const countriesResponse = await page.request.get(new URL('/data/countries.json', page.url()).toString())
  expect(countriesResponse.ok()).toBe(true)
  const countries = (await countriesResponse.json()).countries as Country[]
  const features = await loadTopologyFeatures(page, '/data/countries-outline.topo.json')
  const featuresByCode = new Map<string, GeoFeature[]>()
  for (const feature of features) {
    const code = feature.properties.iso3
    if (!code) continue
    const list = featuresByCode.get(code) ?? []
    list.push(feature)
    featuresByCode.set(code, list)
  }
  const groups = buildOutlineCandidateGroups(countries, featuresByCode, { pool: 'standard', difficulty: 'medium', scope: 'World' })
  const question = outlineQuestionAt(groups, `${seed}:country:standard:World:medium`, EMPTY_OUTLINE_PROGRESS)
  expect(question).not.toBeNull()
  const guesses = groups.standard.filter((candidate) => candidate.code !== question?.code).slice(0, 6).map((candidate) => candidate.country.name)
  expect(guesses).toHaveLength(6)

  for (const guess of guesses) {
    if (await page.locator('.game-results-dialog').isVisible().catch(() => false)) break
    const input = page.locator('#outline-answer')
    await input.fill(guess)
    await expect(page.locator('.suggestion-option').filter({ has: page.getByText(guess, { exact: true }) }).first()).toBeVisible()
    await page.locator('.suggestion-option').filter({ has: page.getByText(guess, { exact: true }) }).first().click()
    await page.getByRole('button', { name: 'Guess' }).click()
    await expect(page.locator('.answer-feedback')).toBeVisible()
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog h2')).not.toBeEmpty()
})

test('country outlines load first-level regional silhouettes on demand', async ({ page }) => {
  await openGame(page, 'outlines')
  await setGameSetting(page, 'Geographic scope', 'Subdivisions')
  await expect(page.locator('.outline-map-stage')).toBeVisible({ timeout: 30_000 })

  await setGameSetting(page, 'Country', 'SWE')
  await expect(page.locator('.outline-map-stage')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('Name the subdivision shown')).toBeVisible()
  await expect(page.getByText(/Subdivision data:/)).toBeVisible()

  const answer = page.getByLabel('Name the subdivision shown')
  await answer.fill('a')
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: 'Guess' }).click()
  await expect(page.locator('.answer-feedback')).toBeVisible()
  await page.screenshot({ path: 'artifacts/qa/product-consistency/outlines-subdivision-desktop.png' })
})

test('border route accepts an actual shortest path and scores it', async ({ page }) => {
  await openGame(page, 'routes')
  await expect(page.locator('.route-map-endpoints')).toContainText('Start')
  await expect(page.locator('.route-map-endpoints')).toContainText('Destination')
  await expect(page.locator('.route-map-distance')).toContainText('Shortest')
  const routeMap = page.locator('.route-map-stage .geo-map')
  await expect(routeMap).toHaveAttribute('aria-label', /fixed start, destination and selected intermediate countries/)
  await expect(routeMap.locator('.map-country.is-map-start')).toHaveCount(1)
  await expect(routeMap.locator('.map-country.is-map-destination')).toHaveCount(1)
  await expect(routeMap.locator('path[role="button"]')).toHaveCount(0)
  await page.screenshot({ path: 'artifacts/qa/maps-gameplay-ux/border-route-endpoints.png', fullPage: true })
  const routeMapBounds = await routeMap.boundingBox()
  expect(routeMapBounds).not.toBeNull()
  const endpointCenters = await routeMap.locator('.map-country.is-map-start, .map-country.is-map-destination').evaluateAll((countries) => countries.map((country) => {
    const bounds = country.getBoundingClientRect()
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  }))
  expect(endpointCenters).toHaveLength(2)
  const endpointDistance = Math.hypot(endpointCenters[0]!.x - endpointCenters[1]!.x, endpointCenters[0]!.y - endpointCenters[1]!.y)
  expect(endpointDistance / Math.hypot(routeMapBounds!.width, routeMapBounds!.height)).toBeGreaterThan(0.12)
  const mapLayer = routeMap.locator(':scope > g')
  const initialTransform = await mapLayer.getAttribute('transform')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(mapLayer).not.toHaveAttribute('transform', initialTransform ?? '')
  await page.getByRole('button', { name: 'Reset map view' }).click()
  await expect(mapLayer).toHaveAttribute('transform', initialTransform ?? '')
  const routeMapBox = await routeMap.boundingBox()
  expect(routeMapBox).not.toBeNull()
  await page.mouse.move(routeMapBox!.x + routeMapBox!.width / 2, routeMapBox!.y + routeMapBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(routeMapBox!.x + routeMapBox!.width / 2 + 54, routeMapBox!.y + routeMapBox!.height / 2 + 28, { steps: 3 })
  await page.mouse.up()
  await expect(mapLayer).not.toHaveAttribute('transform', initialTransform ?? '')
  await page.getByRole('button', { name: 'Reset map view' }).click()
  await expect(mapLayer).toHaveAttribute('transform', initialTransform ?? '')
  await expect(page.locator('.route-map-stage .map-caption')).toHaveCount(0)

  const graphCountries = eligibleCountries(await countryData(page) as unknown as Country[], 'standard').filter((country) => country.hasGeometry)
  const countriesByCode = new Map(graphCountries.map((country) => [country.iso3, country]))
  const countriesByName = new Map(graphCountries.map((country) => [country.name, country]))
  const startName = await page.locator('.route-map-endpoint-start strong').innerText()
  const endName = await page.locator('.route-map-endpoint-finish strong').innerText()
  const start = countriesByName.get(startName)
  const end = countriesByName.get(endName)
  expect(start).toBeDefined()
  expect(end).toBeDefined()
  const eligibleCodes = new Set(graphCountries.map((country) => country.iso3))
  const adjacency = new Map<string, string[]>()
  for (const country of graphCountries) {
    adjacency.set(country.iso3, country.borders.filter((code) => eligibleCodes.has(code)
      && Boolean(countriesByCode.get(code)?.borders.includes(country.iso3))).sort())
  }
  const shortest = shortestPath(start!.iso3, end!.iso3, adjacency)
  expect(shortest).not.toBeNull()
  const intermediate = shortest!.slice(1, -1)
  expect(intermediate.length).toBeGreaterThanOrEqual(2)
  const disconnected = graphCountries.find((country) => country.iso3 !== start!.iso3
    && country.iso3 !== end!.iso3
    && !intermediate.includes(country.iso3)
    && (adjacency.get(country.iso3)?.length ?? 0) === 0)
  expect(disconnected, 'the Standard country graph has an isolated place to check a disconnected selection').toBeDefined()
  await chooseSuggestion(page, '#route-country', disconnected!.name)
  await expect(page.locator('.route-selected-set button')).toHaveCount(1)
  await expect(page.locator('.route-set-status')).toContainText('does not connect')
  await page.getByRole('button', { name: `Remove ${disconnected!.name}` }).click()
  await expect(page.locator('.route-set-status')).toContainText('Add countries in any order')

  await page.getByRole('button', { name: 'Hint' }).click()
  await expect(page.locator('.route-hint')).toContainText('One shortest route includes')
  const hintedName = (await page.locator('.route-hint').innerText()).match(/includes (.+)\.$/)?.[1]
  expect(intermediate.map((code) => countriesByCode.get(code)?.name)).toContain(hintedName)

  const entryOrder = [...intermediate].reverse()
  for (const [index, code] of entryOrder.entries()) {
    const country = countriesByCode.get(code)!
    if (index === 0) {
      const input = page.locator('#route-country')
      await input.fill(country.name)
      await expect(page.getByRole('option', { name: new RegExp(`^${country.name}`) })).toBeVisible()
      await input.press('ArrowDown')
      await input.press('Enter')
      await input.press('Enter')
    } else await chooseSuggestion(page, '#route-country', country.name)
    if (index < entryOrder.length - 1) {
      await expect(page.locator('.route-set-status')).toContainText('does not connect')
      await expect(page.locator('.route-selected-set button')).toHaveCount(index + 1)
      if (index === 0) await page.screenshot({ path: 'artifacts/qa/maps-gameplay-ux/border-route-selected-set.png', fullPage: true })
    }
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog h2')).toContainText('shortest')
  await expect(page.locator('.game-results-message')).toContainText(`Shortest route: ${shortest!.length - 1} ${shortest!.length - 1 === 1 ? 'border' : 'borders'}.`)
  const displayedNames = await page.locator('.route-stops li > span').allTextContents()
  const displayedCodes = displayedNames.map((name) => countriesByName.get(name)?.iso3)
  expect(displayedCodes).toHaveLength(shortest!.length)
  expect(displayedCodes[0]).toBe(start!.iso3)
  expect(displayedCodes.at(-1)).toBe(end!.iso3)
  expect(displayedCodes.slice(1, -1).sort()).toEqual([...intermediate].sort())
  for (let index = 1; index < displayedCodes.length; index += 1) {
    expect(adjacency.get(displayedCodes[index - 1]!)?.includes(displayedCodes[index]!)).toBe(true)
  }
  await expect(page.locator('.game-results-score')).toContainText('900')
})

test('flag identification answers each locally bundled flag and completes Free play', async ({ page }) => {
  await openGame(page, 'flags')
  const navigationBeforeRound = await shellGeometry(page)
  for (let index = 0; index < 10; index += 1) {
    const label = await page.locator('.flag-display [role="img"]').getAttribute('aria-label')
    expect(label).toBe('National flag to identify')
    const answer = await displayedFlagCountry(page)
    expect(answer.length).toBeGreaterThan(0)
    const buttons = page.locator('.flag-choice')
    let matched = false
    let selectedChoiceIndex = -1
    for (let choiceIndex = 0; choiceIndex < await buttons.count(); choiceIndex += 1) {
      const button = buttons.nth(choiceIndex)
      if ((await button.locator('.flag-choice-name').innerText()) === answer) {
        if (index === 0) await button.press('Enter')
        else await button.click()
        selectedChoiceIndex = choiceIndex
        matched = true
        break
      }
    }
    expect(matched).toBe(true)
    await expect(page.locator('.flag-choice.is-right')).toBeVisible()
    if (index === 0) {
      const answeredButton = buttons.nth(selectedChoiceIndex)
      await expect(answeredButton).toHaveAttribute('aria-disabled', 'true')
      await expect(answeredButton).toBeFocused()
    }
    if (index < 9) {
      await waitForRoundProgress(page, 'flags', index + 2)
      if (index === 0) {
        const answeredButton = buttons.nth(selectedChoiceIndex)
        await expect(answeredButton).toHaveAttribute('aria-disabled', 'false')
        await expect(answeredButton).toBeFocused()
      }
    }
  }
  const results = page.getByRole('dialog', { name: 'Free play round complete.' })
  await expect(results).toBeVisible()
  await expect(page.locator('.game-results-score')).toContainText('1,000')
  await expect(page.locator('.game-results-summary')).toHaveText('10 / 10 correct · 100% accuracy')
  const dialogBox = await results.boundingBox()
  expect(dialogBox?.y).toBeGreaterThanOrEqual(0)
  expect((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(960)
  expect(await shellGeometry(page)).toEqual(navigationBeforeRound)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-results-desktop.png' })

  await expect(page.getByRole('button', { name: 'Play again' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(results.getByRole('link', { name: 'Statistics' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(results.getByRole('link', { name: 'All games' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Return to the puzzle' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close results' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(results).toBeHidden()
  await expect(page.getByRole('button', { name: 'View results' })).toBeFocused()
  await page.getByRole('button', { name: 'View results' }).click()
  await expect(results).toBeVisible()
  await page.getByRole('button', { name: 'Play again' }).click()
  await waitForRoundProgress(page, 'flags', 1)
  await expect(page.locator('.game-results-dialog')).toBeHidden()
})

test('infinite flag Free play cycles fairly, stays open and saves the chosen session total', async ({ page }) => {
  await openGame(page, 'flags')
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.getByLabel('Questions').selectOption('infinite')
  await page.keyboard.press('Escape')
  await expect(page.locator('.flag-round-utility [role="status"]')).toHaveText('Flag 1')

  const seen = new Set<string>()
  for (let index = 0; index < 12; index += 1) {
    const country = await displayedFlagCountry(page)
    expect(country).not.toBe('')
    expect(seen.has(country), `${country} repeated before the eligible pool was exhausted`).toBe(false)
    seen.add(country)
    const choices = page.locator('.flag-choice')
    let correctChoice = -1
    for (let choiceIndex = 0; choiceIndex < await choices.count(); choiceIndex += 1) {
      if ((await choices.nth(choiceIndex).locator('.flag-choice-name').innerText()) === country) correctChoice = choiceIndex
    }
    expect(correctChoice).toBeGreaterThanOrEqual(0)
    await choices.nth(correctChoice).click()
    await expect(page.locator('.flag-choice.is-right')).toBeVisible()
    await expect(page.locator('.flag-round-utility [role="status"]')).toHaveText(`Flag ${index + 2}`, { timeout: 5_000 })
  }

  await expect(page.locator('.game-results-dialog')).toHaveCount(0)
  await expect(page.locator('.flag-live-status')).toContainText('1,200 pts')
  await expect(page.locator('.flag-live-status')).toContainText('12 correct')
  await expect(page.locator('.flag-live-status')).toContainText('100% accuracy')
  await page.getByRole('button', { name: 'End session' }).click()
  const results = page.getByRole('dialog', { name: 'Free play session complete.' })
  await expect(results).toBeVisible()
  await expect(page.locator('.game-results-score')).toContainText('1,200')
  await expect(page.locator('.game-results-summary')).toHaveText('12 / 12 correct · 100% accuracy')
  await results.getByRole('link', { name: 'Statistics' }).click()
  await expect(page.locator('.history-result').first()).toContainText('12 / 12 correct')
})

test('daily play has no mode switch and keeps its seeded puzzle when returning', async ({ page }) => {
  await openGame(page, 'flags', 'daily')
  await expect(page.locator('.site-header')).toBeVisible()
  const topBarBox = await page.locator('.site-header').boundingBox()
  expect(topBarBox?.y).toBeLessThanOrEqual(1)
  expect(topBarBox?.height).toBeLessThanOrEqual(62)
  await expect(page.locator('.game-context-bar .game-context-back')).toBeVisible()
  await expect(page.locator('.game-context-daily')).toHaveText('Today’s puzzle')
  await expect(page.locator('.mode-switch')).toHaveCount(0)
  await expect(page.locator('.flag-settings-button')).toHaveCount(0)
  await expect(page.locator('.game-page-heading')).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to Explore' }).click()
  await expect(page).toHaveURL(/\/explore$/)
  await expect(page.getByRole('link', { name: /Flag Match: Find the flag, Free play/ })).toBeVisible()
  await page.goto('/games/flags?mode=daily')
  await expect(page).toHaveURL(/\/games\/flags\?mode=daily$/)
  const initialFlag = await page.locator('.flag-display [role="img"]').getAttribute('aria-label')
  expect(initialFlag).toBe('National flag to identify')
  await page.reload()
  await expect(page.locator('.flag-display [role="img"]')).toHaveAttribute('aria-label', initialFlag ?? '')
  const answer = await displayedFlagCountry(page)
  const choices = page.locator('.flag-choice')
  let correctIndex = -1
  for (let index = 0; index < await choices.count(); index += 1) {
    if ((await choices.nth(index).locator('.flag-choice-name').innerText()) === answer) correctIndex = index
  }
  expect(correctIndex).toBeGreaterThanOrEqual(0)
  await choices.nth(correctIndex).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.flag-choice.is-right')).toBeVisible()
  await expect(page.locator('.flag-choice.is-right')).toHaveCSS('background-color', 'rgb(229, 239, 229)')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-correct-desktop.png' })
  await waitForRoundProgress(page, 'flags', 2)
  await expect(page.getByRole('button', { name: 'Next flag' })).toHaveCount(0)
})

test('changing Free play settings cancels a pending automatic advance', async ({ page }) => {
  await openGame(page, 'flags')
  const answer = await displayedFlagCountry(page)
  const choices = page.locator('.flag-choice')
  let correctIndex = -1
  for (let index = 0; index < await choices.count(); index += 1) {
    if ((await choices.nth(index).locator('.flag-choice-name').innerText()) === answer) correctIndex = index
  }
  expect(correctIndex).toBeGreaterThanOrEqual(0)
  await choices.nth(correctIndex).click()
  await expect(page.locator('.flag-choice.is-right')).toBeVisible()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.getByLabel('Region').selectOption({ label: 'Europe' })
  await waitForRoundProgress(page, 'flags', 1)
  const refreshedFlag = await displayedFlagCountry(page)
  const countries = await countryData(page)
  expect(countries.find((country) => country.name === refreshedFlag)?.continent).toBe('Europe')
  await page.waitForTimeout(850)
  await waitForRoundProgress(page, 'flags', 1)
})

test('Explore exposes distinct flag formats and game options stay in Free play setup', async ({ page }) => {
  await page.goto('/explore')
  const identify = page.getByRole('link', { name: 'Flag Match: Identify the country, Free play' })
  const findFlag = page.getByRole('link', { name: 'Flag Match: Find the flag, Free play' })
  await expect(identify).toBeVisible()
  await expect(findFlag).toBeVisible()
  await findFlag.click()
  await expect(page).toHaveURL(/mode=freeplay&format=country-to-flag/)
  const setup = page.getByRole('group', { name: 'Free play setup' })
  await expect(setup).toBeVisible()
  await expect(setup.getByRole('button', { name: /Identify the country/ })).toHaveAttribute('aria-pressed', 'false')
  await expect(setup.getByRole('button', { name: /Find the flag/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(setup.getByLabel('Direction')).toHaveCount(0)
  await setup.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.image-choice-grid .flag-choice')).toHaveCount(4)
  const countryPrompt = await page.locator('.flag-question-row h1').innerText()
  const answerCountry = countryPrompt.replace(/^Which flag belongs to /, '').replace(/\?$/, '')
  const correctFlag = await flagChoiceForCountry(page, answerCountry)
  await correctFlag.click()
  await expect(page.locator('.flag-choice.is-right')).toBeVisible()
})

test('flag free play settings cover regions, answer style and progressive reveal', async ({ page }) => {
  await openGame(page, 'flags')
  await expect(page.locator('.game-playfield')).toBeFocused()
  const settingsButton = page.getByRole('button', { name: 'Game settings' })
  await expect(settingsButton).toHaveAttribute('aria-expanded', 'false')
  await settingsButton.focus()
  await expect(settingsButton).toBeFocused()
  await page.keyboard.press('Enter')
  const settings = page.getByRole('group', { name: 'Game settings' })
  await expect(settings).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(settingsButton).toBeFocused()

  await settingsButton.click()
  await setGameSetting(page, 'Questions', '20')
  await waitForRoundProgress(page, 'flags', 1)
  await setGameSetting(page, 'Questions', '10')
  await waitForRoundProgress(page, 'flags', 1)
  await setGameSetting(page, 'Region', { label: 'Europe' })
  await expect(page.getByLabel('Region')).toHaveValue('Europe')
  await setGameSetting(page, 'Answer style', 'typed')
  await page.getByLabel('Reveal after wrong guesses').check()
  await expect(page.getByLabel('Answer style')).toHaveValue('typed')
  await expect(page.getByLabel('Reveal after wrong guesses')).toBeChecked()
  await page.keyboard.press('Escape')

  const typedAnswer = await displayedFlagCountry(page, 'Europe')
  const countries = await countryData(page)
  const wrongCountry = flagCountryPool(countries as unknown as Country[], 'Europe', 'standard').find((country) => country.name !== typedAnswer)?.name
  expect(wrongCountry).toBeTruthy()
  const input = page.locator('#flag-answer')
  await input.fill(wrongCountry!)
  const wrongSuggestion = page.getByRole('option', { name: wrongCountry!, exact: true })
  await expect(wrongSuggestion).toBeVisible()
  await wrongSuggestion.click()
  await expect(page.locator('.flag-display')).toHaveClass(/has-reveal/)
  await expect(page.locator('.flag-round [role="status"]')).toContainText('try once more')
  await expect(input).toBeEnabled()
  await page.waitForTimeout(1_000)
  await waitForRoundProgress(page, 'flags', 1)
  await input.fill(typedAnswer)
  await input.press('Enter')
  await page.getByRole('button', { name: 'Answer' }).press('Enter')
  await expect(page.locator('.flag-typed-feedback.is-right')).toBeVisible()
  await expect(input).toHaveAttribute('aria-disabled', 'true')
  await expect(input).toHaveAttribute('readonly', '')
  await expect(input).toBeFocused()
  await waitForRoundProgress(page, 'flags', 2)
  await expect(input).not.toHaveAttribute('aria-disabled', 'true')
  await expect(input).not.toHaveAttribute('readonly', '')
  await expect(input).toBeFocused()
})

test('flag compositions stay centered and bounded at desktop, laptop and mobile sizes', async ({ page }) => {
  const viewports = [
    { name: 'desktop', width: 1440, height: 960 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await openGame(page, 'flags')
    await expectCenteredFlagLayout(page, 'flag-to-country')
    await page.screenshot({ path: `artifacts/qa/product-consistency/flags-${viewport.name}-flag-to-country.png`, fullPage: true })

    await openGame(page, 'flags', 'freeplay', 'country-to-flag')
    await expect(page.locator('.image-choice-grid .flag-choice')).toHaveCount(4)
    await expectCenteredFlagLayout(page, 'country-to-flag')
    if (viewport.name === 'mobile') {
      const textRects = await page.locator('.flag-question-row h1').evaluate((element) => {
        const range = document.createRange()
        range.selectNodeContents(element)
        return [...range.getClientRects()].map(({ x, y, right, bottom }) => ({ x, y, right, bottom }))
      })
      const utility = await page.locator('.flag-round-utility').boundingBox()
      const progress = await page.locator('.round-progress').boundingBox()
      const settings = await page.locator('.game-settings-button').boundingBox()
      expect(utility).not.toBeNull()
      expect(textRects.some((rect) => rect.x < utility!.x + utility!.width && rect.right > utility!.x && rect.y < utility!.y + utility!.height && rect.bottom > utility!.y)).toBe(false)
      expect(settings!.x).toBeGreaterThanOrEqual(progress!.x + progress!.width + 4)
    }
    await page.screenshot({ path: `artifacts/qa/product-consistency/flags-${viewport.name}-country-to-flag.png`, fullPage: true })
  }
})

test('flag Free play settings stay within the mobile viewport and remain tappable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  try {
    const page = await context.newPage()
    await openGame(page, 'flags', 'freeplay', 'country-to-flag')
    const topBarBox = await page.locator('.site-header').boundingBox()
    expect(topBarBox?.y).toBeLessThanOrEqual(1)
    expect(topBarBox?.height).toBeLessThanOrEqual(62)
    await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-freeplay-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Game settings' }).tap()
    const settings = page.getByRole('group', { name: 'Game settings' })
    await expect(settings).toBeVisible()
    const panel = await settings.boundingBox()
    expect(panel?.x).toBeGreaterThanOrEqual(0)
    expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThanOrEqual(390)
    await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-settings-mobile.png', fullPage: true })
    await setGameSetting(page, 'Region', { label: 'Asia' })
    await setGameSetting(page, 'Questions', 'infinite')
    await page.keyboard.press('Escape')
    await expect(settings).toHaveCount(0)
    await expect(page.locator('.image-choice-grid .flag-choice')).toHaveCount(4)
    const answerFlagWidths = await page.locator('.image-choice-grid .flag-frame').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width))
    expect(Math.min(...answerFlagWidths)).toBeGreaterThan(60)
    await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-country-to-flag-mobile.png', fullPage: true })
    const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
    expect(widths.document).toBeLessThanOrEqual(widths.viewport)
    expect(widths.body).toBeLessThanOrEqual(widths.viewport)

    const prompt = await page.locator('.flag-question-row h1').innerText()
    const answer = prompt.replace(/^Which flag belongs to /, '').replace(/\?$/, '')
    await (await flagChoiceForCountry(page, answer)).tap()
    await expect(page.locator('.flag-choice.is-right')).toBeVisible()
    await expect(page.locator('.flag-round-utility [role="status"]')).toHaveText('Flag 2', { timeout: 5_000 })
    await page.getByRole('button', { name: 'End session' }).tap()
    const results = page.getByRole('dialog', { name: 'Free play session complete.' })
    await expect(results).toBeVisible()
    const resultsBox = await results.boundingBox()
    expect(resultsBox?.x).toBeGreaterThanOrEqual(0)
    expect(resultsBox?.y).toBeGreaterThanOrEqual(0)
    expect((resultsBox?.x ?? 0) + (resultsBox?.width ?? 0)).toBeLessThanOrEqual(390)
    expect((resultsBox?.y ?? 0) + (resultsBox?.height ?? 0)).toBeLessThanOrEqual(844)
    await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-infinite-results-mobile.png', fullPage: true })
  } finally {
    await context.close()
  }
})

test('geography grid accepts nine distinct countries from real category intersections', async ({ page }) => {
  await openGame(page, 'grid')
  const progressStatus = page.locator('.question-count')
  const progressAnnouncement = progressStatus.locator('.sr-only')
  await expect(progressStatus).toBeVisible()
  await expect(progressStatus).toHaveAttribute('role', 'status')
  await expect(progressStatus).toHaveAttribute('aria-live', 'polite')
  await expect(progressAnnouncement).toHaveText('0 of 9 squares filled')
  const board = page.getByRole('table', { name: 'Geography category intersection table' })
  await expect(board.getByRole('row')).toHaveCount(4)
  await expect(board.getByRole('columnheader')).toHaveCount(4)
  await expect(board.getByRole('rowheader')).toHaveCount(3)
  await expect(board.getByRole('cell')).toHaveCount(9)
  const countries = eligibleCountries(await countryData(page) as unknown as Country[], 'standard')
  const rows = await page.locator('.grid-row-label').allTextContents()
  const columns = await page.locator('.grid-column-label').allTextContents()
  expect(rows).toHaveLength(3)
  expect(columns).toHaveLength(3)
  const preset = validGridPresets(countries, { expanded: true }).find((candidate) =>
    candidate.rows.every((category, index) => category.label === rows[index])
    && candidate.columns.every((category, index) => category.label === columns[index]),
  )
  expect(preset, 'displayed clues belong to the expanded Free Play preset pool').toBeDefined()
  const firstCandidates = new Set(gridCandidates(countries, preset!.rows[0]!, preset!.columns[0]!)
    .filter((country) => country.hasGeometry).map((country) => country.iso3))
  const invalidCountry = countries.find((country) => country.hasGeometry && !firstCandidates.has(country.iso3))
  expect(invalidCountry, 'first Grid crossing has an eligible invalid answer').toBeDefined()
  const firstCellTrigger = page.locator('.grid-cell[data-cell-key="0:0"] .grid-cell-trigger')
  await firstCellTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /Answer for/ })).toBeVisible()
  await chooseSuggestion(page, '#grid-answer-input', invalidCountry!.name)
  await expect(page.getByRole('alert')).toHaveCount(1)
  await expect(page.getByRole('alert')).toHaveText(`${invalidCountry!.name} doesn’t meet both clues.`)
  const criteriaFeedback = page.locator('.grid-criteria-feedback')
  await expect(criteriaFeedback).toBeVisible()
  await expect(criteriaFeedback.locator(':scope > span')).toHaveCount(2)
  await expect(criteriaFeedback).toContainText('Does not fit')
  await expect(progressAnnouncement).toHaveText('0 of 9 squares filled')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /Answer for/ })).toBeHidden()
  await expect(firstCellTrigger).toBeFocused()

  const cells = rows.flatMap((_, rowIndex) => columns.map((__, columnIndex) => ({
    key: `${rowIndex}:${columnIndex}`,
    candidates: gridCandidates(countries, preset!.rows[rowIndex]!, preset!.columns[columnIndex]!)
      .filter((country) => country.hasGeometry).sort((left, right) => left.name.localeCompare(right.name)),
  }))).sort((left, right) => left.candidates.length - right.candidates.length)
  const assigned = new Map<string, typeof countries[number]>()

  function place(cell: typeof cells[number], seen: Set<string>): boolean {
    for (const candidate of cell.candidates) {
      if (seen.has(candidate.iso3)) continue
      seen.add(candidate.iso3)
      const occupied = [...assigned].find(([, current]) => current.iso3 === candidate.iso3)?.[0]
      if (!occupied || place(cells.find((item) => item.key === occupied)!, seen)) {
        assigned.set(cell.key, candidate)
        return true
      }
    }
    return false
  }

  for (const cell of cells) expect(place(cell, new Set())).toBe(true)
  let filled = 0
  for (const [key, country] of assigned) {
    const activeDialog = page.getByRole('dialog', { name: /Answer for/ })
    if (await activeDialog.isVisible()) {
      await page.keyboard.press('Escape')
      await expect(activeDialog).toBeHidden()
    }
    await page.locator(`.grid-cell[data-cell-key="${key}"] .grid-cell-trigger`).click()
    await chooseSuggestion(page, '#grid-answer-input', country.name)
    filled += 1
    await expect(page.locator('.grid-answer strong')).toHaveCount(filled)
    await expect(progressAnnouncement).toHaveText(`${filled} of 9 squares filled`)
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog')).toContainText('All nine squares filled')
})

test('captures the redesigned desktop game stages and key mobile screens', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await expect(page.locator('.daily-grid .game-card')).toHaveCount(6)
  await expect(page.locator('.other-games-carousel .game-card')).toHaveCount(freePlayCardCount)
  await page.goto('/explore')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(exploreExperienceCount)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/explore-desktop.png', fullPage: true })

  for (const [route, name] of [['/statistics', 'statistics'], ['/settings', 'settings'], ['/data', 'data'], ['/about', 'about'], ['/privacy', 'privacy']] as const) {
    await page.goto(route)
    await expect(page.locator('main h1').first()).toBeVisible()
    await page.screenshot({ path: `artifacts/qa/product-consistency/${name}-desktop.png`, fullPage: true })
  }

  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'connections', 'higher-lower', 'neighbours', 'distance']) {
    await openGame(page, id, ['connections', 'higher-lower', 'neighbours', 'distance'].includes(id) ? 'freeplay' : 'daily')
    await page.screenshot({ path: `artifacts/qa/product-consistency/game-${id}-desktop.png` })
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'connections', 'higher-lower', 'neighbours', 'distance']) {
    await openGame(page, id, ['connections', 'higher-lower', 'neighbours', 'distance'].includes(id) ? 'freeplay' : 'daily')
    await page.screenshot({ path: `artifacts/qa/product-consistency/game-${id}-laptop.png` })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${id} laptop width overflow`).toBeLessThanOrEqual(0)
  }

  await page.setViewportSize({ width: 1024, height: 768 })
  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'connections', 'higher-lower', 'neighbours', 'distance']) {
    await openGame(page, id, ['connections', 'higher-lower', 'neighbours', 'distance'].includes(id) ? 'freeplay' : 'daily')
    await page.screenshot({ path: `artifacts/qa/product-consistency/game-${id}-tablet.png` })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${id} tablet width overflow`).toBeLessThanOrEqual(0)
  }
  for (const route of ['/', '/explore', '/statistics', '/settings', '/data', '/about', '/privacy']) {
    await page.goto(route)
    await expect(page.locator('main h1').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${route} tablet width overflow`).toBeLessThanOrEqual(0)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'connections', 'higher-lower', 'neighbours', 'distance']) {
    await openGame(page, id, ['connections', 'higher-lower', 'neighbours', 'distance'].includes(id) ? 'freeplay' : 'daily')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${id} mobile width overflow`).toBeLessThanOrEqual(0)
    if (id === 'countries') {
      const mapBox = await page.locator('.game-map-stage').boundingBox()
      expect(mapBox?.width).toBeGreaterThan(340)
    }
    if (id === 'outlines') {
      const mapBox = await page.locator('.outline-map-stage').boundingBox()
      expect(mapBox?.width).toBeGreaterThan(340)
    }
    if (id === 'routes') {
      const mapBox = await page.locator('.route-map-stage').boundingBox()
      expect(mapBox?.width).toBeGreaterThan(340)
      const frameBox = await page.locator('.route-map-frame').boundingBox()
      const dockBox = await page.locator('.route-map-input-dock').boundingBox()
      const inputBox = await page.locator('.route-map-input-dock .route-input-row').boundingBox()
      expect(frameBox && dockBox && inputBox).not.toBeNull()
      expect(Math.abs((dockBox!.x + dockBox!.width / 2) - (frameBox!.x + frameBox!.width / 2))).toBeLessThanOrEqual(1)
      expect(dockBox!.y + dockBox!.height).toBeLessThanOrEqual(frameBox!.y + frameBox!.height)
      expect(inputBox!.x).toBeGreaterThanOrEqual(dockBox!.x)
      expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(dockBox!.x + dockBox!.width)
    }
    if (id === 'cities') {
      const mapBox = await page.locator('.city-map-stage').boundingBox()
      expect(mapBox?.width).toBeGreaterThan(340)
    }
    if (id === 'grid') {
      await expect(page.locator('.geo-grid .grid-cell')).toHaveCount(9)
      const gridLayout = await page.locator('.geo-grid').evaluate((element) => {
        const cells = [...element.querySelectorAll<HTMLElement>('.grid-cell')]
        const rows = new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect().top)))
        const columns = new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect().left)))
        return { display: getComputedStyle(element).display, boardHeight: element.getBoundingClientRect().height, rows: rows.size, columns: columns.size }
      })
      expect(gridLayout.display).toBe('grid')
      expect(gridLayout.rows).toBe(3)
      expect(gridLayout.columns).toBe(3)
      expect(gridLayout.boardHeight).toBeLessThan(360)
    }
    await page.screenshot({ path: `artifacts/qa/product-consistency/game-${id}-mobile.png`, fullPage: true })
  }

  for (const [route, name] of [['/', 'home'], ['/explore', 'explore'], ['/statistics', 'statistics'], ['/settings', 'settings'], ['/data', 'data'], ['/about', 'about'], ['/privacy', 'privacy']] as const) {
    await page.goto(route)
    await expect(page.locator('main h1').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${route} mobile width overflow`).toBeLessThanOrEqual(0)
    await page.screenshot({ path: `artifacts/qa/product-consistency/${name}-mobile.png`, fullPage: true })
  }
})

test('Geography Connections serves authored groups at every difficulty and replays', async ({ page }) => {
  await openGame(page, 'connections')
  await expect(page.locator('.connections-tile')).toHaveCount(16)
  let lastPuzzle: (typeof CONNECTIONS_PUZZLES)[number] | undefined
  for (const difficulty of ['medium', 'hard', 'easy'] as const) {
    await setGameSetting(page, 'Difficulty', difficulty)
    await expect(page.locator('.connections-tile')).toHaveCount(16)
    const label = await page.locator('.connection-kicker').innerText()
    const puzzleNumber = label.match(/Atlas set\s+(\d+)/i)?.[1]
    lastPuzzle = CONNECTIONS_PUZZLES.find((puzzle) => puzzle.id === `atlas-${puzzleNumber}`)
    expect(lastPuzzle, `authored puzzle for ${label}`).toBeDefined()
    expect(lastPuzzle!.difficulty).toBe(difficulty)
    const visibleCodes = new Set(await page.locator('.connections-tile').evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute('data-country-code'))))
    expect(visibleCodes).toEqual(new Set(lastPuzzle!.groups.flatMap((group) => group.countryCodes)))

    const firstGroup = lastPuzzle!.groups[0]!
    for (const code of firstGroup.countryCodes) await page.locator(`.connections-tile[data-country-code="${code}"]`).click()
    await page.getByRole('button', { name: 'Check group' }).click()
    await expect(page.locator('.connections-solved-group')).toHaveCount(1)
    await expect(page.locator('.connections-solved-group')).toContainText(firstGroup.label)
  }
  expect(lastPuzzle).toBeDefined()
  for (const group of lastPuzzle!.groups.slice(1)) {
    for (const code of group.countryCodes) await page.locator(`.connections-tile[data-country-code="${code}"]`).click()
    await page.getByRole('button', { name: 'Check group' }).click()
    await expect(page.locator('.connections-solved-group')).toHaveCount(lastPuzzle!.groups.indexOf(group) + 1)
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Play another set' }).click()
  await expect(page.locator('.connections-tile')).toHaveCount(16)
  await expect(page.locator('.game-results-dialog')).toBeHidden()
})

test('Higher or Lower supports fixed and infinite Free play with keyboard controls', async ({ page }) => {
  await openGame(page, 'higher-lower')
  await page.clock.pauseAt(new Date('2026-11-17T12:00:00Z'))
  const firstChoice = page.locator('.higher-lower-country').first()
  await firstChoice.focus()
  await page.keyboard.press('Enter')
  await expect(firstChoice).toHaveAttribute('aria-disabled', 'true')
  await expect(firstChoice).toBeFocused()
  await expect(page.locator('.higher-lower-response')).toBeVisible()
  await page.clock.runFor(1_800)
  await waitForRoundProgress(page, 'comparisons', 2)
  await expect(firstChoice).toHaveAttribute('aria-disabled', 'false')
  await expect(page.locator('.higher-lower-prompt')).toBeFocused()

  for (let index = 1; index < 10; index += 1) {
    await page.keyboard.press(index % 2 ? 'ArrowRight' : 'ArrowLeft')
    if (index < 9) await expect(page.locator('.higher-lower-response')).toBeVisible()
    await expect(page.locator('.higher-lower-country.is-revealed .higher-lower-value')).toHaveCount(2)
    await expect(page.locator('.answer-feedback')).toHaveCount(0)
    if (index < 9) {
      await page.clock.runFor(1_800)
      await waitForRoundProgress(page, 'comparisons', index + 2)
    }
  }
  await page.clock.runFor(1_800)
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toContainText('/ 10 correct')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/higher-lower-results-desktop.png' })

  await page.getByRole('button', { name: 'Compare more countries' }).click()
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.getByLabel('Questions').selectOption('infinite')
  await page.keyboard.press('Escape')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.higher-lower-response')).toBeVisible()
  await page.clock.runFor(1_800)
  await expect(page.locator('.question-toolbar .sr-only[role="status"]')).toHaveText('Comparison 2')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.higher-lower-response')).toBeVisible()
  await page.getByRole('button', { name: 'End session' }).click()
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toContainText('/ 2 correct')
})

test('Neighbour Challenge evaluates the complete neighbor set without answer leakage', async ({ page }) => {
  await openGame(page, 'neighbours')
  const countries = await countryData(page)
  const countryByCode = new Map(countries.map((country) => [country.iso3, country]))
  const targetName = await page.locator('.neighbour-target strong').innerText()
  const target = countries.find((country) => country.name === targetName)
  expect(target).toBeDefined()
  const standardCodes = new Set(countries.filter((country) => country.independent || country.iso3 === 'PSE').map((country) => country.iso3))
  const targetMapIndex = await mapFeatureIndex(page, target!.iso3, standardCodes)
  expect(targetMapIndex).toBeGreaterThanOrEqual(0)
  const targetBounds = await page.locator('.neighbour-map .geo-map path[role="button"]').nth(targetMapIndex).evaluate((path) => {
    const bounds = path.getBoundingClientRect()
    const map = path.closest('svg')!.getBoundingClientRect()
    return { widthRatio: bounds.width / map.width, heightRatio: bounds.height / map.height }
  })
  expect(Math.max(targetBounds.widthRatio, targetBounds.heightRatio)).toBeGreaterThan(0.35)
  const nonNeighbour = countries.find((country) => country.hasGeometry && standardCodes.has(country.iso3) && country.iso3 !== target!.iso3 && !target!.borders.includes(country.iso3) && !country.borders.includes(target!.iso3))
  expect(nonNeighbour).toBeDefined()
  const pathLabels = await page.locator('.neighbour-map .geo-map path[role="button"]').evaluateAll((paths) => paths.map((path) => path.getAttribute('aria-label') ?? ''))
  expect(pathLabels.every((label) => /^Unlabelled map region \d+/.test(label))).toBe(true)
  const firstNeighborCode = target!.borders.find((code) => standardCodes.has(code))
    ?? countries.find((country) => standardCodes.has(country.iso3) && country.borders.includes(target!.iso3))?.iso3
  expect(firstNeighborCode).toBeTruthy()
  const firstNeighbor = countryByCode.get(firstNeighborCode!)!
  const neighborMapIndex = await mapFeatureIndex(page, firstNeighborCode!, standardCodes)
  expect(neighborMapIndex).toBeGreaterThanOrEqual(0)
  const neighborMapPoint = await mapPathPoint(page, '.neighbour-map .geo-map path[role="button"]', neighborMapIndex)
  expect(neighborMapPoint).not.toBeNull()
  await page.mouse.move(neighborMapPoint!.x, neighborMapPoint!.y)
  await expect(page.locator('.neighbour-map .map-caption')).toHaveCount(0)
  const answerInput = page.getByLabel('Add a country')
  await answerInput.fill(nonNeighbour!.name)
  const incorrectOption = page.locator('.suggestion-option').filter({ has: page.getByText(nonNeighbour!.name, { exact: true }) }).first()
  await expect(incorrectOption).toBeVisible()
  await incorrectOption.click()
  await page.getByRole('button', { name: `Remove ${nonNeighbour!.name}` }).click()
  await chooseSuggestion(page, '#neighbour-answer', firstNeighbor.name)
  await expect(page.locator('.neighbour-selected button')).toHaveCount(1)
  await chooseSuggestion(page, '#neighbour-answer', firstNeighbor.name)
  await expect(page.locator('.neighbour-selection-feedback')).toContainText('already selected')
  await page.getByRole('button', { name: `Remove ${firstNeighbor.name}` }).click()

  await chooseSuggestion(page, '#neighbour-answer', target!.name)
  await expect(page.locator('.neighbour-selection-feedback')).toContainText('target, so it cannot be')

  for (let index = 0; index < 5; index += 1) {
    const currentName = await page.locator('.neighbour-target strong').innerText()
    const current = countries.find((country) => country.name === currentName)
    expect(current).toBeDefined()
    const expected = countries.filter((country) => standardCodes.has(country.iso3) && country.iso3 !== current!.iso3 && (current!.borders.includes(country.iso3) || country.borders.includes(current!.iso3)))
    const missed = index === 0 ? expected.pop() : undefined
    for (const neighbor of expected) {
      expect(neighbor, `neighbor ${neighbor.iso3} of ${current!.name}`).toBeDefined()
      await answerInput.fill(neighbor!.name)
      const option = page.locator('.suggestion-option').filter({ has: page.getByText(neighbor!.name, { exact: true }) }).first()
      await expect(option).toBeVisible()
      await option.click()
    }
    if (index === 0) await chooseSuggestion(page, '#neighbour-answer', nonNeighbour!.name)
    await page.getByRole('button', { name: 'Check neighbors' }).click()
    if (index === 0) {
      await expect(page.locator('.answer-feedback.is-incorrect')).toBeVisible()
      await expect(page.locator('.neighbour-reveal-list')).toContainText(`Missed: ${missed!.name}.`)
      await expect(page.locator('.neighbour-reveal-list')).toContainText(`Incorrect: ${nonNeighbour!.name}.`)
      await page.screenshot({ path: 'artifacts/qa/product-consistency/neighbour-set-difference.png', fullPage: true })
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(page.locator('.neighbour-reveal-list')).toBeVisible()
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(pageWidth).toBeLessThanOrEqual(390)
      await page.screenshot({ path: 'artifacts/qa/product-consistency/neighbour-set-difference-mobile.png', fullPage: true })
    } else await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    if (index < 4) {
      await waitForRoundProgress(page, 'countries', index + 2)
      await expect(page.getByRole('heading', { name: 'Complete the land borders' })).toBeFocused()
    }
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toHaveText('4 / 5 correct · 80% accuracy')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/neighbours-results-desktop.png' })
  await page.getByRole('button', { name: 'Find more neighbours' }).click()
  const replayTargetName = await page.locator('.neighbour-target strong').innerText()
  const replayTarget = countries.find((country) => country.name === replayTargetName)
  expect(replayTarget).toBeDefined()
  const replayNeighbor = countries.find((country) => standardCodes.has(country.iso3) && country.iso3 !== replayTarget!.iso3 && (replayTarget!.borders.includes(country.iso3) || country.borders.includes(replayTarget!.iso3)))
  expect(replayNeighbor).toBeDefined()
  await submitText(page, '#neighbour-answer', replayNeighbor!.name)
  await expect(page.locator('.neighbour-selected button')).toHaveCount(1)
})

test('Distance & Direction uses coordinate comparisons, keyboard controls and local results', async ({ page }) => {
  await openGame(page, 'distance')
  for (const [label, value] of [['Challenge', 'distance'], ['Challenge', 'latitude'], ['Challenge', 'longitude']] as const) {
    if (await page.getByRole('button', { name: 'Game settings' }).isVisible()) {
      await page.getByRole('button', { name: 'Game settings' }).click()
      await page.getByLabel(label).selectOption(value)
      await page.keyboard.press('Escape')
    }
    const candidates = page.locator('.distance-city-choice')
    const cityNames = await candidates.allTextContents()
    expect(cityNames).toHaveLength(2)
    expect(await page.locator('.distance-origin code, .distance-city-coordinates, .distance-city-result').count()).toBe(0)
    const hiddenText = await page.locator('.distance-origin, .distance-city-choice').allTextContents()
    expect(hiddenText.some((text) => /°|\bkm\b|latitude|longitude/i.test(text))).toBe(false)
    expect(await page.locator('.distance-city-choice').evaluateAll((items) => items.every((item) => (item.getAttribute('aria-label') ?? '').startsWith('Choose ')))).toBe(true)
    await page.keyboard.press('1')
    await expect(page.locator('.distance-city-coordinates')).toHaveCount(2)
    await expect(page.locator('.distance-reveal')).toBeVisible()
    await waitForRoundProgress(page, 'comparisons', 2)
    await expect(page.locator('.distance-prompt')).toBeFocused()
  }
  for (let index = 1; index < 10; index += 1) {
    await page.keyboard.press(index % 2 ? '2' : '1')
    await expect(page.locator('.answer-feedback')).not.toContainText('Use the coordinates and scale')
    if (index < 9) {
      await waitForRoundProgress(page, 'comparisons', index + 2)
      await expect(page.locator('.distance-prompt')).toBeFocused()
    }
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toContainText('/ 10 correct')
  await expect(page.locator('.game-results-message')).toContainText('Haversine')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/distance-results-desktop.png' })
  await page.locator('.game-results-dialog').getByRole('link', { name: 'Statistics' }).click()
  await expect(page.locator('.history-result').first()).toContainText('/ 10 correct')
})

test('timed Neighbor and Distance rounds keep the countdown outside polite live regions', async ({ page }) => {
  for (const [game, summary] of [['neighbours', '.neighbour-live'], ['distance', '.distance-live']] as const) {
    await openGame(page, game)
    await page.getByRole('button', { name: 'Game settings' }).click()
    await page.getByLabel('60-second round').click()
    await page.keyboard.press('Escape')

    const liveSummary = page.locator(summary)
    const timer = page.getByRole('timer')
    await expect(timer).toHaveCount(1)
    await expect(timer).toHaveAccessibleName(/^Time remaining: \d+ seconds$/)
    await expect(timer).toHaveText(/^\d+s left$/)
    await expect(liveSummary).not.toHaveAttribute('aria-live', 'polite')
    await expect(liveSummary.locator('[aria-live="polite"]')).toHaveCount(2)
    expect(await timer.evaluate((element) => element.closest('[aria-live]')?.getAttribute('aria-live') ?? null)).toBeNull()
  }
})

test('all four new games accept touch input in the mobile layout', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  try {
    await openGame(page, 'connections')
    await page.locator('.connections-tile').first().tap()
    await expect(page.locator('.connections-tile').first()).toHaveAttribute('aria-pressed', 'true')

    await openGame(page, 'higher-lower')
    await page.clock.pauseAt(new Date('2026-11-17T12:00:00Z'))
    await page.locator('.higher-lower-country').first().tap()
    await expect(page.locator('.higher-lower-response')).toBeVisible()
    await expect(page.locator('.answer-feedback')).toHaveCount(0)
    await page.clock.runFor(1_250)
    await page.clock.resume()

    await openGame(page, 'neighbours')
    const countries = await countryData(page)
    const standardCodes = new Set(countries.filter((country) => country.independent || country.iso3 === 'PSE').map((country) => country.iso3))
    const targetName = await page.locator('.neighbour-target strong').innerText()
    const target = countries.find((country) => country.name === targetName)
    expect(target).toBeDefined()
    const neighbor = countries.find((country) => standardCodes.has(country.iso3) && country.iso3 !== target!.iso3 && (target!.borders.includes(country.iso3) || country.borders.includes(target!.iso3)))
    expect(neighbor).toBeDefined()
    const neighborInput = page.locator('#neighbour-answer')
    await neighborInput.tap()
    await neighborInput.fill(neighbor!.name)
    const neighborSuggestion = page.locator('.suggestion-option').filter({ has: page.getByText(neighbor!.name, { exact: true }) }).first()
    await expect(neighborSuggestion).toBeVisible()
    await neighborSuggestion.tap()
    await expect(page.locator('.neighbour-selected button')).toHaveCount(1)

    await openGame(page, 'distance')
    await page.locator('.distance-city-choice').first().tap()
    await expect(page.locator('.distance-reveal')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  } finally {
    await context.close()
  }
})

test('capitals and cities include typed capitals, coordinate placement and city identification', async ({ page }) => {
  await openGame(page, 'cities')
  await setGameSetting(page, 'Questions', '10')
  const countries = await countryData(page)
  for (let index = 0; index < 10; index += 1) {
    const prompt = await page.locator('.question-toolbar h2').innerText()
    await expect(page.locator('.question-toolbar p')).toHaveCount(0)
    const name = prompt.replace(/^What is the capital of /, '').replace(/\?$/, '')
    const country = countries.find((item) => item.name === name)
    expect(country?.capital).toBeTruthy()
    await submitText(page, '#capital-answer', country!.capital!)
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    if (index < 9) {
      await waitForRoundProgress(page, 'questions', index + 2)
      await expect(page.locator('.question-toolbar h2')).toBeFocused()
    }
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()

  await openGame(page, 'cities', 'freeplay', 'locate-city')
  const cities = await cityData(page)
  let prompt = await page.locator('.question-toolbar h2').innerText()
  let cityStart = prompt.indexOf('Place ') + 'Place '.length
  let cityEnd = prompt.lastIndexOf(' on the map.')
  let placeText = prompt.slice(cityStart, cityEnd)
  let separator = placeText.lastIndexOf(', ')
  let cityName = placeText.slice(0, separator)
  let countryName = placeText.slice(separator + 2)
  let cityCountry = countries.find((item) => item.name === countryName)
  let city = cities.find((item) => item.name === cityName && item.countryIso3 === cityCountry?.iso3 && isCurrentWholeSettlement(item) && item.population >= 50_000)
  expect(city).toBeTruthy()
  const map = page.locator('.city-map-stage .geo-map')
  const bounds = await map.boundingBox()
  expect(bounds).toBeTruthy()
  await page.mouse.click(bounds!.x + bounds!.width * 0.36, bounds!.y + bounds!.height * 0.48)
  await expect(page.locator('.map-marker-guess')).toHaveCount(1)
  await expect(page.locator('.map-marker-answer')).toHaveCount(0)
  const firstMarker = await page.locator('.map-marker-guess').getAttribute('transform')
  await page.mouse.click(bounds!.x + bounds!.width * 0.62, bounds!.y + bounds!.height * 0.52)
  await expect(page.locator('.map-marker-guess')).toHaveCount(1)
  await expect.poll(() => page.locator('.map-marker-guess').getAttribute('transform')).not.toBe(firstMarker)
  await page.getByText('Enter coordinates', { exact: true }).click()
  await page.getByLabel('Latitude').fill(city!.lat.toFixed(2))
  await page.getByLabel('Longitude').fill(city!.lon.toFixed(2))
  await page.getByRole('button', { name: 'Place marker' }).click()
  await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
  await expect(page.locator('.map-marker-answer')).toHaveCount(1)
  await waitForRoundProgress(page, 'questions', 2)
  await expect(page.locator('.question-toolbar h2')).toBeFocused()

  await openGame(page, 'cities', 'freeplay', 'identify-city')
  prompt = await page.locator('.question-toolbar h2').innerText()
  countryName = prompt.replace(/^Which city is marked in /, '').replace(/\?$/, '')
  cityCountry = countries.find((item) => item.name === countryName)
  expect(cityCountry).toBeTruthy()
  const identificationCities = cities.filter((item) => isCurrentWholeSettlement(item) && item.countryIso3 === cityCountry?.iso3)
  const candidate = identificationCities.find((item) => (item.population >= 50_000 || item.capital) && identificationCities.filter((other) => other.name === item.name).length === 1)
  expect(candidate).toBeTruthy()
  const cityInput = page.locator('#city-identify-answer')
  await cityInput.fill(candidate!.name)
  const citySuggestion = page.locator('#city-identify-answer-suggestions .suggestion-option')
    .filter({ has: page.getByText(candidate!.name, { exact: true }) })
  await expect(citySuggestion).toHaveCount(1)
  await expect(citySuggestion).toBeVisible()
  await citySuggestion.click()
  await page.getByRole('button', { name: 'Identify' }).click()
  await expect(page.locator('.answer-feedback')).toBeVisible()
  await waitForRoundProgress(page, 'questions', 2)
  await expect(page.locator('.question-toolbar h2')).toBeFocused()
})

test('settings exports and imports progress, confirms reset, and the data page shows coverage', async ({ page }) => {
  await page.goto('/settings')

  const appearance = page.getByLabel('Appearance', { exact: true })
  await appearance.selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('maproom-theme'))).toBe('dark')
  await page.reload()
  await expect(appearance).toHaveValue('dark')
  await page.emulateMedia({ colorScheme: 'dark' })
  await appearance.selectOption('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('maproom-theme'))).toBe('system')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(appearance).toHaveValue('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByLabel(/Puzzle time zone/).selectOption('UTC')
  await expect(page.getByLabel(/Puzzle time zone/)).toHaveValue('UTC')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^maproom-progress-\d{4}-\d{2}-\d{2}\.json$/)

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles({
    name: 'maproom-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      format: 'maproom-progress',
      version: 1,
      settings: { timeZone: 'Europe/London', mapLabels: false },
      favorites: ['flags'],
      history: [],
    })),
  })
  await expect(page.getByText('Progress imported.')).toBeVisible()
  await expect(page.getByLabel(/Puzzle time zone/)).toHaveValue('Europe/London')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Reset saved data' }).click()
  await expect(page.getByRole('alert')).toContainText('Reset all saved data?')
  await page.getByRole('button', { name: 'Delete saved data' }).click()
  await expect(page.getByText('Saved data has been reset.')).toBeVisible()
  await expect(appearance).toHaveValue('light')

  await page.goto('/data')
  await expect(page.getByRole('heading', { name: 'Data sources' })).toBeVisible()
  await expect(page.locator('.source-license-link').first()).toBeVisible()
  const sourceLinkNames = await page.locator('.source-license-link').evaluateAll((links) => links.map((link) => link.textContent?.trim() ?? ''))
  expect(sourceLinkNames.length).toBeGreaterThan(1)
  expect(new Set(sourceLinkNames).size).toBe(sourceLinkNames.length)
  await expect(page.locator('.coverage-summary')).toContainText('198')
  await expect(page.getByRole('heading', { name: 'First-level divisions by country' })).toBeVisible()
  await expect(page.locator('.coverage-row')).toHaveCount(198)
  await page.getByLabel('Search country boundary coverage').fill('Sweden')
  await expect(page.locator('.coverage-row')).toHaveCount(1)
})

test('data source loading and errors are announced', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const resource = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (new URL(resource, location.href).pathname === '/data/data-manifest.json') {
        await new Promise((resolve) => window.setTimeout(resolve, 1600))
        throw new TypeError('Network failure')
      }
      return nativeFetch(input, init)
    }
  })

  await page.goto('/data')
  await expect(page.getByRole('status').filter({ hasText: 'Reading source manifest' })).toHaveText('Reading source manifest…')
  const error = page.getByRole('alert')
  await expect(error).toContainText('Data sources and coverage are temporarily unavailable.')
  await expect(error).toContainText('Try refreshing this page.')
  await expect(page.getByRole('status').filter({ hasText: 'Country coverage could not be loaded' })).toHaveText('Country coverage could not be loaded. Try refreshing this page.')
  await expect(page.locator('.region-coverage .loading-state')).toContainText('Country coverage could not be loaded.')
})

test('the production service worker reopens cached routes when offline', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.welcome-hero h1')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Today’s puzzles' })).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller) return
    await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))
  })

  // Warm the lazy data files while online so the offline check covers actual play assets,
  // not only the app shell and Explore route.
  await page.goto('/games/countries?mode=daily')
  await expect(page.locator('.geo-map path')).not.toHaveCount(0, { timeout: 30_000 })
  await page.goto('/games/outlines?mode=daily')
  await expect(page.locator('.outline-map-stage .geo-map path')).not.toHaveCount(0, { timeout: 30_000 })
  await page.goto('/games/distance?mode=freeplay')
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible()
  await expect(page.locator('.distance-city-choice').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.locator('.distance-city-choice').first()).toBeVisible()
  await page.goto('/games/rivers?mode=freeplay')
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible()
  await expect(page.locator('.riverways-map-stage .geo-map path')).not.toHaveCount(0, { timeout: 30_000 })
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByLabel('Name the highlighted river')).toBeVisible()

  const openedDataWasCached = await page.evaluate(async () => {
    const files = [
      '/data/countries.topo.json',
      '/data/countries-outline.topo.json',
      '/data/cities-major.json',
      '/data/rivers.json',
    ]
    return Promise.all(files.map(async (file) => Boolean(await caches.match(file))))
  })
  expect(openedDataWasCached).toEqual([true, true, true, true])

  await page.context().setOffline(true)

  await page.goto('/games/countries?mode=daily')
  await expect(page.locator('.geo-map path')).not.toHaveCount(0, { timeout: 30_000 })
  await page.goto('/games/outlines?mode=daily')
  await expect(page.locator('.outline-map-stage .geo-map path')).not.toHaveCount(0, { timeout: 30_000 })
  await page.goto('/games/distance?mode=freeplay')
  await expect(page.locator('.distance-city-choice').first()).toBeVisible({ timeout: 30_000 })
  await page.goto('/games/rivers?mode=freeplay')
  await expect(page.locator('.riverways-map-stage .geo-map path')).not.toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByLabel('Name the highlighted river')).toBeVisible()

  await page.goto('/explore')
  await expect(page.getByRole('heading', { name: 'Geography games' })).toBeVisible()
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(exploreExperienceCount)
})
