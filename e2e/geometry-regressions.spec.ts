import { mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import type { Country, GeoFeature } from '../src/geography/types'
import { loadTopologyFeatures } from './topology'
import { directionFromTo } from '../src/puzzles/engine'
import {
  advanceOutlineSequence,
  buildOutlineCandidateGroups,
  EMPTY_OUTLINE_PROGRESS,
  outlineQuestionAt,
  type OutlineDifficulty,
  type OutlinePoolMode,
} from '../src/games/outlines/questionPool'

const outputDirectory = 'artifacts/qa/geography-overhaul/browser'
const themeColors = { light: 'rgb(229, 121, 55)' }
const scenarios = [
  { code: 'NLD', pool: 'standard', difficulty: 'medium', scope: 'Europe', minimumMoves: 5 },
  { code: 'IDN', pool: 'standard', difficulty: 'easy', scope: 'World', minimumMoves: 100 },
  { code: 'JPN', pool: 'standard', difficulty: 'easy', scope: 'World', minimumMoves: 50 },
  { code: 'PHL', pool: 'standard', difficulty: 'easy', scope: 'World', minimumMoves: 50 },
  { code: 'USA', pool: 'standard', difficulty: 'easy', scope: 'World', minimumMoves: 100 },
  { code: 'RUS', pool: 'standard', difficulty: 'easy', scope: 'World', minimumMoves: 1 },
  { code: 'NZL', pool: 'standard', difficulty: 'easy', scope: 'World', minimumMoves: 10 },
  { code: 'GRL', pool: 'extended', difficulty: 'easy', scope: 'World', minimumMoves: 100 },
  { code: 'BHR', pool: 'standard', difficulty: 'hard', scope: 'World', minimumMoves: 1 },
  { code: 'NCL', pool: 'territories', difficulty: 'hard', scope: 'World', minimumMoves: 1 },
] as const

test.beforeAll(() => mkdirSync(outputDirectory, { recursive: true }))

interface OutlineFixture {
  countries: Country[]
  featuresByCode: Map<string, GeoFeature[]>
}

async function loadFixture(page: Page): Promise<OutlineFixture> {
  const countryResponse = await page.request.get(new URL('/data/countries.json', page.url()).toString())
  expect(countryResponse.ok()).toBe(true)
  const countries = (await countryResponse.json()).countries as Country[]
  const features = await loadTopologyFeatures(page, '/data/countries-outline.topo.json')
  const featuresByCode = new Map<string, GeoFeature[]>()
  for (const feature of features) {
    const code = feature.properties.iso3
    if (!code) continue
    const list = featuresByCode.get(code) ?? []
    list.push(feature)
    featuresByCode.set(code, list)
  }
  return { countries, featuresByCode }
}

function groupsFor(fixture: OutlineFixture, pool: OutlinePoolMode, difficulty: OutlineDifficulty, scope: string) {
  return buildOutlineCandidateGroups(fixture.countries, fixture.featuresByCode, { pool, difficulty, scope })
}

function seedForTarget(fixture: OutlineFixture, targetCode: string, pool: OutlinePoolMode, difficulty: OutlineDifficulty, scope: string): string {
  const groups = groupsFor(fixture, pool, difficulty, scope)
  const poolKey = `country:${pool}:${scope}:${difficulty}`
  for (let index = 0; index < 20_000; index += 1) {
    const seed = `browser-outline-${targetCode}-${pool}-${difficulty}-${scope}-${index}`
    if (outlineQuestionAt(groups, `${seed}:${poolKey}`)?.code === targetCode) return seed
  }
  throw new Error(`${targetCode} is not an eligible ${pool} ${difficulty} outline in ${scope}`)
}

async function installFreeplaySeed(page: Page, seed: string) {
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
}

async function startFreeplay(page: Page, fixture: OutlineFixture, options: {
  code?: string
  seed?: string
  pool: OutlinePoolMode
  difficulty: OutlineDifficulty
  scope?: string
}) {
  const scope = options.scope ?? 'World'
  const seed = options.seed ?? (options.code ? seedForTarget(fixture, options.code, options.pool, options.difficulty, scope) : `browser-outline-seed:${options.pool}:${options.difficulty}:${scope}`)
  await installFreeplaySeed(page, seed)
  await page.goto('/games/outlines?mode=freeplay')
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible({ timeout: 30_000 })
  const setup = page.getByRole('dialog')
  // Apply difficulty before switching pools: Territory Focus has no Medium silhouettes.
  await setup.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: new RegExp(options.difficulty, 'i') }).click()
  await setup.getByRole('combobox', { name: 'Geographic scope' }).selectOption(scope)
  const advanced = setup.locator('.game-setup-advanced')
  if (!await advanced.evaluate((element) => (element as HTMLDetailsElement).open)) await advanced.locator('summary').click()
  const poolLabel = options.pool === 'standard' ? 'Standard · eligible countries' : options.pool === 'extended' ? 'Extended · balanced territories' : 'Territory focus'
  await setup.getByRole('group', { name: 'Outline pool' }).getByRole('button', { name: poolLabel }).click()
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.outline-map-stage .geo-map path')).not.toHaveCount(0, { timeout: 30_000 })
  return { seed, scope, groups: groupsFor(fixture, options.pool, options.difficulty, scope) }
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

