import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const outputDirectory = 'artifacts/qa/geometry-regressions'
const targetCodes = ['AIA', 'NLD', 'BES', 'IDN', 'JPN', 'PHL', 'CLP', 'ATC', 'CSI', 'ESB', 'WSB']
const minimumComponentsByTarget: Record<string, number> = {
  AIA: 6,
  NLD: 5,
  BES: 3,
  IDN: 100,
  JPN: 50,
  PHL: 50,
  CLP: 1,
  ATC: 1,
  CSI: 1,
  ESB: 1,
  WSB: 1,
}

test.beforeAll(() => mkdirSync(outputDirectory, { recursive: true }))

interface CountryRecord {
  iso3: string
  name: string
  hasGeometry: boolean
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function shuffle<T>(values: readonly T[], seed: string): T[] {
  let state = hashSeed(seed)
  const random = () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[result[index], result[other]] = [result[other]!, result[index]!]
  }
  return result
}

function seedForTarget(countries: CountryRecord[], targetCode: string): string {
  const eligible = countries.filter((country) => country.hasGeometry)
  for (let index = 0; index < 100_000; index += 1) {
    const seed = `geometry-regression-${targetCode}-${index}`
    if (shuffle(eligible, `${seed}:outline:World:0`)[0]?.iso3 === targetCode) return seed
  }
  throw new Error(`Could not find an outline seed for ${targetCode}`)
}

