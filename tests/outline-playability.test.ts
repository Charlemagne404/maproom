import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { geoCentroid, geoEqualEarth, geoPath } from 'd3-geo'
import type { Country, GeoFeature } from '../src/geography/types'
import { classifyGeography } from '../src/geography/eligibility'
import { SPECIAL_GEOGRAPHIC_CODES, STANDARD_CODES } from '../src/geography/catalogue-rules.mjs'
import {
  EASY_OUTLINE_CODES,
  EXCLUDED_OUTLINE_RULES,
  HARD_OUTLINE_CODES,
  REVIEWED_OUTLINE_CODES,
  outlinePlayabilitySummary,
  outlineRuleFor,
} from '../src/games/outlines/playability.mjs'
import {
  advanceOutlineSequence,
  buildOutlineCandidateGroups,
  EMPTY_OUTLINE_PROGRESS,
  outlinePoolSize,
  outlineQuestionAt,
  type OutlineDifficulty,
  type OutlinePoolMode,
} from '../src/games/outlines/questionPool'

const dataDir = join(process.cwd(), 'public', 'data')
const countries = (JSON.parse(readFileSync(join(dataDir, 'countries.json'), 'utf8')) as { countries: Country[] }).countries
const outlineFeatures = (JSON.parse(readFileSync(join(dataDir, 'countries-outline.geojson'), 'utf8')) as { features: GeoFeature[] }).features
const countriesByCode = new Map(countries.map((country) => [country.iso3, country]))
const featuresByCode = new Map<string, GeoFeature[]>()
for (const feature of outlineFeatures) {
  const code = feature.properties.iso3
  if (!code) continue
  const list = featuresByCode.get(code) ?? []
  list.push(feature)
  featuresByCode.set(code, list)
}

const continents = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America', 'Antarctica']
const difficulties: OutlineDifficulty[] = ['easy', 'medium', 'hard']
const poolModes: OutlinePoolMode[] = ['standard', 'extended', 'territories']

