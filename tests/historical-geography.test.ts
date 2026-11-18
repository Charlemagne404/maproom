import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateHistoricalManifest } from '../src/geography/historical/loader'
import type { HistoricalMap, HistoricalManifest } from '../src/geography/historical/types'
import { createHistoricalDeck, evaluateHistoricalGuess, formatHistoricalYearRange, getHistoricalMapAt, HISTORICAL_TOLERANCES } from '../src/puzzles/historical-geography'

const root = process.cwd()
const manifestBytes = readFileSync(join(root, 'public/data/historical/manifest.json'))
const manifest = validateHistoricalManifest(JSON.parse(manifestBytes.toString('utf8')))

describe('historical geography game', () => {
  it('uses inclusive difficulty tolerances and reports the accepted range', () => {
    for (const [difficulty, tolerance] of Object.entries(HISTORICAL_TOLERANCES) as Array<[keyof typeof HISTORICAL_TOLERANCES, number]>) {
      expect(evaluateHistoricalGuess(2000, 2000 + tolerance, difficulty)).toMatchObject({
        distance: tolerance,
        acceptedMinimum: 2000 - tolerance,
        acceptedMaximum: 2000 + tolerance,
        withinTolerance: true,
      })
      expect(evaluateHistoricalGuess(2000, 2000 - tolerance, difficulty).withinTolerance).toBe(true)
      expect(evaluateHistoricalGuess(2000, 2001 + tolerance, difficulty).withinTolerance).toBe(false)
      expect(evaluateHistoricalGuess(2000, 1999 - tolerance, difficulty).withinTolerance).toBe(false)
      expect(evaluateHistoricalGuess(2000, 2000 + tolerance * 2, difficulty).score).toBe(0)
    }
    expect(formatHistoricalYearRange(1900, 2000)).toBe('1,900–2,000')
    expect(() => evaluateHistoricalGuess(2000, 0, 'easy')).toThrow(RangeError)
  })

  it('builds the same seeded map order from differently ordered manifests and exhausts the deck before repeating', () => {
    const forward = createHistoricalDeck(manifest.maps, 'test-seed')
    const reversed = createHistoricalDeck([...manifest.maps].reverse(), 'test-seed')
    expect(forward.map((map) => map.id)).toEqual(reversed.map((map) => map.id))
    expect(createHistoricalDeck(manifest.maps, 'test-seed').map((map) => map.id)).toEqual(forward.map((map) => map.id))
    expect(new Set(forward.map((map) => map.id)).size).toBe(20)
    expect(Array.from({ length: 20 }, (_, round) => getHistoricalMapAt(manifest.maps, 'test-seed', round)?.id)).toEqual(forward.map((map) => map.id))
    expect(getHistoricalMapAt(manifest.maps, 'test-seed', 20)?.id).toBe(forward[0]?.id)
    expect(getHistoricalMapAt(manifest.maps, 'test-seed', -1)).toBeUndefined()
  })

  it('ships 20 distinct, dated and attributed boundary snapshots with matching SVG hashes', () => {
    const maps = manifest.maps
    expect(maps).toHaveLength(20)
    expect(new Set(maps.map((map) => map.depictedYear)).size).toBe(20)
    expect(new Set(maps.map((map) => map.assetSha256)).size).toBe(20)
    expect([maps[0]?.depictedYear, maps.at(-1)?.depictedYear]).toEqual([1886, 2011])
    expect(manifest.snapshotConvention).toContain('31 December')
    expect(manifest.snapshotConvention).toContain('not a map published')
    expect(manifest.dataset.sourceDataDateRange).toBe('1886–2023')
    expect(manifest.dataset.license).toContain('NonCommercial-ShareAlike')
    expect(manifest.dataset.dataSha256).toMatch(/^[a-f0-9]{64}$/)

    for (const map of maps) {
      expect(map.depictedDate).toBe(`${map.depictedYear}-12-31`)
      expect(map.mapPublishedYear).toBeNull()
      expect(map.originalMapUrl).toBeNull()
      expect(map.geographicContext).toBeTruthy()
      expect(map.historicalContext).toBeTruthy()
      expect(map.datingUncertainty).toBeTruthy()
      expect(map.source.institution).toContain('ETH Zürich')
      expect(map.source.authors.length).toBeGreaterThan(0)
      expect(map.source.originalUrl).toMatch(/^https:\/\//)
      expect(map.source.releasePageUrl).toMatch(/^https:\/\//)
      expect(map.source.license).toContain('NonCommercial-ShareAlike')
      expect(map.source.licenseUrl).toBe('https://creativecommons.org/licenses/by-nc-sa/4.0/')
      expect(map.source.attribution).toContain('Maproom-generated')
      expect(map.source.adaptationTerms).toContain('Non-commercial')
      expect(map.contextSources.length).toBeGreaterThan(0)
      expect(map.contextSources.every((citation) => citation.url.startsWith('https://'))).toBe(true)

      const assetPath = join(root, 'public', map.assetUrl.slice(1))
      const svg = readFileSync(assetPath)
      expect(createHash('sha256').update(svg).digest('hex')).toBe(map.assetSha256)
      expect(svg.toString('utf8')).toContain('Derived from CShapes 2.1 by Maproom')
      expect(map.sourceFeatureCount).toBeGreaterThan(100)
    }
  })

  it('rejects an incomplete collection instead of silently reducing map variety', () => {
    const incomplete = structuredClone(manifest) as HistoricalManifest
    incomplete.maps = incomplete.maps.slice(0, 19) as HistoricalMap[]
    expect(() => validateHistoricalManifest(incomplete)).toThrow('collection is incomplete')
  })
})