async function answerCorrectly(page: Page, country: Country) {
  const input = page.locator('#outline-answer')
  await input.fill(country.name)
  const exactSuggestion = page.locator('#outline-answer-suggestions .suggestion-option')
    .filter({ has: page.getByText(country.name, { exact: true }) })
  await expect(exactSuggestion).toHaveCount(1)
  await expect(exactSuggestion).toBeVisible()
  await input.press('Enter')
  await expect(input).toHaveValue(country.name)
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  await input.press('Enter')
  await expect(page.locator('.answer-feedback')).toContainText(`That’s ${country.name}.`)
}

test('renders the entire Cyprus island as one outline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/settings')
  await setTheme(page, 'light')
  const fixture = await loadFixture(page)
  const { seed, groups } = await startFreeplay(page, fixture, {
    code: 'CYP', pool: 'standard', difficulty: 'medium', scope: 'World',
  })
  expect(outlineQuestionAt(groups, `${seed}:country:standard:World:medium`)?.code).toBe('CYP')
  const path = page.locator('.outline-map-stage .geo-map path')
  await expect(path).toHaveCount(1)
  const shape = await path.getAttribute('d')
  expect(shape).not.toMatch(/NaN|Infinity|undefined/)
  await page.screenshot({ path: `${outputDirectory}/outline-cyprus-whole-island.png` })
})

test('plays curated silhouettes across difficulties, territories, islands, and the Date Line', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/settings')
  await setTheme(page, 'light')
  const fixture = await loadFixture(page)

  for (const scenario of scenarios) {
    const { groups } = await startFreeplay(page, fixture, scenario)
    expect([...groups.standard, ...groups.extended].some((candidate) => candidate.code === scenario.code)).toBe(true)
    const paths = page.locator('.outline-map-stage .geo-map path')
    const expectedFeatures = fixture.featuresByCode.get(scenario.code)!.length
    await expect(paths).toHaveCount(expectedFeatures)
    const geometry = await paths.evaluateAll((items) => items.map((item) => {
      const bounds = (item as SVGPathElement).getBBox()
      return { path: item.getAttribute('d') ?? '', x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    }))
    expect(geometry.map((item) => item.path).join('')).not.toMatch(/NaN|Infinity|undefined/)
    expect(geometry.filter((item) => item.path.match(/M/g)?.length ?? 0).reduce((sum, item) => sum + (item.path.match(/M/g)?.length ?? 0), 0)).toBeGreaterThanOrEqual(scenario.minimumMoves)
    expect(geometry.every((item) => item.x >= 0 && item.y >= 0 && item.x + item.width <= 960 && item.y + item.height <= 480)).toBe(true)

    await page.mouse.move(0, 0)
    await expect.poll(() => page.locator('.outline-map-stage .map-country').first().evaluate((shape) => getComputedStyle(shape).fill)).toBe(themeColors.light)
    const colors = await page.locator('.outline-map-stage').evaluate((stage) => ({
      water: getComputedStyle(stage.querySelector('.map-water')!).fill,
      shape: getComputedStyle(stage.querySelector('.map-country')!).fill,
    }))
    expect(colors.shape).toBe(themeColors.light)
    expect(contrastRatio(colors.shape, colors.water)).toBeGreaterThan(3)
    const screenshotName = `outline-${scenario.code.toLowerCase()}-${scenario.difficulty}-${scenario.pool}-light.png`
    await page.screenshot({ path: `${outputDirectory}/${screenshotName}` })

    if (['NLD', 'USA'].includes(scenario.code)) {
      await setTheme(page, 'dark')
      await expect.poll(() => page.locator('.outline-map-stage .map-country').first().evaluate((shape) => getComputedStyle(shape).fill))
        .toMatch(/^rgb\(242, 15[0-9], 9[0-9]\)$/)
      const darkColors = await page.locator('.outline-map-stage').evaluate((stage) => ({
        water: getComputedStyle(stage.querySelector('.map-water')!).fill,
        shape: getComputedStyle(stage.querySelector('.map-country')!).fill,
      }))
      expect(darkColors.shape).toMatch(/^rgb\(242, 15[0-9], 9[0-9]\)$/)
      expect(contrastRatio(darkColors.shape, darkColors.water)).toBeGreaterThan(3)
      await page.screenshot({ path: `${outputDirectory}/outline-${scenario.code.toLowerCase()}-${scenario.difficulty}-${scenario.pool}-dark.png` })
      await setTheme(page, 'light')
    }

    if (scenario.code === 'IDN') {
      const mapLayer = page.locator('.outline-map-stage .geo-map > g').first()
      const beforeZoom = await mapLayer.getAttribute('transform')
      await page.getByRole('button', { name: 'Zoom in' }).click()
      await expect(mapLayer).not.toHaveAttribute('transform', beforeZoom ?? '')
      await page.screenshot({ path: `${outputDirectory}/outline-idn-zoom.png` })
      await page.getByRole('button', { name: 'Reset map view' }).click()
    }

    await answerCorrectly(page, fixture.countries.find((country) => country.iso3 === scenario.code)!)
    await expect(page.getByRole('button', { name: 'Next outline' })).toBeVisible()
    await page.goto('/settings')
    await setTheme(page, 'light')
  }

  await page.setViewportSize({ width: 390, height: 844 })
  const mobile = await startFreeplay(page, fixture, { code: 'NZL', pool: 'standard', difficulty: 'easy' })
  expect(outlineQuestionAt(mobile.groups, `${mobile.seed}:country:standard:World:easy`)?.code).toBe('NZL')
  const stage = page.locator('.outline-map-stage')
  await expect(stage).toBeVisible()
  const box = await stage.boundingBox()
  expect(box?.width).toBeLessThanOrEqual(390)
  expect(box?.width).toBeGreaterThan(300)
  await page.screenshot({ path: `${outputDirectory}/outline-nzl-mobile-light.png` })
})

