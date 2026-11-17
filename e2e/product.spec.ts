import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

test.beforeAll(() => mkdirSync('artifacts/qa/product-consistency', { recursive: true }))

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
  capital?: boolean
}

async function openGame(page: Page, id: string, mode: 'daily' | 'practice' = 'practice') {
  await page.goto(`/games/${id}?mode=${mode}`)
  await expect(page.locator('.game-context-bar')).toBeVisible()
  await expect(page.locator('.game-context-title')).toHaveCount(1)
  await expect(page.locator('.game-body')).toBeVisible({ timeout: 30_000 })
}

async function submitText(page: Page, selector: string, answer: string) {
  const input = page.locator(selector)
  await input.fill(answer)
  await input.press('Enter')
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
  const response = await page.request.get(new URL('/data/countries.geojson', page.url()).toString())
  expect(response.ok()).toBe(true)
  const collection = await response.json() as { features: Array<{ geometry: unknown; properties: { iso3?: string } | null }> }
  const features = collection.features.filter((feature) => feature.geometry && feature.properties?.iso3 && eligibleCodes.has(feature.properties.iso3))
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

async function displayedFlagCountry(page: Page): Promise<string> {
  const iconClass = await page.locator('.flag-display [role="img"]').getAttribute('class')
  const flagCode = iconClass?.split(/\s+/).find((name) => name.startsWith('fi-') && name !== 'fi')?.slice(3)
  expect(flagCode, 'flag icon should expose its bundled flag code to the test').toBeTruthy()
  const country = (await countryData(page)).find((item) => item.flagCode === flagCode)
  expect(country, `country with flag code ${flagCode}`).toBeDefined()
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

function solveConnectionsBoard(countries: CountryRecord[], tileNames: string[]) {
  const byName = new Map(countries.map((country) => [country.name, country]))
  const tiles = tileNames.map((name) => byName.get(name)).filter((country): country is CountryRecord => country !== undefined)
  expect(tiles).toHaveLength(16)
  const tileCodes = new Set(tiles.map((country) => country.iso3))
  const groups = new Map<string, string[]>()
  const add = (matches: (country: CountryRecord) => boolean) => {
    const codes = tiles.filter(matches).map((country) => country.iso3)
    if (codes.length === 4) groups.set(codes.slice().sort().join('|'), codes)
  }
  const addExactFour = (label: string, matches: (country: CountryRecord) => boolean) => {
    const codes = tiles.filter(matches).map((country) => country.iso3)
    if (codes.length === 4) groups.set(`${label}:${codes.slice().sort().join('|')}`, codes)
  }
  const continents = [...new Set(tiles.map((country) => country.continent).filter((value): value is string => Boolean(value)))]
  for (const continent of continents) {
    addExactFour(`continent:${continent}`, (country) => country.continent === continent)
    addExactFour(`landlocked:${continent}`, (country) => country.continent === continent && country.landlocked)
  }
  addExactFour('landlocked', (country) => country.landlocked)
  const subregions = [...new Set(tiles.map((country) => country.subregion).filter((value): value is string => Boolean(value)))]
  for (const subregion of subregions) {
    add((country) => country.subregion === subregion)
    add((country) => country.subregion === subregion && country.landlocked)
    add((country) => country.subregion === subregion && country.borders.length === 0)
  }
  const populationBands: Array<(value: number) => boolean> = [
    (value) => value < 1_000_000,
    (value) => value >= 1_000_000 && value < 5_000_000,
    (value) => value >= 5_000_000 && value < 25_000_000,
    (value) => value >= 25_000_000 && value < 100_000_000,
    (value) => value >= 100_000_000,
  ]
  populationBands.forEach((matches) => add((country) => country.population !== null && matches(country.population)))
  const areaBands: Array<(value: number) => boolean> = [
    (value) => value < 10_000,
    (value) => value >= 10_000 && value < 100_000,
    (value) => value >= 100_000 && value < 500_000,
    (value) => value >= 500_000 && value < 2_000_000,
    (value) => value >= 2_000_000,
  ]
  areaBands.forEach((matches) => add((country) => country.areaKm2 !== null && country.areaKm2 > 0 && matches(country.areaKm2)))
  const initial = (value: string | null) => value?.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase()[0] ?? ''
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    add((country) => initial(country.name) === letter)
    add((country) => initial(country.capital) === letter)
  }
  const adjacency = new Map(countries.map((country) => [country.iso3, new Set<string>()]))
  for (const country of countries) for (const neighbor of country.borders) {
    adjacency.get(country.iso3)?.add(neighbor)
    adjacency.get(neighbor)?.add(country.iso3)
  }
  for (const code of ['ARG', 'BRA', 'CHN', 'DEU', 'FRA', 'IND', 'RUS', 'ZAF']) {
    const neighbors = adjacency.get(code) ?? new Set<string>()
    addExactFour(`borders:${code}`, (country) => neighbors.has(country.iso3))
  }
  const candidates = [...groups.values()].map((codes) => codes.filter((code) => tileCodes.has(code)))
  function search(remaining: Set<string>, selected: string[][]): string[][] | null {
    if (remaining.size === 0) return selected
    const first = remaining.values().next().value as string
    for (const group of candidates) {
      if (!group.includes(first) || !group.every((code) => remaining.has(code))) continue
      const next = new Set(remaining)
      group.forEach((code) => next.delete(code))
      const solution = search(next, [...selected, group])
      if (solution) return solution
    }
    return null
  }
  const solution = search(tileCodes, [])
  expect(solution, 'Connections tiles should have four defensible category groupings').not.toBeNull()
  return solution!
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
  await expect(page.locator('.daily-section-heading h2')).toHaveText('Today’s puzzles')
  await expect(page.locator('.daily-grid .game-card')).toHaveCount(6)
  await expect(page.locator('.other-games-carousel .game-card')).toHaveCount(4)
  await expect(page.locator('.other-games-carousel .game-card-link').first()).toHaveAttribute('href', /mode=practice/)
  await expect(page.getByRole('link', { name: 'Explore all games' })).toBeVisible()
  const practiceCarousel = page.locator('.other-games-carousel')
  await page.setViewportSize({ width: 800, height: 900 })
  await practiceCarousel.focus()
  const carouselBefore = await practiceCarousel.evaluate((element) => element.scrollLeft)
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => practiceCarousel.evaluate((element) => element.scrollLeft)).toBeGreaterThan(carouselBefore)
  await page.setViewportSize({ width: 1440, height: 960 })
  await expect(page.locator('.game-card-action span')).toHaveCount(0)
  await expect(page.locator('.header-tools .data-shortcut')).toHaveCount(0)
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
  await expect.poll(underlineScale).toBeGreaterThan(.98)
  const underlineDuration = await exploreNav.evaluate((element) => getComputedStyle(element, '::after').transitionDuration)
  expect(underlineDuration).toContain('0.2s')
  const currentNav = page.locator('.primary-nav .nav-link.is-current')
  await expect.poll(() => currentNav.evaluate((element) => getComputedStyle(element, '::after').opacity)).toBe('1')
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
  const countryMap = page.locator('.game-card-countries .art-world')
  await expect(countryMap).toHaveJSProperty('complete', true)
  await expect(countryMap).toHaveCSS('object-fit', 'contain')
  await expect(page.locator('.game-card-routes .art-route img')).toHaveCount(1)
  await expect(page.locator('.game-card-cities .art-city-target')).toHaveCount(1)
  await page.mouse.move(0, 0)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/home-desktop.png', fullPage: true })
  const keyboardPage = await page.context().newPage()
  await keyboardPage.goto('/')
  await keyboardPage.keyboard.press('Tab')
  await expect(keyboardPage.locator('.skip-link')).toBeFocused()
  await keyboardPage.close()

  await page.goto('/explore')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(10)
  const flagCard = page.locator('.game-card').filter({ hasText: 'Flag study' })
  const favorite = flagCard.locator('.favorite-button')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await expect(favorite.locator('svg')).toHaveCSS('animation-name', 'favorite-pop')
  await expect(favorite).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Favorites/ }).click()
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(1)
  await expect(page.locator('.explore-grid .game-card')).toContainText('Flag study')
  await page.getByRole('button', { name: 'All games' }).click()
  await page.getByRole('button', { name: /Favorites/ }).click()
  await page.getByLabel('Search games').fill('capitals')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(2)
  await expect(page.locator('.explore-grid .game-card').filter({ hasText: 'Capitals & cities' })).toHaveCount(1)
  await expect(page.locator('.explore-grid .game-card').filter({ hasText: 'Distance & Direction' })).toHaveCount(1)

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
  await page.getByRole('link', { name: 'Explore', exact: true }).click()
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
    await page.getByRole('button', { name: index === 7 ? 'See result' : 'Next place' }).click()
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
  await expect(page.getByRole('link', { name: 'Play practice' })).toBeVisible()
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
  await expect(page.locator('.flag-progress')).toHaveText('01 / 08')
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
  await answerOnMapByKeyboard(page, countryQuestion)
  await expect(page.locator('.answer-feedback')).toBeVisible()
  const countrySession = await waitForDailySession(page, 'countries')
  expect(countrySession?.payload?.answerLocked).toBe(true)
  await page.reload()
  await expect(page.locator('.question-toolbar h2 em')).toHaveText(countryQuestion)
  await expect(page.locator('.answer-feedback')).toBeVisible()

  await openGame(page, 'outlines', 'daily')
  await page.locator('#outline-answer').fill('Can')
  await waitForDailySession(page, 'outlines')
  await page.reload()
  await expect(page.locator('#outline-answer')).toHaveValue('Can')

  await openGame(page, 'routes', 'daily')
  await page.getByRole('button', { name: 'Hint' }).click()
  const routeStep = (await page.locator('.route-hint').innerText()).match(/through (.+)\.$/)?.[1]
  expect(routeStep).toBeTruthy()
  await submitText(page, '#route-country', routeStep!)
  const routeSession = await waitForDailySession(page, 'routes')
  expect(routeSession?.payload?.route).toHaveLength(2)
  await page.goto('/')
  await openGame(page, 'routes', 'daily')
  await expect(page.locator('.route-stops li')).toHaveCount(3)
  await expect(page.locator('.route-stops')).toContainText(routeStep!)

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
  await flagChoices.nth(wrongFlagChoice).click()
  await expect(page.locator('.answer-feedback.is-incorrect')).toBeVisible()
  const flagSession = await waitForDailySession(page, 'flags')
  expect(flagSession?.payload?.locked).toBe(true)
  await page.reload()
  await expect(page.locator('.answer-feedback.is-incorrect')).toBeVisible()
  await expect(page.locator('.flag-progress')).toHaveText('01 / 08')

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
    await page.getByLabel('Latitude').fill('12.34')
    await waitForDailySession(page, 'cities')
    await page.reload()
    await expect(page.locator('.question-toolbar h2')).toHaveText(cityQuestion)
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
    } else await expect(reopenedBrowserPage.getByLabel('Latitude')).toHaveValue('12.34')
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

