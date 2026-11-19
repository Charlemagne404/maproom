import { describe, expect, it } from 'vitest'
import type { Country } from '../geography/types'
import {
  buildAdjacency,
  dateInTimeZone,
  directionFromTo,
  distanceScore,
  dailyPuzzleId,
  dailyPuzzleSeed,
  generateRoutePuzzle,
  findRouteOrdering,
  greatCircleKm,
  GAME_IDS,
  gridAnswerScore,
  normalizeAnswer,
  pickCountries,
  resolveCountryAnswer,
  routeQualityMessage,
  seededRandom,
  seededShuffle,
  shortestPath,
  validGridPresets,
  validateRouteStep,
} from './engine'

function country(iso3: string, overrides: Partial<Country> = {}): Country {
  return {
    iso3,
    parentIso3: null,
    iso2: iso3.slice(0, 2),
    name: iso3,
    officialName: iso3,
    aliases: [],
    continent: 'Europe',
    subregion: null,
    capital: null,
    capitals: [],
    capitalCoordinates: null,
    coordinates: { lat: 0, lon: 0 },
    population: 1_000_000,
    populationYear: '2023',
    lifeExpectancyYears2023: null,
    areaKm2: 100_000,
    landlocked: false,
    borders: [],
    independent: true,
    flagCode: iso3.slice(0, 2).toLowerCase(),
    hasGeometry: true,
    regionCount: 0,
    regionSource: null,
    ...overrides,
  }
}

describe('normalization and daily identity', () => {
  it('normalizes accents, punctuation and ampersands for aliases', () => {
    expect(normalizeAnswer('Côte d’Ivoire')).toBe('cote d ivoire')
    expect(normalizeAnswer('Trinidad & Tobago')).toBe('trinidad and tobago')
    const ivoryCoast = country('CIV', { name: 'Côte d’Ivoire', aliases: ['Ivory Coast'] })
    expect(resolveCountryAnswer('ivory-coast', [ivoryCoast])).toBe(ivoryCoast)
  })

  it('uses timezone calendar dates across UTC and daylight-saving boundaries', () => {
    expect(dateInTimeZone(new Date('2026-03-29T22:30:00Z'), 'Europe/Stockholm')).toBe('2026-03-30')
    expect(dateInTimeZone(new Date('2026-01-01T23:30:00Z'), 'Europe/Stockholm')).toBe('2026-01-02')
    expect(dateInTimeZone(new Date('2026-03-29T00:30:00Z'), 'Europe/Stockholm')).toBe('2026-03-29')
    expect(dateInTimeZone(new Date('2026-03-29T01:30:00Z'), 'Europe/Stockholm')).toBe('2026-03-29')
    expect(dateInTimeZone(new Date('2026-10-25T00:30:00Z'), 'Europe/Stockholm')).toBe('2026-10-25')
    expect(dateInTimeZone(new Date('2026-10-25T01:30:00Z'), 'Europe/Stockholm')).toBe('2026-10-25')
    expect(dailyPuzzleId('flags', '2026-11-16')).toBe('flags:2026-11-16:v2')
  })

  it('keeps daily identities deterministic across 400 calendar dates for every game', () => {
    const identities = new Set<string>()
    for (let offset = 0; offset < 400; offset += 1) {
      const date = new Date(Date.UTC(2024, 0, 1 + offset, 12)).toISOString().slice(0, 10)
      for (const gameId of GAME_IDS) {
        const puzzleId = dailyPuzzleId(gameId, date)
        expect(dailyPuzzleId(gameId, date)).toBe(puzzleId)
        expect(dailyPuzzleSeed(gameId, date)).toBe(puzzleId)
        expect(identities.has(puzzleId)).toBe(false)
        identities.add(puzzleId)
      }
    }
    expect(identities.size).toBe(400 * GAME_IDS.length)
  })

  it('produces repeatable random sequences and shuffles without mutating input', () => {
    const left = [1, 2, 3, 4, 5]
    expect(seededShuffle(left, 'daily:seed')).toEqual(seededShuffle(left, 'daily:seed'))
    expect(seededShuffle(left, 'daily:seed')).not.toEqual(left)
    expect(left).toEqual([1, 2, 3, 4, 5])
    const first = seededRandom('x')
    const second = seededRandom('x')
    expect(Array.from({ length: 6 }, first)).toEqual(Array.from({ length: 6 }, second))
  })

  it('limits country questions to places with geometry and the chosen scope', () => {
    const countries = [
      country('SWE'), country('NOR'), country('EGY', { continent: 'Africa' }),
      country('XXX', { hasGeometry: false }),
    ]
    const selected = pickCountries(countries, 10, 'scope', (item) => item.continent === 'Europe')
    expect(selected.map((item) => item.iso3).sort()).toEqual(['NOR', 'SWE'])
  })
})