test('completes ten Standard rounds without repeats before pool exhaustion', async ({ page }) => {
  await page.goto('/settings')
  const fixture = await loadFixture(page)
  const seed = 'browser-standard-ten-round-deck'
  const { groups } = await startFreeplay(page, fixture, { seed, pool: 'standard', difficulty: 'easy' })
  const expected: string[] = []
  let progress = EMPTY_OUTLINE_PROGRESS
  for (let index = 0; index < 10; index += 1) {
    const question = outlineQuestionAt(groups, `${seed}:country:standard:World:easy`, progress)!
    expected.push(question.code)
    progress = advanceOutlineSequence(progress, question.code)
  }
  expect(new Set(expected).size).toBe(10)

  for (const [index, code] of expected.entries()) {
    await answerCorrectly(page, fixture.countries.find((country) => country.iso3 === code)!)
    if (index < expected.length - 1) {
      await page.getByRole('button', { name: 'Next outline' }).click()
      await expect(page.locator('.outline-map-stage .geo-map path')).not.toHaveCount(0)
    }
  }
  await expect(page.getByRole('heading', { name: 'Outline solved.' })).toBeVisible()
})

test('balances ten Extended Hard rounds and exposes a path out of empty regional pools', async ({ page }) => {
  await page.goto('/settings')
  const fixture = await loadFixture(page)
  const seed = 'browser-extended-hard-ten-round-deck'
  const { groups } = await startFreeplay(page, fixture, { seed, pool: 'extended', difficulty: 'hard' })
  const standardCodes = new Set(groups.standard.map((candidate) => candidate.code))
  const expected: string[] = []
  let progress = EMPTY_OUTLINE_PROGRESS
  for (let index = 0; index < 10; index += 1) {
    const question = outlineQuestionAt(groups, `${seed}:country:extended:World:hard`, progress)!
    expected.push(question.code)
    progress = advanceOutlineSequence(progress, question.code)
  }
  expect(new Set(expected).size).toBe(10)
  expect(expected.filter((code) => !standardCodes.has(code)).length).toBeLessThanOrEqual(3)
  expect(expected).not.toContain('GGY')

  for (const [index, code] of expected.entries()) {
    await answerCorrectly(page, fixture.countries.find((country) => country.iso3 === code)!)
    if (index < expected.length - 1) await page.getByRole('button', { name: 'Next outline' }).click()
  }

  await page.goto('/settings')
  await page.goto('/games/outlines?mode=freeplay')
  await expect(page.getByRole('button', { name: 'Start free play' })).toBeVisible({ timeout: 30_000 })
  const setup = page.getByRole('dialog')
  await setup.getByRole('combobox', { name: 'Geographic scope' }).selectOption('Europe')
  await setup.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: /Hard/ }).click()
  let advanced = setup.locator('.game-setup-advanced')
  if (!await advanced.evaluate((element) => (element as HTMLDetailsElement).open)) await advanced.locator('summary').click()
  await setup.getByRole('group', { name: 'Outline pool' }).getByRole('button', { name: 'Standard · eligible countries' }).click()
  await expect(setup.locator('[role="status"]')).toContainText('This selection has no fair silhouettes')
  await setup.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: /Medium/ }).click()
  advanced = setup.locator('.game-setup-advanced')
  if (!await advanced.evaluate((element) => (element as HTMLDetailsElement).open)) await advanced.locator('summary').click()
  await setup.getByRole('group', { name: 'Outline pool' }).getByRole('button', { name: 'Extended · balanced territories' }).click()
  await setup.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: /Hard/ }).click()
  await expect(page.locator('.practice-config-note').first()).toContainText('3 suitable silhouettes')
  await page.getByRole('button', { name: 'Start free play' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.outline-map-stage .geo-map path')).not.toHaveCount(0)

  for (const microstate of ['Guernsey', 'San Marino', 'Monaco', 'Vatican City']) {
    const input = page.locator('#outline-answer')
    await input.fill(microstate)
    await expect(page.getByRole('option')).toHaveCount(0)
  }
})

