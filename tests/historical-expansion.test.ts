import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateHistoricalAtlasManifest, validateHistoricalFlagsManifest } from '../src/geography/historical/loader'
import type { HistoricalAtlasMap, HistoricalFlagEntry } from '../src/geography/historical/types'
import { createHistoricalFlagChoices, createHistoricalFlagDeck } from '../src/puzzles/historical-flags'
import {
  compareHistoricalYears,
  createHistoricalAtlasDeck,
  createHistoricalAtlasSequenceDeck,
  evaluateHistoricalAtlasGuess,
  formatHistoricalDateRange,
  formatHistoricalYear,
  historicalEraForYear,
  historicalYearDistance,
  parseHistoricalYearInput,
  toAstronomicalYear,
  type HistoricalDifficulty,
  type HistoricalEra,
} from '../src/puzzles/historical-geography'
import { createHistoricalStateChoices, createHistoricalStatesDeck, historicalPolityName } from '../src/puzzles/historical-states'

const root = process.cwd()
const atlas = validateHistoricalAtlasManifest(JSON.parse(readFileSync(join(root, 'public/data/historical/atlas/v2/manifest.json'), 'utf8')))
const flags = validateHistoricalFlagsManifest(JSON.parse(readFileSync(join(root, 'public/data/historical/flags/v1/manifest.json'), 'utf8')))
const eras: HistoricalEra[] = ['ancient', 'classical', 'medieval', 'early-modern', 'modern']
const difficulties: HistoricalDifficulty[] = ['easy', 'medium', 'hard']