describe('border routes', () => {
  const graph = [
    country('AAA', { borders: ['BBB'] }),
    country('BBB', { borders: ['CCC'] }),
    country('CCC', { borders: ['DDD'] }),
    country('DDD'),
    country('ISL'),
  ]

  it('builds symmetric adjacency, finds shortest paths and validates route steps', () => {
    const adjacency = buildAdjacency(graph)
    expect(adjacency.get('BBB')).toEqual(['AAA', 'CCC'])
    expect(adjacency.get('CCC')).toEqual(['BBB', 'DDD'])
    expect(shortestPath('AAA', 'DDD', adjacency)).toEqual(['AAA', 'BBB', 'CCC', 'DDD'])
    expect(shortestPath('AAA', 'ISL', adjacency)).toBeNull()
    expect(validateRouteStep(['AAA'], 'BBB', adjacency)).toBeNull()
    expect(validateRouteStep(['AAA'], 'CCC', adjacency)).toContain('does not share')
    expect(validateRouteStep(['AAA', 'BBB'], 'AAA', adjacency)).toContain('already')
  })

  it('generates a stable, solvable puzzle with a path inside the graph', () => {
    const countries = [
      country('AAA', { borders: ['BBB', 'DDD'] }),
      country('BBB', { borders: ['CCC'] }),
      country('CCC', { borders: ['DDD'] }),
      country('DDD', { borders: ['EEE'] }),
      country('EEE', { borders: ['CCC'] }),
    ]
    const puzzle = generateRoutePuzzle(countries, 'maproom-test')
    expect(puzzle).toEqual(generateRoutePuzzle(countries, 'maproom-test'))
    expect(puzzle.shortest.length).toBeGreaterThanOrEqual(3)
    const adjacency = buildAdjacency(countries)
    expect(shortestPath(puzzle.start, puzzle.end, adjacency)).toEqual(puzzle.shortest)
  })

  it('keeps a longer connected route valid and counts its extra stop', () => {
    const countries = [
      country('AAA', { borders: ['BBB', 'DDD'] }),
      country('BBB', { borders: ['CCC'] }),
      country('CCC', { borders: ['DDD'] }),
      country('DDD'),
    ]
    const adjacency = buildAdjacency(countries)
    const shortest = shortestPath('AAA', 'DDD', adjacency)!
    const longer = findRouteOrdering('AAA', 'DDD', ['CCC', 'BBB'], adjacency)

    expect(shortest).toEqual(['AAA', 'DDD'])
    expect(longer).toEqual(['AAA', 'BBB', 'CCC', 'DDD'])
    expect(routeQualityMessage(longer!.length - 1, shortest.length - 1)).toBe('Your route uses 3 borders; the shortest uses 1 border (2 extra stops).')
  })

  it('orders an unordered border-country set into a valid path deterministically', () => {
    const countries = [
      country('PRT', { borders: ['ESP'] }),
      country('ESP', { borders: ['FRA'] }),
      country('FRA', { borders: ['BEL', 'DEU'] }),
      country('BEL', { borders: ['DEU'] }),
      country('DEU', { borders: ['POL'] }),
      country('POL'),
      country('ITA', { borders: ['CHE'] }),
      country('CHE'),
    ]
    const adjacency = buildAdjacency(countries)
    const entered = ['DEU', 'ESP', 'BEL', 'FRA']
    const ordering = ['PRT', 'ESP', 'FRA', 'BEL', 'DEU', 'POL']

    expect(findRouteOrdering('PRT', 'POL', entered, adjacency)).toEqual(ordering)
    expect(findRouteOrdering('PRT', 'POL', [...entered].reverse(), adjacency)).toEqual(ordering)
  })

  it('chooses one stable ordering when several valid orderings use the full set', () => {
    const adjacency = buildAdjacency([
      country('AAA', { borders: ['BBB', 'CCC'] }),
      country('BBB', { borders: ['CCC', 'DDD'] }),
      country('CCC', { borders: ['DDD'] }),
      country('DDD', { borders: ['EEE'] }),
      country('EEE'),
    ])
    expect(findRouteOrdering('AAA', 'EEE', ['DDD', 'CCC', 'BBB'], adjacency)).toEqual(['AAA', 'BBB', 'CCC', 'DDD', 'EEE'])
  })

  it('explains shortest and longer valid route quality with border and stop counts', () => {
    expect(routeQualityMessage(1, 1)).toBe('Shortest route: 1 border.')
    expect(routeQualityMessage(3, 3)).toBe('Shortest route: 3 borders.')
    expect(routeQualityMessage(4, 3)).toBe('Your route uses 4 borders; the shortest uses 3 borders (1 extra stop).')
    expect(routeQualityMessage(6, 4)).toBe('Your route uses 6 borders; the shortest uses 4 borders (2 extra stops).')
  })

  it('rejects disconnected, duplicated and endpoint selections without changing adjacency rules', () => {
    const adjacency = buildAdjacency([
      country('AAA', { borders: ['BBB'] }),
      country('BBB', { borders: ['CCC'] }),
      country('CCC', { borders: ['DDD'] }),
      country('DDD'),
      country('ISL'),
    ])
    expect(findRouteOrdering('AAA', 'DDD', ['BBB', 'ISL', 'CCC'], adjacency)).toBeNull()
    expect(findRouteOrdering('AAA', 'DDD', ['BBB', 'BBB', 'CCC'], adjacency)).toBeNull()
    expect(findRouteOrdering('AAA', 'DDD', ['AAA', 'BBB', 'CCC'], adjacency)).toBeNull()
    expect(findRouteOrdering('AAA', 'DDD', ['BBB', 'CCC', 'DDD'], adjacency)).toBeNull()
    expect(findRouteOrdering('AAA', 'DDD', ['BBB', 'CCC'], adjacency)).toEqual(['AAA', 'BBB', 'CCC', 'DDD'])
  })
})