test('autocomplete Enter accepts before submit and target-relative direction hints remain correct', async ({ page }) => {
  await page.goto('/settings')
  const fixture = await loadFixture(page)
  await startFreeplay(page, fixture, { code: 'NLD', pool: 'standard', difficulty: 'medium' })
  const input = page.locator('#outline-answer')

  await input.fill('zzzxqv')
  await input.press('Enter')
  await expect(page.locator('.answer-feedback')).toContainText('Choose a place from the suggestions.')
  await expect(page.locator('.guess-list span')).toHaveCount(0)

  await input.fill('Nige')
  await expect(page.getByRole('option')).toHaveCount(1)
  await input.press('Enter')
  await expect(input).toHaveValue('Niger')
  await expect(page.getByRole('option')).toHaveCount(0)
  await expect(page.locator('.guess-list span')).toHaveCount(0)
  await expect(page.locator('.game-results-dialog')).toHaveCount(0)
  await input.press('Enter')
  await expect(page.locator('.answer-feedback')).toContainText('Niger is south of the answer')

  await page.goto('/settings')
  const usa = fixture.countries.find((country) => country.iso3 === 'USA')!
  if (!usa.coordinates) throw new Error('USA must have a catalogue center')
  const eastGuess = groupsFor(fixture, 'standard', 'easy', 'World').standard.find((candidate) => candidate.country.coordinates && directionFromTo(usa.coordinates!, candidate.country.coordinates) === 'east')
  if (!eastGuess) throw new Error('The Standard Easy pool needs an eastern comparison guess for the USA')
  await startFreeplay(page, fixture, { code: 'USA', pool: 'standard', difficulty: 'easy' })
  const usaGuess = page.locator('#outline-answer')
  await usaGuess.fill(eastGuess.country.name)
  await expect(page.getByRole('option')).toHaveCount(1)
  await usaGuess.press('Enter')
  await usaGuess.press('Enter')
  await expect(page.locator('.answer-feedback')).toContainText(`${eastGuess.country.name} is east of the answer`)
})

test('restores an in-progress v2 daily silhouette and writes progress under v3', async ({ page }) => {
  await page.goto('/settings')
  const date = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '00'
    return `${part('year')}-${part('month')}-${part('day')}`
  })
  const oldSession = {
    id: `outlines:${date}`,
    gameId: 'outlines',
    mode: 'daily',
    puzzleId: `outlines:${date}:v2`,
    seed: `outlines:${date}:v2`,
    date,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    payload: { targetCode: 'SMR', attempts: ['MCO'], input: 'San', message: '', finished: false, solved: false, score: 0 },
  }
  await page.evaluate((session) => localStorage.setItem('maproom-sessions-v1', JSON.stringify([session])), oldSession)
  await page.reload()
  await page.goto('/games/outlines?mode=daily')
  await expect(page.locator('.outline-map-stage .geo-map path')).toHaveCount(1, { timeout: 30_000 })
  await expect(page.locator('#outline-answer')).toHaveValue('San')
  await expect(page.locator('.guess-list span')).toContainText('Monaco')
  await expect.poll(() => page.evaluate((dateValue) => {
    const sessions = JSON.parse(localStorage.getItem('maproom-sessions-v1') ?? '[]') as Array<{ puzzleId?: string; payload?: { targetCode?: string } }>
    return sessions.find((session) => session.puzzleId === `outlines:${dateValue}:v3`)?.payload?.targetCode
  }, date)).toBe('SMR')
})