async function installSeededOutlineSession(page: Page, targetCode: string, seed: string) {
  const date = await page.evaluate(() => {
    const values = new Intl.DateTimeFormat('en', {
      timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const part = (type: Intl.DateTimeFormatPartTypes) => values.find((item) => item.type === type)?.value ?? '00'
    return `${part('year')}-${part('month')}-${part('day')}`
  })
  const now = new Date().toISOString()
  await page.evaluate(({ dateValue, seedValue }) => {
    const current = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<Record<string, unknown>>
    current.push({
      id: `outlines:${dateValue}:${seedValue}`,
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
    localStorage.setItem('maproom-sessions-v1', JSON.stringify(current))
  }, { dateValue: date, seedValue: seed })
  expect(targetCode).toMatch(/^[A-Z]{3}$/)
  expect(now).toMatch(/^\d{4}-\d\d-\d\dT/)
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  const current = await page.locator('html').getAttribute('data-theme')
  if (current === theme) return
  const label = theme === 'dark' ? 'Switch to dark appearance' : 'Switch to light appearance'
  await page.getByRole('button', { name: label }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

function contrastRatio(first: string, second: string): number {
  const luminance = (color: string) => {
    const channels = color.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number)
    if (!channels || channels.length !== 3) throw new Error(`Unexpected computed color: ${color}`)
    const [red, green, blue] = channels.map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
  }
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0]! + 0.05) / (values[1]! + 0.05)
}

test('renders detailed separated territory and archipelago outlines in both themes and zooms', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/settings')
  await page.getByLabel('Default country catalogue').selectOption('extended')
  await setTheme(page, 'light')

  const catalogResponse = await page.request.get(new URL('/data/countries.json', page.url()).toString())
  expect(catalogResponse.ok()).toBe(true)
  const countries = (await catalogResponse.json()).countries as CountryRecord[]

  for (const targetCode of targetCodes) {
    const seed = seedForTarget(countries, targetCode)
    await installSeededOutlineSession(page, targetCode, seed)
    await page.goto('/games/outlines?mode=freeplay')
    await page.getByRole('button', { name: 'Start Free play' }).click()
    await expect(page.locator('.outline-map-stage .geo-map path')).toHaveCount(1, { timeout: 30_000 })
    const silhouette = page.locator('.outline-map-stage .geo-map path').first()
    const pathData = await silhouette.getAttribute('d')
    expect(pathData).toMatch(/^M/)
    expect(pathData).not.toMatch(/NaN|Infinity/)
    const moveCount = pathData?.match(/M/g)?.length ?? 0
    const minimumComponents = minimumComponentsByTarget[targetCode] ?? 1
    expect(moveCount, `${targetCode} disconnected components remain separate`).toBeGreaterThanOrEqual(minimumComponents)

    const lightColors = await page.locator('.outline-map-stage').evaluate((stage) => ({
      water: getComputedStyle(stage.querySelector('.map-water')!).fill,
      shape: getComputedStyle(stage.querySelector('.map-country')!).fill,
    }))
    expect(contrastRatio(lightColors.shape, lightColors.water)).toBeGreaterThan(3)
    await page.screenshot({ path: `${outputDirectory}/outline-${targetCode.toLowerCase()}-light.png` })

    await setTheme(page, 'dark')
    await page.waitForTimeout(350)
    const darkColors = await page.locator('.outline-map-stage').evaluate((stage) => ({
      water: getComputedStyle(stage.querySelector('.map-water')!).fill,
      shape: getComputedStyle(stage.querySelector('.map-country')!).fill,
    }))
    expect(darkColors.water).not.toBe(lightColors.water)
    expect(contrastRatio(darkColors.shape, darkColors.water)).toBeGreaterThan(3)
    await page.screenshot({ path: `${outputDirectory}/outline-${targetCode.toLowerCase()}-dark.png` })

    if (targetCode === 'AIA') {
      const mapLayer = page.locator('.outline-map-stage .geo-map > g').first()
      const beforeZoom = await mapLayer.getAttribute('transform')
      await page.getByRole('button', { name: 'Zoom in' }).click()
      await expect(mapLayer).not.toHaveAttribute('transform', beforeZoom ?? '')
      expect(await silhouette.getAttribute('d')).toBe(pathData)
      await page.screenshot({ path: `${outputDirectory}/outline-anguilla-dark-zoom.png` })
      await page.getByRole('button', { name: 'Reset map view' }).click()
    }
    await setTheme(page, 'light')
  }
})

test('autocomplete Enter accepts a suggestion before it can submit the guess', async ({ page }) => {
  await page.goto('/games/outlines?mode=freeplay')
  await page.getByRole('button', { name: 'Start Free play' }).click()
  await expect(page.locator('.outline-map-stage .geo-map path')).toHaveCount(1, { timeout: 30_000 })
  const input = page.locator('#outline-answer')

  await input.fill('zzzxqv')
  await input.press('Enter')
  await expect(page.locator('.answer-feedback')).toContainText('Choose a place from the suggestions.')
  await expect(page.locator('.guess-list span')).toHaveCount(0)

  await input.fill('Tong')
  await expect(page.getByRole('option')).toHaveCount(1)
  await input.press('Enter')
  await expect(input).toHaveValue('Tonga')
  await expect(page.getByRole('option')).toHaveCount(0)
  await expect(input).toBeFocused()
  await expect(page.locator('.guess-list span')).toHaveCount(0)
  await expect(page.locator('.game-results-dialog')).toHaveCount(0)

  await input.press('Enter')
  await expect.poll(async () => {
    const guesses = await page.locator('.guess-list span').count()
    const complete = await page.locator('.game-results-dialog').isVisible().catch(() => false)
    return guesses + Number(complete)
  }).toBe(1)
})

test('country outline hints state the guessed country position relative to the answer', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel('Default country catalogue').selectOption('extended')
  const catalogResponse = await page.request.get(new URL('/data/countries.json', page.url()).toString())
  const countries = (await catalogResponse.json()).countries as CountryRecord[]
  const seed = seedForTarget(countries, 'USA')
  await installSeededOutlineSession(page, 'USA', seed)
  await page.goto('/games/outlines?mode=freeplay')
  await page.getByRole('button', { name: 'Start Free play' }).click()
  await expect(page.locator('.outline-map-stage .geo-map path')).toHaveCount(1, { timeout: 30_000 })

  const input = page.locator('#outline-answer')
  await input.fill('Turkmenistan')
  await expect(page.getByRole('option')).toHaveCount(1)
  await input.press('Enter')
  await expect(input).toHaveValue('Turkmenistan')
  await expect(page.locator('.guess-list span')).toHaveCount(0)
  await input.press('Enter')
  await expect(page.locator('.answer-feedback')).toContainText('Turkmenistan is east of the answer')
})