describe('distance and grid scoring', () => {
  it('calculates distance and all eight directions from the origin toward the destination', () => {
    expect(greatCircleKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.2, 0)
    expect(directionFromTo({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBe('north')
    expect(directionFromTo({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBe('east')
    expect(directionFromTo({ lat: 0, lon: 0 }, { lat: -1, lon: 0 })).toBe('south')
    expect(directionFromTo({ lat: 0, lon: 0 }, { lat: 0, lon: -1 })).toBe('west')
    expect(directionFromTo({ lat: 0, lon: 0 }, { lat: 1, lon: 1 })).toBe('north-east')
    expect(directionFromTo({ lat: 0, lon: 0 }, { lat: -1, lon: 1 })).toBe('south-east')
    expect(directionFromTo({ lat: 0, lon: 0 }, { lat: -1, lon: -1 })).toBe('south-west')
    expect(directionFromTo({ lat: 0, lon: 0 }, { lat: 1, lon: -1 })).toBe('north-west')
  })

  it('uses shortest east-west paths across the International Date Line', () => {
    const eastward = { lat: 0, lon: 170 }
    const westward = { lat: 0, lon: -170 }
    expect(directionFromTo(eastward, westward)).toBe('east')
    expect(directionFromTo(westward, eastward)).toBe('west')
    expect(greatCircleKm(eastward, westward)).toBeCloseTo(2223.9, 0)
  })

  it('keeps reversed pairs opposite and fixes real country-position regressions', () => {
    const pairs = [
      [{ lat: 38, lon: -97 }, { lat: 40, lon: 60 }], // USA to Turkmenistan
      [{ lat: 38, lon: -97 }, { lat: 62, lon: 15 }], // USA to Sweden
      [{ lat: -35, lon: 149 }, { lat: 64, lon: -21 }],
      [{ lat: 10, lon: 179 }, { lat: -10, lon: -179 }],
    ] as const
    const opposite: Record<string, string> = {
      north: 'south', 'north-east': 'south-west', east: 'west', 'south-east': 'north-west',
      south: 'north', 'south-west': 'north-east', west: 'east', 'north-west': 'south-east',
    }
    for (const [origin, destination] of pairs) {
      const forward = directionFromTo(origin, destination)
      expect(directionFromTo(destination, origin)).toBe(opposite[forward])
    }
    expect(directionFromTo({ lat: 38, lon: -97 }, { lat: 40, lon: 60 })).toBe('east')
    expect(directionFromTo({ lat: 40, lon: 60 }, { lat: 38, lon: -97 })).toBe('west')
    expect(directionFromTo({ lat: 38, lon: -97 }, { lat: 62, lon: 15 })).toBe('east')
    expect(directionFromTo({ lat: 62, lon: 15 }, { lat: 38, lon: -97 })).toBe('west')
  })

  it('scores city distance at the documented thresholds', () => {
    expect(distanceScore(25)).toBe(1000)
    expect(distanceScore(100)).toBe(850)
    expect(distanceScore(250)).toBe(700)
    expect(distanceScore(500)).toBe(550)
    expect(distanceScore(1000)).toBe(400)
    expect(distanceScore(2500)).toBe(250)
    expect(distanceScore(2500.1)).toBe(100)
  })

  it('rejects grids that cannot fill nine distinct answers and rewards scarce crossings', () => {
    const countries = [
      country('DEU', { landlocked: false, population: 80_000_000, areaKm2: 350_000 }),
      country('CHE', { landlocked: true, population: 8_000_000, areaKm2: 40_000 }),
      country('AUT', { landlocked: true, population: 9_000_000, areaKm2: 83_000 }),
      country('FRA', { landlocked: false, population: 67_000_000, areaKm2: 640_000 }),
      country('ZAF', { continent: 'Africa', landlocked: false, population: 60_000_000, areaKm2: 1_200_000 }),
      country('ETH', { continent: 'Africa', landlocked: true, population: 120_000_000, areaKm2: 1_100_000 }),
      country('NGA', { continent: 'Africa', landlocked: false, population: 210_000_000, areaKm2: 920_000 }),
      country('CHN', { continent: 'Asia', landlocked: false, population: 1_400_000_000, areaKm2: 9_600_000 }),
      country('MNG', { continent: 'Asia', landlocked: true, population: 3_000_000, areaKm2: 1_500_000 }),
      country('IND', { continent: 'Asia', landlocked: false, population: 1_400_000_000, areaKm2: 3_300_000 }),
      country('BRA', { continent: 'South America', landlocked: false, population: 200_000_000, areaKm2: 8_500_000 }),
      country('BOL', { continent: 'South America', landlocked: true, population: 12_000_000, areaKm2: 1_100_000 }),
      country('ARG', { continent: 'South America', landlocked: false, population: 45_000_000, areaKm2: 2_800_000 }),
    ]
    const presets = validGridPresets(countries)
    expect(presets).toHaveLength(0)
    expect(gridAnswerScore(1)).toBe(250)
    expect(gridAnswerScore(2)).toBe(200)
    expect(gridAnswerScore(20)).toBe(100)
    expect(gridAnswerScore(0)).toBe(0)
  })
})