describe('expanded historical sources and games', () => {
  it('ships a curated BCE-to-modern Cliopatria atlas with verified source intervals and asset hashes', () => {
    expect(atlas.source.releaseCommit).toBe('5f433377139a6eeaeacbdc894b70f8805b72c8b5')
    expect(atlas.source.license).toBe('Creative Commons Attribution 4.0 International')
    expect(atlas.maps).toHaveLength(41)
    expect(Math.min(...atlas.maps.map((map) => map.sampleYear))).toBe(-3300)
    expect(Math.max(...atlas.maps.map((map) => map.sampleYear))).toBe(1900)
    expect(new Set(atlas.maps.map((map) => map.id)).size).toBe(41)
    for (const map of atlas.maps) {
      expect(map.acceptedFromYear).not.toBe(0)
      expect(map.acceptedToYear).not.toBe(0)
      const bytes = readFileSync(join(root, 'public', map.assetUrl.slice(1)))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(map.assetSha256)
    }
  })

  it('has 20 per-flag sources, period labels, and explicit artwork status across 19 entities', () => {
    expect(flags.items).toHaveLength(20)
    expect(new Set(flags.items.map((item) => item.entity)).size).toBe(19)
    expect(flags.items.some((item) => item.designStatus === 'documented')).toBe(true)
    expect(flags.items.some((item) => item.designStatus === 'reconstructed')).toBe(true)
    for (const item of flags.items) {
      expect(item.source.url).toMatch(/^https:\/\//)
      expect(item.periodLabel).toBeTruthy()
      expect(item.artworkNote).toBeTruthy()
      const bytes = readFileSync(join(root, 'public', item.assetUrl.slice(1)))
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.assetSha256)
    }
    const ottomanArtwork = readFileSync(join(root, 'public', flags.items.find((item) => item.id === 'ottoman-1844')!.assetUrl.slice(1)), 'utf8')
    expect(ottomanArtwork.match(/<circle\b/g)).toHaveLength(2)
    expect(ottomanArtwork).toContain('r="87" fill="#f8f6ef"')
    expect(ottomanArtwork).toContain('r="62.64" fill="#c52d38"')
  })

  it('parses BCE and CE without a year zero and keeps the transition one year apart', () => {
    expect(parseHistoricalYearInput('1', 'BCE')).toBe(-1)
    expect(parseHistoricalYearInput('1,000', 'BCE')).toBe(-1000)
    expect(parseHistoricalYearInput('0', 'CE')).toBeNull()
    expect(parseHistoricalYearInput('0', 'BCE')).toBeNull()
    expect(toAstronomicalYear(-1)).toBe(0)
    expect(toAstronomicalYear(1)).toBe(1)
    expect(historicalYearDistance(-1, 1)).toBe(1)
    expect(compareHistoricalYears(-1, 1)).toBeLessThan(0)
    expect(formatHistoricalYear(-1)).toBe('1 BCE')
    expect(formatHistoricalDateRange(-2, 3)).toBe('2 BCE–3 CE')
    expect(() => formatHistoricalYear(0)).toThrow(RangeError)
  })

  it('uses non-overlapping era boundaries at the displayed 500 BCE and 500 CE cutoffs', () => {
    expect(historicalEraForYear(-501)).toBe('ancient')
    expect(historicalEraForYear(-500)).toBe('classical')
    expect(historicalEraForYear(499)).toBe('classical')
    expect(historicalEraForYear(500)).toBe('medieval')
  })

  it('builds deterministic era pools and same-polity, same-region sequences with non-overlapping dates', () => {
    const wholeDeck = createHistoricalAtlasDeck(atlas.maps, 'historical-test')
    expect(wholeDeck).toHaveLength(41)
    expect(new Set(wholeDeck.map((map) => map.id)).size).toBe(41)
    expect(createHistoricalAtlasDeck([...atlas.maps].reverse(), 'historical-test').map((map) => map.id)).toEqual(wholeDeck.map((map) => map.id))
    for (const era of eras) {
      expect(createHistoricalAtlasDeck(atlas.maps, 'historical-test', era).every((map) => historicalEraForYear(map.sampleYear) === era)).toBe(true)
    }
    const sequences = createHistoricalAtlasSequenceDeck(atlas.maps, 'historical-test')
    expect(sequences.length).toBeGreaterThan(0)
    for (const sequence of sequences) {
      expect(new Set(sequence.maps.map((map) => map.polities[0]?.name)).size).toBe(1)
      expect(new Set(sequence.maps.map((map) => map.region.id)).size).toBe(1)
      expect(sequence.maps[0]!.acceptedToYear).toBeLessThan(sequence.maps[1]!.acceptedFromYear)
      expect(sequence.maps[1]!.acceptedToYear).toBeLessThan(sequence.maps[2]!.acceptedFromYear)
    }
  })

  it('scores source intervals with a width-based precision ceiling and distinguishes difficulty for a near miss', () => {
    const map = atlas.maps.find((item) => historicalYearDistance(item.acceptedFromYear, item.acceptedToYear) + 1 >= 200)!
    const inPeriod = evaluateHistoricalAtlasGuess(map, map.acceptedFromYear, 'medium')
    const supportedYears = historicalYearDistance(map.acceptedFromYear, map.acceptedToYear) + 1
    expect(supportedYears).toBeGreaterThanOrEqual(200)
    expect(inPeriod).toMatchObject({ withinAcceptedInterval: true, distance: 0, scoreCeiling: 500, score: 500 })
    const narrowMap = atlas.maps.find((item) => historicalYearDistance(item.acceptedFromYear, item.acceptedToYear) + 1 <= 10)!
    expect(evaluateHistoricalAtlasGuess(narrowMap, narrowMap.acceptedFromYear, 'medium')).toMatchObject({
      withinAcceptedInterval: true,
      scoreCeiling: 1000,
      score: 1000,
    })
    const missYear = map.acceptedFromYear - 1
    const scores = difficulties.map((difficulty) => evaluateHistoricalAtlasGuess(map, missYear, difficulty).score)
    expect(scores[0]).toBeGreaterThan(scores[1]!)
    expect(scores[1]).toBeGreaterThan(scores[2]!)
  })

  it('builds source-backed flag rounds with one correct entity and distinct, usually period- or region-near distractors', () => {
    const entries = flags.items as HistoricalFlagEntry[]
    const deck = createHistoricalFlagDeck(entries, 'flag-playtest', 0, 'all')
    expect(deck).toHaveLength(20)
    expect(new Set(deck.map((item) => item.id)).size).toBe(20)
    expect(createHistoricalFlagDeck([...entries].reverse(), 'flag-playtest', 0, 'all').map((item) => item.id)).toEqual(deck.map((item) => item.id))
    for (const question of entries) {
      expect(question.visibleClue).toBeTruthy()
      expect(question.explanation).toBeTruthy()
      for (const roundSeed of ['sample-a', 'sample-b', 'sample-c']) {
        const choices = createHistoricalFlagChoices(entries, question, roundSeed)
        expect(choices).toHaveLength(4)
        expect(choices.filter((choice) => choice.id === question.id)).toHaveLength(1)
        expect(new Set(choices.map((choice) => choice.entity)).size).toBe(4)
        const related = new Set(entries.filter((item) => item.entity !== question.entity
          && (item.region === question.region || Math.abs(item.periodStartYear - question.periodStartYear) <= 120)).map((item) => item.entity))
        if (related.size >= 3) expect(choices.filter((choice) => choice.id !== question.id).every((choice) => related.has(choice.entity))).toBe(true)
      }
    }
  })

  it('builds saved historical-state rounds and four distinct polity options without answer duplication', () => {
    const maps = atlas.maps as HistoricalAtlasMap[]
    const deck = createHistoricalStatesDeck(maps, 'states-playtest', 0, 'all')
    expect(deck).toHaveLength(41)
    expect(new Set(deck.map((map) => map.id)).size).toBe(41)
    expect(createHistoricalStatesDeck([...maps].reverse(), 'states-playtest', 0, 'all').map((map) => map.id)).toEqual(deck.map((map) => map.id))
    for (const question of maps) {
      expect(question.visibleClue).toBeTruthy()
      expect(question.contextSources.length).toBeGreaterThan(0)
      for (const roundSeed of ['sample-a', 'sample-b']) {
        const choices = createHistoricalStateChoices(maps, question, roundSeed)
        expect(choices).toHaveLength(4)
        expect(choices.filter((choice) => choice.id === question.id)).toHaveLength(1)
        expect(new Set(choices.map(historicalPolityName)).size).toBe(4)
        expect(choices.every((choice) => historicalEraForYear(choice.sampleYear) === historicalEraForYear(question.sampleYear))).toBe(true)
        const near = new Set(maps.filter((candidate) => historicalPolityName(candidate) !== historicalPolityName(question)
          && historicalEraForYear(candidate.sampleYear) === historicalEraForYear(question.sampleYear)
          && (candidate.region.id === question.region.id || historicalYearDistance(candidate.sampleYear, question.sampleYear) <= 250)).map(historicalPolityName))
        if (near.size >= 3) expect(choices.filter((choice) => choice.id !== question.id).every((choice) => near.has(historicalPolityName(choice)))).toBe(true)
      }
    }
  })

  it('keeps the best constant-year strategy below half credit for the full deck and each era', () => {
    const groups: Array<{ era: HistoricalEra; maps: typeof atlas.maps }> = [
      { era: 'all', maps: atlas.maps },
      ...eras.map((era) => ({ era, maps: atlas.maps.filter((map) => historicalEraForYear(map.sampleYear) === era) })),
    ]
    for (const group of groups) {
      const maxYear = Math.max(...group.maps.map((map) => map.acceptedToYear + 150))
      const minYear = Math.min(...group.maps.map((map) => map.acceptedFromYear - 150))
      let bestMean = 0
      let bestPeriodHits = 0
      for (let guess = minYear; guess <= maxYear; guess += 1) {
        if (guess === 0) continue
        const results = group.maps.map((map) => evaluateHistoricalAtlasGuess(map, guess, 'medium'))
        const mean = results.reduce((sum, result) => sum + result.score, 0) / group.maps.length
        if (mean > bestMean) bestMean = mean
        bestPeriodHits = Math.max(bestPeriodHits, results.filter((result) => result.withinAcceptedInterval).length)
      }
      expect(bestMean, `${group.era} best fixed-year mean`).toBeLessThan(500)
      expect(bestPeriodHits, `${group.era} maps covered by one fixed year`).toBeLessThan(group.maps.length / 2)
    }
  })
})