describe('curated outline catalogue', () => {
  it('reviews every catalogue identity once and assigns one explainable outcome', () => {
    const catalogueCodes = new Set(countries.map((country) => country.iso3))
    expect(REVIEWED_OUTLINE_CODES).toEqual(catalogueCodes)
    expect(STANDARD_CODES.size).toBe(195)
    expect(SPECIAL_GEOGRAPHIC_CODES.size).toBe(12)
    expect(EASY_OUTLINE_CODES.size).toBe(47)
    expect(HARD_OUTLINE_CODES.size).toBe(39)

    const summary = outlinePlayabilitySummary(countries)
    expect(summary).toEqual({
      easy: 47,
      medium: 105,
      hard: 39,
      excluded: 64,
      standard: 195,
      territories: 45,
      additional: 3,
      special: 12,
    })
    expect(Object.keys(EXCLUDED_OUTLINE_RULES)).toHaveLength(summary.excluded)

    for (const country of countries) {
      const rule = outlineRuleFor(country.iso3)
      expect(rule, `${country.iso3} has a reviewed playability rule`).toBeDefined()
      expect(rule?.reason.trim().length, `${country.iso3} has a rationale`).toBeGreaterThan(20)
      expect(rule?.geometrySource).toBe('Natural Earth 1:10m')
      if (rule?.status === 'eligible') {
        expect(rule.difficulty).toMatch(/^(easy|medium|hard)$/)
        expect(rule.contextRequired).toBe(false)
        expect(rule.quality).toBe('suitable-for-silhouette')
      } else {
        expect(rule?.difficulty).toBeNull()
        expect(rule?.quality).toBeTruthy()
        expect(rule?.contextRequired).toBe(rule?.quality !== 'special-record')
      }
    }
    expect(outlineRuleFor('NEW')).toBeUndefined()
  })

  it('keeps the 195 Standard identities and separates territories and special records', () => {
    const classes = new Map<string, number>()
    for (const country of countries) {
      const classification = classifyGeography(country)
      classes.set(classification, (classes.get(classification) ?? 0) + 1)
    }
    expect(classes).toEqual(new Map([
      ['standard-quiz-identity', 195],
      ['separately-represented-territory', 45],
      ['additional-identity', 3],
      ['special-geographic-entity', 12],
    ]))
    expect(countries.filter((country) => classifyGeography(country) !== 'special-geographic-entity')).toHaveLength(243)
    for (const code of ['SMR', 'MCO', 'VAT', 'GGY', 'NRU', 'MDV']) {
      expect(outlineRuleFor(code)?.status, `${code} is not a forced silhouette question`).toBe('excluded')
    }
    for (const code of ['NLD', 'FRA', 'USA', 'IDN', 'JPN', 'PHL']) {
      expect(outlineRuleFor(code)?.status, `${code} remains a playable outline`).toBe('eligible')
    }
  })

  it('renders every bundled outline with the same local equal-area fitting used by gameplay', () => {
    expect(featuresByCode.size).toBe(255)
    expect(new Set(outlineFeatures.map((feature) => feature.properties.iso3).filter(Boolean))).toEqual(new Set(countries.map((country) => country.iso3)))
    for (const [code, features] of featuresByCode) {
      const country = countriesByCode.get(code)!
      const collection = { type: 'FeatureCollection', features: features as unknown as GeoJSON.Feature[] } as GeoJSON.FeatureCollection
      const center = country.coordinates
        ? [country.coordinates.lon, country.coordinates.lat] as [number, number]
        : geoCentroid(collection)
      const projection = geoEqualEarth().rotate([-center[0], -center[1]]).fitExtent([[16, 14], [944, 466]], collection)
      const path = geoPath(projection)
      for (const feature of features) {
        const rendered = path(feature as unknown as GeoJSON.Feature)
        const bounds = path.bounds(feature as unknown as GeoJSON.Feature)
        expect(rendered, `${code} has a visible SVG path`).toMatch(/^M/)
        expect(rendered, `${code} path has no invalid coordinates`).not.toMatch(/NaN|Infinity|undefined/)
        expect(bounds.flat().every(Number.isFinite), `${code} has finite fitted bounds`).toBe(true)
        expect(bounds[0][0]).toBeGreaterThanOrEqual(15.9)
        expect(bounds[0][1]).toBeGreaterThanOrEqual(13.9)
        expect(bounds[1][0]).toBeLessThanOrEqual(944.1)
        expect(bounds[1][1]).toBeLessThanOrEqual(466.1)
        expect(bounds[1][0] - bounds[0][0] > 0 || bounds[1][1] - bounds[0][1] > 0, `${code} has non-zero projected area`).toBe(true)
      }
    }
  }, 60_000)
})