test('country identification uses the map data, accepts an answer and saves a full practice result', async ({ page }) => {
  await openGame(page, 'countries')
  for (let index = 0; index < 10; index += 1) {
    const answer = await page.locator('.question-toolbar h2 em').innerText()
    await answerOnMapByKeyboard(page, answer)
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    await page.getByRole('button', { name: index === 9 ? 'See result' : 'Next place' }).click()
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-score')).toContainText('1,000')
  await page.locator('main').getByRole('link', { name: 'Statistics', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible()
  await expect(page.locator('.stat-overview')).toContainText('1 completed')
  await page.reload()
  await expect(page.locator('.stat-overview')).toContainText('1 completed')
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
  await openGame(page, 'outlines')
  const guesses = ['Afghanistan', 'Brazil', 'Canada', 'France', 'Japan', 'Kenya']
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
  await setGameSetting(page, 'Practice scope', 'Subdivisions')
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
  await expect(page.locator('.route-map-legend')).toContainText('Start')
  await expect(page.locator('.route-map-legend')).toContainText('Finish')
  await expect(page.locator('.route-map-legend')).toContainText('Route')
  const pathLabels = await page.locator('.route-map-stage .geo-map path[role="button"]').evaluateAll((paths) => paths.map((path) => path.getAttribute('aria-label') ?? ''))
  expect(pathLabels.length).toBeGreaterThan(0)
  expect(pathLabels.every((label) => /^Unlabelled map region \d+/.test(label))).toBe(true)
  const activeBounds = await page.locator('.route-map-stage .geo-map .map-country.is-active').evaluate((element) => {
    const bounds = (element as SVGPathElement).getBBox()
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
  })
  expect(activeBounds.width).toBeGreaterThan(0)
  expect(activeBounds.height).toBeGreaterThan(0)
  const routeMap = page.locator('.route-map-stage .geo-map')
  const routeMapBounds = await routeMap.boundingBox()
  expect(routeMapBounds).not.toBeNull()
  const markerCenters = await routeMap.locator('.map-marker').evaluateAll((markers) => markers.map((marker) => {
    const bounds = marker.getBoundingClientRect()
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  }))
  expect(markerCenters).toHaveLength(2)
  const markerDistance = Math.hypot(markerCenters[0]!.x - markerCenters[1]!.x, markerCenters[0]!.y - markerCenters[1]!.y)
  expect(markerDistance / Math.hypot(routeMapBounds!.width, routeMapBounds!.height)).toBeGreaterThan(0.12)
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
  const routePathPoint = await mapPathPoint(page, '.route-map-stage .geo-map path[role="button"]', 0)
  expect(routePathPoint).not.toBeNull()
  await page.mouse.move(routePathPoint!.x, routePathPoint!.y)
  await expect(page.locator('.route-map-stage .map-caption')).toHaveCount(0)
  await page.getByRole('button', { name: 'Hint' }).click()
  await expect(page.locator('.route-hint')).toContainText('A shortest continuation goes through')
  const hintedNames: string[] = []
  for (let step = 0; step < 8 && await page.locator('.game-results-dialog').isHidden(); step += 1) {
    if (step > 0) await page.getByRole('button', { name: 'Hint' }).click()
    const hint = await page.locator('.route-hint').innerText()
    const nextName = hint.match(/through (.+)\.$/)?.[1]
    expect(nextName, 'hint names the next step only').toBeTruthy()
    hintedNames.push(nextName!)
    await submitText(page, '#route-country', nextName!)
    if (await page.locator('.game-results-dialog').isHidden()) {
      await expect(page.locator('.route-stops li')).toHaveCount(step + 3)
    }
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog h2')).toContainText('shortest')
  expect(hintedNames.length).toBeGreaterThanOrEqual(2)
  await expect(page.locator('.game-results-score')).not.toContainText('1,000')
})

test('flag identification answers each locally bundled flag and completes practice', async ({ page }) => {
  await openGame(page, 'flags')
  const navigationBeforeRound = await shellGeometry(page)
  for (let index = 0; index < 10; index += 1) {
    const label = await page.locator('.flag-display [role="img"]').getAttribute('aria-label')
    expect(label).toBe('National flag to identify')
    const answer = await displayedFlagCountry(page)
    expect(answer.length).toBeGreaterThan(0)
    const buttons = page.locator('.flag-choice')
    let matched = false
    for (let choiceIndex = 0; choiceIndex < await buttons.count(); choiceIndex += 1) {
      const button = buttons.nth(choiceIndex)
      if ((await button.locator('.flag-choice-name').innerText()) === answer) {
        await button.click()
        matched = true
        break
      }
    }
    expect(matched).toBe(true)
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    if (index < 9) await expect(page.locator('.flag-progress')).toHaveText(`${String(index + 2).padStart(2, '0')} / 10`, { timeout: 5_000 })
  }
  const results = page.getByRole('dialog', { name: 'Practice round complete.' })
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
  await expect(page.locator('.flag-progress')).toHaveText('01 / 10')
  await expect(page.locator('.game-results-dialog')).toBeHidden()
})

test('infinite flag practice cycles fairly, stays open and saves the chosen session total', async ({ page }) => {
  await openGame(page, 'flags')
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.getByLabel('Questions').selectOption('infinite')
  await page.keyboard.press('Escape')
  await expect(page.locator('.flag-progress')).toHaveText('Question 1')

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
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    await expect(page.locator('.flag-progress')).toHaveText(`Question ${index + 2}`, { timeout: 5_000 })
  }

  await expect(page.locator('.game-results-dialog')).toHaveCount(0)
  await expect(page.locator('.flag-live-status')).toContainText('1,200 pts')
  await expect(page.locator('.flag-live-status')).toContainText('12 correct')
  await expect(page.locator('.flag-live-status')).toContainText('100% accuracy')
  await page.getByRole('button', { name: 'End session' }).click()
  const results = page.getByRole('dialog', { name: 'Practice session complete.' })
  await expect(results).toBeVisible()
  await expect(page.locator('.game-results-score')).toContainText('1,200')
  await expect(page.locator('.game-results-summary')).toHaveText('12 / 12 correct · 100% accuracy')
  await results.getByRole('link', { name: 'Statistics' }).click()
  await expect(page.locator('.history-result').first()).toContainText('12 / 12 correct')
})

test('flag daily mode keeps its seed and advances after a keyboard answer', async ({ page }) => {
  await openGame(page, 'flags', 'daily')
  await expect(page.locator('.site-header')).toBeVisible()
  const topBarBox = await page.locator('.site-header').boundingBox()
  expect(topBarBox?.y).toBeLessThanOrEqual(1)
  expect(topBarBox?.height).toBeLessThanOrEqual(62)
  await expect(page.locator('.game-context-bar .game-context-back')).toBeVisible()
  await expect(page.locator('.game-context-bar .mode-switch a.is-selected')).toHaveText('Daily')
  await expect(page.locator('.flag-settings-button')).toHaveCount(0)
  await expect(page.locator('.game-page-heading')).toHaveCount(0)
  await page.getByRole('link', { name: 'Practice', exact: true }).click()
  await expect(page).toHaveURL(/\/games\/flags\?mode=practice$/)
  await expect(page.locator('.game-context-bar .mode-switch a.is-selected')).toHaveText('Practice')
  await page.locator('.game-context-bar .mode-switch').getByRole('link', { name: 'Daily', exact: true }).click()
  await expect(page).toHaveURL(/\/games\/flags\?mode=daily$/)
  await expect(page.locator('.game-context-bar .mode-switch a.is-selected')).toHaveText('Daily')
  await page.getByRole('link', { name: 'All games' }).click()
  await expect(page).toHaveURL(/\/explore$/)
  await page.goBack()
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
  await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
  await expect(page.locator('.flag-choice.is-right')).toHaveCSS('background-color', 'rgb(229, 239, 229)')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-correct-desktop.png' })
  await expect(page.locator('.flag-progress')).toHaveText('02 / 08', { timeout: 5_000 })
  await expect(page.getByRole('button', { name: 'Next flag' })).toHaveCount(0)
})

test('changing practice settings cancels a pending automatic advance', async ({ page }) => {
  await openGame(page, 'flags')
  const answer = await displayedFlagCountry(page)
  const choices = page.locator('.flag-choice')
  let correctIndex = -1
  for (let index = 0; index < await choices.count(); index += 1) {
    if ((await choices.nth(index).locator('.flag-choice-name').innerText()) === answer) correctIndex = index
  }
  expect(correctIndex).toBeGreaterThanOrEqual(0)
  await choices.nth(correctIndex).click()
  await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.getByLabel('Region').selectOption({ label: 'Europe' })
  await expect(page.locator('.flag-progress')).toHaveText('01 / 10')
  const refreshedFlag = await displayedFlagCountry(page)
  const countries = await countryData(page)
  expect(countries.find((country) => country.name === refreshedFlag)?.continent).toBe('Europe')
  await page.waitForTimeout(850)
  await expect(page.locator('.flag-progress')).toHaveText('01 / 10')
})

test('flag practice settings cover regions, direction, answer style and progressive reveal', async ({ page }) => {
  await openGame(page, 'flags')
  const firstChoice = page.locator('.flag-choice').first()
  await firstChoice.hover()
  await expect(firstChoice).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -1)')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-choice-hover-desktop.png' })
  const settingsButton = page.getByRole('button', { name: 'Game settings' })
  await expect(settingsButton).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('group', { name: 'Game settings' })).toHaveCount(0)
  await settingsButton.focus()
  await page.keyboard.press('Enter')
  const settings = page.getByRole('group', { name: 'Game settings' })
  await expect(settings).toBeVisible()
  await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-settings-desktop.png' })
  await page.keyboard.press('Escape')
  await expect(settingsButton).toBeFocused()
  await expect(settings).toHaveCount(0)

  await settingsButton.click()
  await setGameSetting(page, 'Questions', '20')
  await expect(page.locator('.flag-progress')).toHaveText('01 / 20')
  await setGameSetting(page, 'Questions', '50')
  await expect(page.locator('.flag-progress')).toHaveText('01 / 50')
  await setGameSetting(page, 'Questions', 'infinite')
  await expect(page.locator('.flag-progress')).toHaveText('Question 1')
  await setGameSetting(page, 'Questions', '10')
  await expect(page.locator('.flag-progress')).toHaveText('01 / 10')
  await setGameSetting(page, 'Region', { label: 'Europe' })
  await expect(page.getByLabel('Region')).toHaveValue('Europe')
  await setGameSetting(page, 'Direction', 'country-to-flag')
  await expect(page.getByLabel('Answer style')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(settings).toHaveCount(0)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-country-to-flag-desktop.png' })
  const answerFlagWidths = await page.locator('.image-choice-grid .flag-frame').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width))
  expect(answerFlagWidths).toHaveLength(4)
  expect(Math.min(...answerFlagWidths)).toBeGreaterThan(70)
  const countryPrompt = await page.locator('.flag-question-row h1').innerText()
  const answerCountry = countryPrompt.replace(/^Which flag belongs to /, '').replace(/\?$/, '')
  const europeanNames = new Set((await countryData(page)).filter((country) => country.continent === 'Europe' && (country.independent || country.iso3 === 'PSE')).map((country) => country.name))
  expect(europeanNames.has(answerCountry)).toBe(true)
  const correctFlag = await flagChoiceForCountry(page, answerCountry)
  await correctFlag.click()
  await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
  await expect(page.locator('.flag-progress')).toHaveText('02 / 10', { timeout: 5_000 })

  const nextPrompt = await page.locator('.flag-question-row h1').innerText()
  const nextCountry = nextPrompt.replace(/^Which flag belongs to /, '').replace(/\?$/, '')
  const answerOptions = page.locator('.flag-choice')
  const nextCorrect = await flagChoiceForCountry(page, nextCountry)
  const correctIndex = await nextCorrect.evaluate((element) => [...element.parentElement!.children].indexOf(element))
  const wrongIndex = correctIndex === 0 ? 1 : 0
  const wrongOption = answerOptions.nth(wrongIndex)
  await wrongOption.click()
  await expect(page.locator('.answer-feedback.is-incorrect')).toContainText('The answer is')
  await expect(wrongOption).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Next flag' })).toHaveCount(0)
  await expect(page.locator('.flag-progress')).toHaveText('03 / 10', { timeout: 5_000 })

  await settingsButton.click()
  await setGameSetting(page, 'Direction', 'flag-to-country')
  await setGameSetting(page, 'Answer style', 'typed')
  await page.getByLabel('Reveal after wrong guesses').check()
  await expect(page.getByLabel('Answer style')).toHaveValue('typed')
  await expect(page.getByLabel('Reveal after wrong guesses')).toBeChecked()
  await page.keyboard.press('Escape')

  const typedAnswer = await displayedFlagCountry(page)
  const wrongCountry = [...europeanNames].find((name) => name !== typedAnswer)
  expect(wrongCountry).toBeTruthy()
  const input = page.getByLabel('Country name for the flag')
  await input.fill(wrongCountry!)
  const wrongSuggestion = page.getByRole('option', { name: wrongCountry!, exact: true })
  await expect(wrongSuggestion).toBeVisible()
  await expect(wrongSuggestion).toHaveText(wrongCountry!)
  await wrongSuggestion.click()
  await expect(page.locator('.flag-display')).toHaveClass(/has-reveal/)
  await expect(page.locator('.answer-feedback')).toContainText('try once more')
  await expect(input).toBeEnabled()
  await page.waitForTimeout(1_000)
  await expect(page.locator('.flag-progress')).toHaveText('01 / 10')

  await input.fill(typedAnswer)
  await page.getByRole('option', { name: typedAnswer, exact: true }).click()
  await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
  await expect(page.locator('.flag-progress')).toHaveText('02 / 10', { timeout: 5_000 })
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

    await page.getByRole('button', { name: 'Game settings' }).click()
    await setGameSetting(page, 'Direction', 'country-to-flag')
    await page.keyboard.press('Escape')
    await expect(page.locator('.image-choice-grid .flag-choice')).toHaveCount(4)
    await expectCenteredFlagLayout(page, 'country-to-flag')
    if (viewport.name === 'mobile') {
      const textRects = await page.locator('.flag-question-row h1').evaluate((element) => {
        const range = document.createRange()
        range.selectNodeContents(element)
        return [...range.getClientRects()].map(({ x, y, right, bottom }) => ({ x, y, right, bottom }))
      })
      const utility = await page.locator('.flag-round-utility').boundingBox()
      const progress = await page.locator('.flag-progress').boundingBox()
      const settings = await page.locator('.game-settings-button').boundingBox()
      expect(utility).not.toBeNull()
      expect(textRects.some((rect) => rect.x < utility!.x + utility!.width && rect.right > utility!.x && rect.y < utility!.y + utility!.height && rect.bottom > utility!.y)).toBe(false)
      expect(settings!.x).toBeGreaterThanOrEqual(progress!.x + progress!.width + 4)
    }
    await page.screenshot({ path: `artifacts/qa/product-consistency/flags-${viewport.name}-country-to-flag.png`, fullPage: true })
  }
})

