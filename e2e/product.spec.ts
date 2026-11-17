import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

test.beforeAll(() => mkdirSync('artifacts/qa/product-consistency', { recursive: true }))

interface CountryRecord {
  iso3: string
  name: string
  continent: string | null
  landlocked: boolean
  population: number | null
  areaKm2: number | null
  capital: string | null
}

interface CityRecord {
  id: string
  name: string
  countryIso3: string
  population: number
  lat: number
  lon: number
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
  await page.getByLabel(label).selectOption(value)
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
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()

  await page.goto('/explore')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(6)
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
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(1)
  await expect(page.locator('.explore-grid .game-card')).toContainText('Capitals & cities')

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
  for (const route of ['/', '/explore', '/settings', '/data', '/games/countries?mode=daily', '/games/grid?mode=daily']) {
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

test('border route accepts an actual shortest path and scores it', async ({ page }) => {
  await openGame(page, 'routes')
  await expect(page.locator('.route-map-legend')).toContainText('Start')
  await expect(page.locator('.route-map-legend')).toContainText('Finish')
  await expect(page.locator('.route-map-legend')).toContainText('Route')
  await page.getByRole('button', { name: 'Hint' }).click()
  const shortestRoute = (await page.locator('.route-hint strong').innerText()).split(' → ')
  expect(shortestRoute.length).toBeGreaterThanOrEqual(3)
  expect(shortestRoute.length).toBeLessThanOrEqual(6)
  for (let index = 1; index < shortestRoute.length; index += 1) {
    await submitText(page, '#route-country', shortestRoute[index])
    if (index < shortestRoute.length - 1) await expect(page.locator('.route-stops li')).toHaveCount(index + 2)
  }
  await expect(page.locator('.game-results-dialog')).toBeVisible()
  await expect(page.locator('.game-results-dialog h2')).toContainText('shortest')
})

test('flag identification answers each locally bundled flag and completes practice', async ({ page }) => {
  await openGame(page, 'flags')
  const navigationBeforeRound = await shellGeometry(page)
  for (let index = 0; index < 10; index += 1) {
    const label = await page.locator('.flag-display [role="img"]').getAttribute('aria-label')
    const answer = (label ?? '').replace(/^Flag of /, '')
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
    const flagLabel = await page.locator('.flag-display [role="img"]').getAttribute('aria-label')
    const country = (flagLabel ?? '').replace(/^Flag of /, '')
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
  await page.reload()
  await expect(page.locator('.flag-display [role="img"]')).toHaveAttribute('aria-label', initialFlag ?? '')
  const answer = (initialFlag ?? '').replace(/^Flag of /, '')
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
  const flagLabel = await page.locator('.flag-display [role="img"]').getAttribute('aria-label')
  const answer = (flagLabel ?? '').replace(/^Flag of /, '')
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
  const refreshedFlag = await page.locator('.flag-display [role="img"]').getAttribute('aria-label')
  const countries = await countryData(page)
  expect(countries.find((country) => country.name === refreshedFlag?.replace(/^Flag of /, ''))?.continent).toBe('Europe')
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
  const europeanNames = new Set((await countryData(page)).filter((country) => country.continent === 'Europe').map((country) => country.name))
  expect(europeanNames.has(answerCountry)).toBe(true)
  const correctFlag = page.getByRole('button', { name: `Flag of ${answerCountry}` })
  await correctFlag.click()
  await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
  await expect(page.locator('.flag-progress')).toHaveText('02 / 10', { timeout: 5_000 })

  const nextPrompt = await page.locator('.flag-question-row h1').innerText()
  const nextCountry = nextPrompt.replace(/^Which flag belongs to /, '').replace(/\?$/, '')
  const answerOptions = page.locator('.flag-choice')
  let wrongIndex = -1
  for (let index = 0; index < await answerOptions.count(); index += 1) {
    if (await answerOptions.nth(index).getAttribute('aria-label') !== `Flag of ${nextCountry}`) {
      wrongIndex = index
      break
    }
  }
  expect(wrongIndex).toBeGreaterThanOrEqual(0)
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

  const typedAnswer = (await page.locator('.flag-display [role="img"]').getAttribute('aria-label') ?? '').replace(/^Flag of /, '')
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
    await page.getByRole('button', { name: `Flag of ${answer}` }).tap()
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
  const countries = await countryData(page)
  const rows = await page.locator('.grid-row-label').allTextContents()
  const columns = await page.locator('.grid-column-label').allTextContents()
  expect(rows).toHaveLength(3)
  expect(columns).toHaveLength(3)

  function matches(category: string, country: CountryRecord): boolean {
    if (category === 'Landlocked') return country.landlocked
    if (category === 'Has a coastline') return !country.landlocked
    if (category.startsWith('Population over ')) {
      const millions = Number(category.match(/[\d.]+/)?.[0])
      return (country.population ?? 0) >= millions * 1_000_000
    }
    if (category.startsWith('Area over ')) {
      const area = Number(category.match(/[\d,]+/)?.[0].replaceAll(',', ''))
      return (country.areaKm2 ?? 0) >= area
    }
    return country.continent === category
  }

  const cells = rows.flatMap((row, rowIndex) => columns.map((column, columnIndex) => ({
    key: `${rowIndex}:${columnIndex}`,
    candidates: countries.filter((country) => matches(row, country) && matches(column, country)).sort((left, right) => left.name.localeCompare(right.name)),
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
  await page.goto('/explore')
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(6)
  await page.screenshot({ path: 'artifacts/qa/product-consistency/explore-desktop.png', fullPage: true })

  for (const [route, name] of [['/statistics', 'statistics'], ['/settings', 'settings'], ['/data', 'data'], ['/about', 'about'], ['/privacy', 'privacy']] as const) {
    await page.goto(route)
    await expect(page.locator('main h1').first()).toBeVisible()
    await page.screenshot({ path: `artifacts/qa/product-consistency/${name}-desktop.png`, fullPage: true })
  }

  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities']) {
    await openGame(page, id, 'daily')
    await page.screenshot({ path: `artifacts/qa/product-consistency/game-${id}-desktop.png` })
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities']) {
    await openGame(page, id, 'daily')
    await page.screenshot({ path: `artifacts/qa/product-consistency/game-${id}-laptop.png` })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${id} laptop width overflow`).toBeLessThanOrEqual(0)
  }

  await page.setViewportSize({ width: 1024, height: 768 })
  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities']) {
    await openGame(page, id, 'daily')
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
  for (const id of ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities']) {
    await openGame(page, id, 'daily')
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

test('capitals and cities include typed capitals, coordinate placement and city identification', async ({ page }) => {
  await openGame(page, 'cities')
  const countries = await countryData(page)
  for (let index = 0; index < 8; index += 1) {
    const prompt = await page.locator('.question-toolbar h2').innerText()
    const name = prompt.replace(/^What is the capital of /, '').replace(/\?$/, '')
    const country = countries.find((item) => item.name === name)
    expect(country?.capital).toBeTruthy()
    await submitText(page, '#capital-answer', country!.capital!)
    await expect(page.locator('.answer-feedback.is-correct')).toBeVisible()
    await page.getByRole('button', { name: index === 7 ? 'See result' : 'Next place' }).click()
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
  const candidate = cities.find((item) => item.countryIso3 === cityCountry?.iso3)
  expect(candidate).toBeTruthy()
  await submitText(page, '#city-identify-answer', candidate!.name)
  await expect(page.locator('.answer-feedback')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next place' })).toBeVisible()
})

test('settings exports and imports progress, confirms reset, and the data page shows coverage', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel(/Puzzle time zone/).selectOption('UTC')
  await expect(page.getByText('Current setting: UTC')).toBeVisible()
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
  await expect(page.getByText('Current setting: Europe/London')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset all progress' }).click()
  await expect(page.getByText('Your local progress has been cleared.')).toBeVisible()

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
  await expect(page.locator('.explore-grid .game-card')).toHaveCount(6)
})