describe('outline candidate pools and no-repeat sequencing', () => {
  it('validates every region, eligibility mode and difficulty combination', () => {
    const scopes = ['World', ...continents]
    for (const scope of scopes) {
      for (const pool of poolModes) {
        for (const difficulty of difficulties) {
          const groups = buildOutlineCandidateGroups(countries, featuresByCode, { scope, pool, difficulty })
          const candidates = [...groups.standard, ...groups.extended]
          expect(new Set(candidates.map((candidate) => candidate.code)).size).toBe(candidates.length)
          for (const candidate of groups.standard) {
            expect(classifyGeography(candidate.country)).toBe('standard-quiz-identity')
            expect(candidate.rule.difficulty).toBe(difficulty)
          }
          for (const candidate of groups.extended) {
            expect(['separately-represented-territory', 'additional-identity']).toContain(classifyGeography(candidate.country))
            expect(candidate.rule.difficulty).toBe(difficulty)
          }
          for (const candidate of candidates) {
            expect(candidate.features.length).toBeGreaterThan(0)
            expect(candidate.country.continent === scope || scope === 'World').toBe(true)
            expect(candidate.rule.status).toBe('eligible')
            expect(candidate.country.hasGeometry).toBe(true)
          }
          if (pool === 'standard') expect(groups.extended).toHaveLength(0)
          if (pool === 'territories') expect(groups.standard).toHaveLength(0)
        }
      }
    }
  })

  it('keeps each generated deck unique until exhaustion and changes order deterministically by seed', () => {
    const groups = buildOutlineCandidateGroups(countries, featuresByCode, { scope: 'World', pool: 'extended', difficulty: 'medium' })
    expect(outlinePoolSize(groups)).toBeGreaterThan(100)
    const first = [] as string[]
    for (let index = 0; index < outlinePoolSize(groups); index += 1) {
      const question = outlineQuestionAt(groups, 'outline-deck-regression', { index, lastCode: index ? first[index - 1]! : null })
      expect(question).not.toBeNull()
      first.push(question!.code)
    }
    expect(new Set(first).size).toBe(first.length)
    const replay = [] as string[]
    for (let index = 0; index < outlinePoolSize(groups); index += 1) {
      replay.push(outlineQuestionAt(groups, 'outline-deck-regression', { index, lastCode: index ? replay[index - 1]! : null })!.code)
    }
    expect(replay).toEqual(first)
    const seedStarts = new Set(Array.from({ length: 20 }, (_, index) => outlineQuestionAt(groups, `outline-deck-regression:${index}`)?.code))
    expect(seedStarts.size).toBeGreaterThan(1)
    expect(outlineQuestionAt(groups, 'outline-deck-regression')?.code).toBe(first[0])
  })

  it('does not repeat at the cycle boundary unless the eligible pool has one answer', () => {
    const groups = { standard: [{ code: 'AAA' }, { code: 'BBB' }], extended: [{ code: 'CCC' }, { code: 'DDD' }] }
    const seen: string[] = []
    let progress = EMPTY_OUTLINE_PROGRESS
    for (let index = 0; index < 8; index += 1) {
      const question = outlineQuestionAt(groups, 'small-pool', progress)!
      if (index > 0) expect(question.code).not.toBe(seen.at(-1))
      seen.push(question.code)
      progress = advanceOutlineSequence(progress, question.code)
    }
    expect(seen.slice(0, 4).sort()).toEqual(['AAA', 'BBB', 'CCC', 'DDD'])
    expect(seen.slice(4, 8).sort()).toEqual(['AAA', 'BBB', 'CCC', 'DDD'])
    const single = { standard: [{ code: 'ONLY' }], extended: [] as Array<{ code: string }> }
    expect(outlineQuestionAt(single, 'only', { index: 1, lastCode: 'ONLY' })?.code).toBe('ONLY')
  })

  it('simulates Europe Extended and mixed World Extended ten-question sessions', () => {
    function simulate(groups: ReturnType<typeof buildOutlineCandidateGroups>, prefix: string) {
      const frequency = new Map<string, number>()
      let territoryQuestions = 0
      let totalQuestions = 0
      for (let simulation = 0; simulation < 1_000; simulation += 1) {
        const selected: string[] = []
        let progress = EMPTY_OUTLINE_PROGRESS
        for (let round = 0; round < 10; round += 1) {
          const question = outlineQuestionAt(groups, `${prefix}-${simulation}`, progress)!
          selected.push(question.code)
          frequency.set(question.code, (frequency.get(question.code) ?? 0) + 1)
          if (!groups.standard.some((candidate) => candidate.code === question.code)) territoryQuestions += 1
          totalQuestions += 1
          progress = advanceOutlineSequence(progress, question.code)
        }
        expect(new Set(selected).size, `${prefix} session ${simulation}`).toBe(10)
        if (groups.standard.length >= 7) {
          expect(selected.filter((code) => !groups.standard.some((candidate) => candidate.code === code)).length, `${prefix} session ${simulation} territory share`).toBeLessThanOrEqual(3)
        }
        expect(selected).not.toContain('GGY')
      }
      expect(totalQuestions).toBe(10_000)
      return { frequency, territoryQuestions, totalQuestions }
    }

    const europe = buildOutlineCandidateGroups(countries, featuresByCode, { scope: 'Europe', pool: 'extended', difficulty: 'medium' })
    expect(europe.standard.length).toBeGreaterThanOrEqual(7)
    const europeResults = simulate(europe, 'europe-extended-medium')
    expect(europeResults.territoryQuestions).toBe(0)
    expect(europeResults.frequency.size).toBeGreaterThan(europe.standard.length + europe.extended.length - 3)
    const europeExpectedPerCandidate = europeResults.totalQuestions / outlinePoolSize(europe)
    expect(Math.max(...europeResults.frequency.values())).toBeLessThan(europeExpectedPerCandidate * 2.5)

    const world = buildOutlineCandidateGroups(countries, featuresByCode, { scope: 'World', pool: 'extended', difficulty: 'hard' })
    expect(world.standard.length).toBeGreaterThanOrEqual(7)
    expect(world.extended.length).toBeGreaterThan(0)
    const worldResults = simulate(world, 'world-extended-hard')
    expect(worldResults.territoryQuestions / worldResults.totalQuestions).toBeLessThanOrEqual(0.3)
    expect(worldResults.frequency.size).toBeGreaterThan(world.standard.length + world.extended.length - 3)

    const matrix = [] as Array<{ scope: string; pool: OutlinePoolMode; difficulty: OutlineDifficulty; standard: number; territories: number; total: number }>
    for (const scope of ['World', ...continents]) {
      for (const pool of poolModes) {
        for (const difficulty of difficulties) {
          const candidates = buildOutlineCandidateGroups(countries, featuresByCode, { scope, pool, difficulty })
          matrix.push({ scope, pool, difficulty, standard: candidates.standard.length, territories: candidates.extended.length, total: outlinePoolSize(candidates) })
        }
      }
    }
    const reportDir = join(process.cwd(), 'artifacts', 'qa', 'geography-overhaul')
    mkdirSync(reportDir, { recursive: true })
    writeFileSync(join(reportDir, 'outline-distribution-simulation.json'), `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      questionsPerScenario: 1_000,
      questionsPerSession: 10,
      scenarios: [
        {
          scope: 'Europe', pool: 'extended', difficulty: 'medium', simulations: 1_000, questionCount: europeResults.totalQuestions,
          candidateCounts: { standardCountries: europe.standard.length, territoriesAndAdditionalIdentities: europe.extended.length, total: outlinePoolSize(europe) },
          territoryQuestions: europeResults.territoryQuestions, territoryShare: europeResults.territoryQuestions / europeResults.totalQuestions,
          duplicateQuestionSessions: 0, guernseyOutlineQuestions: europeResults.frequency.get('GGY') ?? 0,
          frequencies: Object.fromEntries([...europeResults.frequency].sort(([left], [right]) => left.localeCompare(right))),
        },
        {
          scope: 'World', pool: 'extended', difficulty: 'hard', simulations: 1_000, questionCount: worldResults.totalQuestions,
          candidateCounts: { standardCountries: world.standard.length, territoriesAndAdditionalIdentities: world.extended.length, total: outlinePoolSize(world) },
          territoryQuestions: worldResults.territoryQuestions, territoryShare: worldResults.territoryQuestions / worldResults.totalQuestions,
          duplicateQuestionSessions: 0, guernseyOutlineQuestions: worldResults.frequency.get('GGY') ?? 0,
          frequencies: Object.fromEntries([...worldResults.frequency].sort(([left], [right]) => left.localeCompare(right))),
        },
      ],
      poolMatrix: matrix,
    }, null, 2)}\n`)
  })

  it.each([
    ['World', 'standard', 'easy'],
    ['World', 'standard', 'medium'],
    ['World', 'standard', 'hard'],
    ['Europe', 'extended', 'medium'],
    ['Asia', 'extended', 'hard'],
    ['North America', 'territories', 'easy'],
  ] as const)('%s %s %s produces 1,000 reproducible eligible session samples', (scope, pool, difficulty) => {
    const groups = buildOutlineCandidateGroups(countries, featuresByCode, { scope, pool, difficulty })
    expect(outlinePoolSize(groups)).toBeGreaterThan(0)
    const all = new Set([...groups.standard, ...groups.extended].map((candidate) => candidate.code))
    const firstQuestions = new Set<string>()
    for (let simulation = 0; simulation < 1_000; simulation += 1) {
      const selected: string[] = []
      let progress = EMPTY_OUTLINE_PROGRESS
      const sessionLength = Math.min(10, outlinePoolSize(groups))
      for (let round = 0; round < sessionLength; round += 1) {
        const question = outlineQuestionAt(groups, `matrix-${scope}-${pool}-${difficulty}-${simulation}`, progress)
        expect(question).not.toBeNull()
        expect(all.has(question!.code)).toBe(true)
        expect(question!.rule.difficulty).toBe(difficulty)
        selected.push(question!.code)
        progress = advanceOutlineSequence(progress, question!.code)
      }
      expect(new Set(selected).size).toBe(selected.length)
      firstQuestions.add(selected[0]!)
    }
    if (outlinePoolSize(groups) > 10) expect(firstQuestions.size).toBeGreaterThan(5)
  })
})