test('flag practice settings stay within the mobile viewport and remain tappable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  try {
    const page = await context.newPage()
    await openGame(page, 'flags')
    const topBarBox = await page.locator('.site-header').boundingBox()
    expect(topBarBox?.y).toBeLessThanOrEqual(1)
    expect(topBarBox?.height).toBeLessThanOrEqual(60)
    await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-practice-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Game settings' }).tap()
    const settings = page.getByRole('group', { name: 'Game settings' })
    await expect(settings).toBeVisible()
    const panel = await settings.boundingBox()
    expect(panel?.x).toBeGreaterThanOrEqual(0)
    expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThanOrEqual(390)
    await page.screenshot({ path: 'artifacts/qa/product-consistency/flags-settings-mobile.png', fullPage: true })
    await setGameSetting(page, 'Region', { label: 'Asia' })
    await setGameSetting(page, 'Direction', 'country-to-flag')
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
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    await expect(page.locator('.flag-progress')).toHaveText('Question 2', { timeout: 5_000 })
    await page.getByRole('button', { name: 'End session' }).tap()
    const results = page.getByRole('dialog', { name: 'Practice session complete.' })
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
  const countries = (await countryData(page)).filter((country) => country.independent || country.iso3 === 'PSE')
  const rows = await page.locator('.grid-row-label').allTextContents()
  const columns = await page.locator('.grid-column-label').allTextContents()
  expect(rows).toHaveLength(3)
  expect(columns).toHaveLength(3)

  function matches(category: string, country: CountryRecord): boolean {
    if (category.endsWith(' · continent')) return country.continent === category.slice(0, -' · continent'.length)
    if (category.endsWith(' · subregion')) return country.subregion === category.slice(0, -' · subregion'.length)
    if (category === 'Landlocked') return country.landlocked
    if (category === 'Has a coastline') return !country.landlocked
    if (category === 'Has a land neighbour') return country.borders.length > 0
    if (category === 'No land neighbours') return country.borders.length === 0
    if (category === 'Capital coordinates recorded') return country.capitalCoordinates !== null
    if (category === 'Population density over 100/km²') return country.population !== null && Boolean(country.areaKm2) && country.population / country.areaKm2! >= 100
    if (category === 'Population density under 20/km²') return country.population !== null && Boolean(country.areaKm2) && country.population / country.areaKm2! < 20
    if (category.startsWith('Population over ')) {
      const millions = Number(category.match(/[\d.]+/)?.[0])
      return (country.population ?? 0) >= millions * 1_000_000
    }
    if (category.startsWith('Population under ')) {
      const millions = Number(category.match(/[\d.]+/)?.[0])
      return country.population !== null && country.population < millions * 1_000_000
    }
    if (category.startsWith('Area over ')) {
      const area = Number(category.match(/[\d,]+/)?.[0].replaceAll(',', ''))
      return (country.areaKm2 ?? 0) >= area
    }
    if (category.startsWith('Area under ')) {
      const area = Number(category.match(/[\d,]+/)?.[0].replaceAll(',', ''))
      return country.areaKm2 !== null && country.areaKm2 < area
    }
    return country.continent === category || country.subregion === category
  }

  const cells = rows.flatMap((row, rowIndex) => columns.map((column, columnIndex) => ({
    key: `${rowIndex}:${columnIndex}`,
    candidates: countries.filter((country) => country.hasGeometry && matches(row, country) && matches(column, country)).sort((left, right) => left.name.localeCompare(right.name)),
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
    await page.locator(`.grid-cell[data-cell-key="${key}"] .grid-cell-trigger`).click()
    await submitText(page, '#grid-answer-input', country.name)
    filled += 1
    await expect(page.locator('.grid-answer strong')).toHaveCount(filled)
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog')).toContainText('All nine squares filled')
})

test('captures the redesigned desktop game stages and key mobile screens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await expect(page.locator('.daily-grid .game-card')).toHaveCount(6)
  await expect(page.locator('.other-games-carousel .game-card')).toHaveCount(4)
  await page.goto('/explore')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(10)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/explore-desktop.png', fullPage: true })

  for (const [route, name] of [['/statistics', 'statistics'], ['/settings', 'settings'], ['/data', 'data'], ['/about', 'about'], ['/privacy', 'privacy']] as const) {
    await page.goto(route)
    await expect(page.locator('main h1').first()).toBeVisible()
    await page.screenshot({ path: `artifacts/qa/product-consistency/${name}-desktop.png`, fullPage: true })
  }

  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'connections', 'higher-lower', 'neighbours', 'distance']) {
    await openGame(page, id, ['connections', 'higher-lower', 'neighbours', 'distance'].includes(id) ? 'practice' : 'daily')
    await page.screenshot({ path: `artifacts/qa/product-consistency/game-${id}-desktop.png` })
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'connections', 'higher-lower', 'neighbours', 'distance']) {
    await openGame(page, id, ['connections', 'higher-lower', 'neighbours', 'distance'].includes(id) ? 'practice' : 'daily')
    await page.screenshot({ path: `artifacts/qa/product-consistency/game-${id}-laptop.png` })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${id} laptop width overflow`).toBeLessThanOrEqual(0)
  }

  await page.setViewportSize({ width: 1024, height: 768 })
  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'connections', 'higher-lower', 'neighbours', 'distance']) {
    await openGame(page, id, ['connections', 'higher-lower', 'neighbours', 'distance'].includes(id) ? 'practice' : 'daily')
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
    await openGame(page, id, ['connections', 'higher-lower', 'neighbours', 'distance'].includes(id) ? 'practice' : 'daily')
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
      const builderBox = await page.locator('.route-game-dock .route-builder').boundingBox()
      const inputBox = await page.locator('.route-game-dock .route-input-row').boundingBox()
      expect(builderBox && inputBox && builderBox.y + builderBox.height).toBeLessThanOrEqual(inputBox?.y ?? 0)
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

test('Geography Connections accepts four valid attribute groups and replays', async ({ page }) => {
  await openGame(page, 'connections')
  await expect(page.locator('.connections-tile')).toHaveCount(16)
  for (const difficulty of ['medium', 'hard', 'easy']) {
    await setGameSetting(page, 'Difficulty', difficulty)
    await expect(page.locator('.connections-tile')).toHaveCount(16)
  }
  await setGameSetting(page, 'Country pool', 'extended')
  await expect(page.locator('.connections-tile')).toHaveCount(16)
  await setGameSetting(page, 'Country pool', 'standard')
  const countries = await countryData(page)
  const countryByCode = new Map(countries.map((country) => [country.iso3, country]))
  const tileNames = await page.locator('.connections-tile').allTextContents()
  const groups = solveConnectionsBoard(countries, tileNames)
  for (const [index, group] of groups.entries()) {
    for (const [tileIndex, code] of group.entries()) {
      const country = countryByCode.get(code)
      expect(country, `connection tile ${code}`).toBeDefined()
      const tile = page.getByRole('button', { name: country!.name, exact: true })
      if (index === 0 && tileIndex === 0) {
        await tile.focus()
        await page.keyboard.press('Enter')
      } else await tile.click()
    }
    await page.getByRole('button', { name: 'Check group' }).click()
    await expect(page.locator('.connections-solved-group')).toHaveCount(index + 1)
    await expect(page.locator('.connections-tile')).toHaveCount(12 - index * 4)
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toHaveText('4 / 4 correct · 100% accuracy')
  await expect(page.locator('.game-results-score')).toContainText('1,000')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/connections-results-desktop.png' })
  await page.getByRole('button', { name: 'Play another set' }).click()
  await expect(page.locator('.connections-tile')).toHaveCount(16)
  await expect(page.locator('.game-results-dialog')).toBeHidden()
})

test('Higher or Lower supports fixed and infinite keyboard practice', async ({ page }) => {
  await openGame(page, 'higher-lower')
  await page.clock.pauseAt(new Date('2026-11-17T12:00:00Z'))
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press(index % 2 ? 'ArrowRight' : 'ArrowLeft')
    if (index < 9) await expect(page.locator('.higher-lower-response')).toBeVisible()
    await expect(page.locator('.higher-lower-country.is-revealed .higher-lower-value')).toHaveCount(2)
    await expect(page.locator('.answer-feedback')).toHaveCount(0)
    if (index < 9) {
      await page.clock.runFor(1_250)
      await expect(page.locator('.question-count strong')).toHaveText(String(index + 2))
    }
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toContainText('/ 10 correct')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/higher-lower-results-desktop.png' })

  await page.getByRole('button', { name: 'Compare more countries' }).click()
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.getByLabel('Questions').selectOption('infinite')
  await page.keyboard.press('Escape')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.higher-lower-response')).toBeVisible()
  await page.clock.runFor(1_250)
  await expect(page.locator('.question-count strong')).toHaveText('2')
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
  await answerInput.fill(firstNeighbor.name)
  await page.locator('#neighbour-answer').press('Enter')
  await answerInput.fill(firstNeighbor.name)
  await page.locator('#neighbour-answer').press('Enter')
  await expect(page.locator('.neighbour-selected button')).toHaveCount(1)
  await expect(page.locator('.answer-feedback')).toContainText('already selected')
  await page.getByRole('button', { name: `Remove ${firstNeighbor.name}` }).click()

  await answerInput.fill(target!.name)
  await page.locator('#neighbour-answer').press('Enter')
  await expect(page.locator('.answer-feedback')).toContainText('target, so it cannot be')

  for (let index = 0; index < 5; index += 1) {
    const currentName = await page.locator('.neighbour-target strong').innerText()
    const current = countries.find((country) => country.name === currentName)
    expect(current).toBeDefined()
    const expected = countries.filter((country) => standardCodes.has(country.iso3) && country.iso3 !== current!.iso3 && (current!.borders.includes(country.iso3) || country.borders.includes(current!.iso3)))
    for (const neighbor of expected) {
      expect(neighbor, `neighbor ${neighbor.iso3} of ${current!.name}`).toBeDefined()
      await answerInput.fill(neighbor!.name)
      const option = page.locator('.suggestion-option').filter({ has: page.getByText(neighbor!.name, { exact: true }) }).first()
      await expect(option).toBeVisible()
      await option.click()
    }
    await page.getByRole('button', { name: 'Check neighbors' }).click()
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    if (index < 4) await page.getByRole('button', { name: 'Next country' }).click()
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toHaveText('5 / 5 correct · 100% accuracy')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/neighbours-results-desktop.png' })
  await page.getByRole('button', { name: 'Find more neighbours' }).click()
  const replayTargetName = await page.locator('.neighbour-target strong').innerText()
  const replayTarget = countries.find((country) => country.name === replayTargetName)
  expect(replayTarget).toBeDefined()
  const replayNeighbor = countries.find((country) => standardCodes.has(country.iso3) && country.iso3 !== replayTarget!.iso3 && (replayTarget!.borders.includes(country.iso3) || country.borders.includes(replayTarget!.iso3)))
  expect(replayNeighbor).toBeDefined()
  await page.locator('#neighbour-answer').fill(replayNeighbor!.name)
  await page.locator('#neighbour-answer').press('Enter')
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
    await page.getByRole('button', { name: 'Next comparison' }).click()
  }
  for (let index = 1; index < 10; index += 1) {
    await page.keyboard.press(index % 2 ? '2' : '1')
    await expect(page.locator('.answer-feedback')).not.toContainText('Use the coordinates and scale')
    if (index < 9) await page.getByRole('button', { name: 'Next comparison' }).click()
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-summary')).toContainText('/ 10 correct')
  await expect(page.locator('.game-results-message')).toContainText('Haversine')
  await page.screenshot({ path: 'artifacts/qa/product-consistency/distance-results-desktop.png' })
  await page.locator('.game-results-dialog').getByRole('link', { name: 'Statistics' }).click()
  await expect(page.locator('.history-result').first()).toContainText('/ 10 correct')
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
    const mapIndex = await mapFeatureIndex(page, neighbor!.iso3, standardCodes)
    expect(mapIndex).toBeGreaterThanOrEqual(0)
    const mapPoint = await mapPathPoint(page, '.neighbour-map .geo-map path[role="button"]', mapIndex)
    expect(mapPoint).not.toBeNull()
    await page.touchscreen.tap(mapPoint!.x, mapPoint!.y)
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
    const name = prompt.replace(/^What is the capital of /, '').replace(/\?$/, '')
    const country = countries.find((item) => item.name === name)
    expect(country?.capital).toBeTruthy()
    await submitText(page, '#capital-answer', country!.capital!)
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    await page.getByRole('button', { name: index === 9 ? 'See result' : 'Next place' }).click()
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()

  await page.getByRole('button', { name: 'New city round' }).click()
  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.getByLabel('Practice task').selectOption('locate')
  await expect(page.locator('.game-results-dialog')).toHaveCount(0)
  const cities = await cityData(page)
  let prompt = await page.locator('.question-toolbar h2').innerText()
  let cityStart = prompt.indexOf('Place ') + 'Place '.length
  let cityEnd = prompt.lastIndexOf(' on the map.')
  let placeText = prompt.slice(cityStart, cityEnd)
  let separator = placeText.lastIndexOf(', ')
  let cityName = placeText.slice(0, separator)
  let countryName = placeText.slice(separator + 2)
  let cityCountry = countries.find((item) => item.name === countryName)
  let population = (await page.locator('.question-toolbar p').innerText()).match(/population ([\d,]+)/)?.[1]
  let city = cities.find((item) => item.name === cityName && item.countryIso3 === cityCountry?.iso3 && (!population || item.population === Number(population.replaceAll(',', ''))))
  expect(city).toBeTruthy()
  await page.getByLabel('Latitude').fill(city!.lat.toFixed(2))
  await page.getByLabel('Longitude').fill(city!.lon.toFixed(2))
  await page.getByRole('button', { name: 'Place marker' }).click()
  await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
  await page.getByRole('button', { name: 'Next place' }).click()

  await page.getByRole('button', { name: 'Game settings' }).click()
  await page.getByLabel('Practice task').selectOption('identify')
  prompt = await page.locator('.question-toolbar h2').innerText()
  countryName = prompt.replace(/^Which city is marked in /, '').replace(/\?$/, '')
  cityCountry = countries.find((item) => item.name === countryName)
  expect(cityCountry).toBeTruthy()
  const candidate = cities.find((item) => item.countryIso3 === cityCountry?.iso3 && (item.population >= 50_000 || item.capital))
  expect(candidate).toBeTruthy()
  const cityInput = page.locator('#city-identify-answer')
  await cityInput.fill(candidate!.name)
  await expect(page.getByRole('option', { name: new RegExp(candidate!.name) }).first()).toBeVisible()
  await page.getByRole('option', { name: new RegExp(candidate!.name) }).first().click()
  await page.getByRole('button', { name: 'Identify' }).click()
  await expect(page.locator('.answer-feedback')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next place' })).toBeVisible()
})

test('settings exports and imports progress, confirms reset, and the data page shows coverage', async ({ page }) => {
  await page.goto('/settings')

  await page.locator('.theme-option').filter({ hasText: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('maproom-theme'))).toBe('dark')
  await page.reload()
  await expect(page.locator('.theme-option input[value="dark"]')).toBeChecked()
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.locator('.theme-option').filter({ hasText: 'System' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('maproom-theme'))).toBe('system')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('.theme-option input[value="system"]')).toBeChecked()
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
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset saved data' }).click()
  await expect(page.getByText('Saved data has been reset.')).toBeVisible()
  await expect(page.locator('.theme-option input[value="light"]')).toBeChecked()

  await page.goto('/data')
  await expect(page.getByRole('heading', { name: 'Data sources' })).toBeVisible()
  await expect(page.locator('.coverage-summary')).toContainText('198')
  await expect(page.getByRole('heading', { name: 'First-level divisions by country' })).toBeVisible()
  await expect(page.locator('.coverage-row')).toHaveCount(198)
  await page.getByLabel('Search country boundary coverage').fill('Sweden')
  await expect(page.locator('.coverage-row')).toHaveCount(1)
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
  await page.context().setOffline(true)
  await page.goto('/explore')
  await expect(page.getByRole('heading', { name: 'Explore' })).toBeVisible()
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(10)
})
