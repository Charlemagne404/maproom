import type { Country, GameId } from '../geography/types'

export const GAME_IDS: GameId[] = ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'connections', 'higher-lower', 'neighbours', 'distance']
export const PUZZLE_VERSION = 1
const GAME_PUZZLE_VERSIONS: Partial<Record<GameId, number>> = { grid: 2 }

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function resolveCountryAnswer(value: string, countries: Country[]): Country | undefined {
  const answer = normalizeAnswer(value)
  if (!answer) return undefined
  return countries.find((country) =>
    [country.name, country.officialName, ...country.aliases].some((name) => normalizeAnswer(name) === answer),
  )
}

export function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00'
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function dailyPuzzleId(gameId: GameId, date: string): string {
  return `${gameId}:${date}:v${GAME_PUZZLE_VERSIONS[gameId] ?? PUZZLE_VERSION}`
}

export function dailyPuzzleSeed(gameId: GameId, date: string): string {
  return `${gameId}:${date}:v${GAME_PUZZLE_VERSIONS[gameId] ?? PUZZLE_VERSION}`
}

export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededRandom(seed: string): () => number {
  let state = hashSeed(seed)
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(values: readonly T[], seed: string): T[] {
  const result = [...values]
  const random = seededRandom(seed)
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function pickCountries(countries: Country[], count: number, seed: string, filter?: (country: Country) => boolean): Country[] {
  const eligible = countries.filter((country) => country.hasGeometry && (!filter || filter(country)))
  return seededShuffle(eligible, seed).slice(0, Math.min(count, eligible.length))
}

export function shortestPath(start: string, end: string, adjacency: Map<string, string[]>): string[] | null {
  if (start === end) return [start]
  const queue: string[][] = [[start]]
  const visited = new Set([start])
  while (queue.length) {
    const path = queue.shift()!
    for (const next of adjacency.get(path.at(-1)!) ?? []) {
      if (visited.has(next)) continue
      const candidate = [...path, next]
      if (next === end) return candidate
      visited.add(next)
      queue.push(candidate)
    }
  }
  return null
}

export function validateRouteStep(route: string[], candidate: string, adjacency: Map<string, string[]>): string | null {
  if (!candidate) return 'Choose a country from the list.'
  if (route.includes(candidate)) return 'That country is already in your route.'
  const previous = route.at(-1)
  if (!previous || !adjacency.get(previous)?.includes(candidate)) return 'That country does not share a land border with the last stop.'
  return null
}

export function buildAdjacency(countries: Country[]): Map<string, string[]> {
  const known = new Set(countries.map((country) => country.iso3))
  const adjacency = new Map(countries.map((country) => [country.iso3, new Set<string>()]))
  for (const country of countries) {
    for (const neighbor of country.borders) {
      if (!known.has(neighbor) || neighbor === country.iso3) continue
      adjacency.get(country.iso3)?.add(neighbor)
      adjacency.get(neighbor)?.add(country.iso3)
    }
  }
  return new Map([...adjacency].map(([code, neighbors]) => [code, [...neighbors].sort()]))
}

export type RouteDifficulty = 'short' | 'standard' | 'long'

export function generateRoutePuzzle(countries: Country[], seed: string, options?: { continent?: string; difficulty?: RouteDifficulty }): { start: string; end: string; shortest: string[] } {
  if (options) return generateScopedRoutePuzzle(countries, seed, options)
  const adjacency = buildAdjacency(countries)
  const connected = countries.filter((country) => (adjacency.get(country.iso3)?.length ?? 0) > 0)
  const random = seededRandom(seed)
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const start = connected[Math.floor(random() * connected.length)]
    const end = connected[Math.floor(random() * connected.length)]
    if (!start || !end || start.iso3 === end.iso3) continue
    const shortest = shortestPath(start.iso3, end.iso3, adjacency)
    if (shortest && shortest.length >= 3 && shortest.length <= 6) {
      return { start: start.iso3, end: end.iso3, shortest }
    }
  }
  const pairs: Array<{ start: string; end: string; shortest: string[] }> = []
  for (const start of connected) {
    for (const endCode of adjacency.get(start.iso3) ?? []) {
      const end = countries.find((item) => item.iso3 === endCode)
      if (!end) continue
      for (const candidate of connected) {
        if (candidate.iso3 === start.iso3 || candidate.iso3 === endCode) continue
        const shortest = shortestPath(start.iso3, candidate.iso3, adjacency)
        if (shortest && shortest.length >= 3 && shortest.length <= 6) pairs.push({ start: start.iso3, end: candidate.iso3, shortest })
      }
    }
  }
  const pair = seededShuffle(pairs, seed)[0]
  if (!pair) throw new Error('The country adjacency graph does not contain a solvable route puzzle.')
  return pair
}

function generateScopedRoutePuzzle(countries: Country[], seed: string, options: { continent?: string; difficulty?: RouteDifficulty }): { start: string; end: string; shortest: string[] } {
  const scopedCountries = options.continent && options.continent !== 'World'
    ? countries.filter((country) => country.continent === options.continent)
    : countries
  const adjacency = buildAdjacency(scopedCountries)
  const connected = scopedCountries.filter((country) => (adjacency.get(country.iso3)?.length ?? 0) > 0)
  if (connected.length < 2) throw new Error(`No recorded land-border route is available in ${options.continent ?? 'the world'}.`)
  const ranges: Record<RouteDifficulty, [number, number]> = {
    short: [2, 4],
    standard: [3, 6],
    long: [5, 8],
  }
  const [minimumLength, maximumLength] = ranges[options.difficulty ?? 'standard']
  const random = seededRandom(seed)
  let best: { start: string; end: string; shortest: string[] } | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const start = connected[Math.floor(random() * connected.length)]
    const end = connected[Math.floor(random() * connected.length)]
    if (!start || !end || start.iso3 === end.iso3) continue
    const shortest = shortestPath(start.iso3, end.iso3, adjacency)
    if (!shortest || shortest.length < 2) continue
    const hops = shortest.length - 1
    if (hops >= minimumLength && hops <= maximumLength) return { start: start.iso3, end: end.iso3, shortest }
    const distance = hops < minimumLength ? minimumLength - hops : hops - maximumLength
    if (distance < bestDistance) {
      best = { start: start.iso3, end: end.iso3, shortest }
      bestDistance = distance
    }
  }
  if (best) return best
  throw new Error(`No solvable land-border route is available in ${options.continent ?? 'the world'}.`)
}

export function greatCircleKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(b.lat - a.lat)
  const longitudeDelta = radians(b.lon - a.lon)
  const angle = 2 * Math.asin(Math.sqrt(
    Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitudeDelta / 2) ** 2,
  ))
  return 6371.0088 * angle
}

export function directionFromTo(from: { lat: number; lon: number }, to: { lat: number; lon: number }): string {
  const angle = (Math.atan2(to.lon - from.lon, to.lat - from.lat) * 180 / Math.PI + 360) % 360
  const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
  return directions[Math.round(angle / 45) % 8]
}

export function distanceScore(kilometres: number): number {
  if (kilometres <= 25) return 1000
  if (kilometres <= 100) return 850
  if (kilometres <= 250) return 700
  if (kilometres <= 500) return 550
  if (kilometres <= 1000) return 400
  if (kilometres <= 2500) return 250
  return 100
}

export interface GridCategory {
  id: string
  label: string
  matches: (country: Country) => boolean
}

export interface GridPreset {
  id: string
  title: string
  columns: GridCategory[]
  rows: GridCategory[]
}

export function createGridPresets(countries: Country[] = []): GridPreset[] {
  const eligible = countries.filter((country) => country.hasGeometry)
  const groups = (values: Array<string | null | undefined>, prefix: string): GridCategory[] => [...new Set(values.filter((value): value is string => Boolean(value)))].flatMap((value) => {
    if (prefix === 'continent' && value === 'Antarctic') return []
    const matches = eligible.filter((country) => country[prefix === 'continent' ? 'continent' : 'subregion'] === value).length
    if (matches < 4) return []
    return [{ id: `${prefix}-${slug(value)}`, label: value, matches: (country: Country) => country[prefix === 'continent' ? 'continent' : 'subregion'] === value }]
  })
  const continentValues = eligible.map((country) => country.continent)
  const subregionValues = eligible.map((country) => country.subregion)
  const sharedRegionLabels = new Set(
    [...new Set(continentValues.filter((value): value is string => Boolean(value)))].filter((value) => subregionValues.includes(value)),
  )
  const regions = [
    ...groups(continentValues, 'continent').map((category) => sharedRegionLabels.has(category.label) ? { ...category, label: `${category.label} · continent` } : category),
    ...groups(subregionValues, 'subregion').map((category) => sharedRegionLabels.has(category.label) ? { ...category, label: `${category.label} · subregion` } : category),
  ]
  const attributes: GridCategory[] = [
    { id: 'landlocked', label: 'Landlocked', matches: (country: Country) => country.landlocked },
    { id: 'coastline', label: 'Has a coastline', matches: (country: Country) => !country.landlocked },
    { id: 'land-neighbours', label: 'Has a land neighbour', matches: (country: Country) => country.borders.length > 0 },
    { id: 'island-no-land-border', label: 'No land neighbours', matches: (country: Country) => country.borders.length === 0 },
    { id: 'population-over-10m', label: 'Population over 10 million', matches: (country: Country) => country.population !== null && country.population >= 10_000_000 },
    { id: 'population-over-50m', label: 'Population over 50 million', matches: (country: Country) => country.population !== null && country.population >= 50_000_000 },
    { id: 'population-under-10m', label: 'Population under 10 million', matches: (country: Country) => country.population !== null && country.population < 10_000_000 },
    { id: 'area-over-500k', label: 'Area over 500,000 km²', matches: (country: Country) => country.areaKm2 !== null && country.areaKm2 >= 500_000 },
    { id: 'area-over-2m', label: 'Area over 2 million km²', matches: (country: Country) => country.areaKm2 !== null && country.areaKm2 >= 2_000_000 },
    { id: 'area-under-100k', label: 'Area under 100,000 km²', matches: (country: Country) => country.areaKm2 !== null && country.areaKm2 < 100_000 },
    { id: 'density-over-100', label: 'Population density over 100/km²', matches: (country: Country) => country.population !== null && Boolean(country.areaKm2) && country.population / country.areaKm2! >= 100 },
    { id: 'density-under-20', label: 'Population density under 20/km²', matches: (country: Country) => country.population !== null && Boolean(country.areaKm2) && country.population / country.areaKm2! < 20 },
    { id: 'capital-coordinates', label: 'Capital coordinates recorded', matches: (country: Country) => country.capitalCoordinates !== null },
  ].filter((category) => {
    const count = eligible.filter(category.matches).length
    return count >= 4 && count <= eligible.length - 4
  })

  if (regions.length < 3 || attributes.length < 3) return []

  const intersections = new Map<string, Country[]>()
  for (const region of regions) {
    for (const attribute of attributes) {
      intersections.set(`${region.id}|${attribute.id}`, eligible.filter((country) => region.matches(country) && attribute.matches(country)))
    }
  }

  const candidates: GridPreset[] = []
  const ids = new Set<string>()
  const random = seededRandom('maproom:grid-preset-pool:v2')
  const maximumAttempts = 24_000
  for (let attempt = 0; attempt < maximumAttempts && candidates.length < 240; attempt += 1) {
    const columns = chooseThree(regions, random)
    const rows = chooseThree(attributes, random)
    if (!columns || !rows) continue
    const cells = rows.flatMap((row) => columns.map((column) => intersections.get(`${column.id}|${row.id}`) ?? []))
    if (cells.some((cell) => cell.length < 2 || cell.length > 90) || !hasDistinctGridAnswers(cells)) continue
    const id = `grid-${[...columns.map((item) => item.id).sort(), ...rows.map((item) => item.id).sort()].join('-')}`
    if (ids.has(id)) continue
    ids.add(id)
    candidates.push({ id, title: 'Regions & geographic facts', columns, rows })
  }
  return candidates
}

export function gridCandidates(countries: Country[], row: GridCategory, column: GridCategory): Country[] {
  return countries.filter((country) => row.matches(country) && column.matches(country))
}

export function validGridPresets(countries: Country[]): GridPreset[] {
  return createGridPresets(countries)
}

export function gridAnswerScore(candidateCount: number): number {
  if (candidateCount <= 0) return 0
  if (candidateCount === 1) return 250
  if (candidateCount <= 3) return 200
  if (candidateCount <= 8) return 150
  return 100
}

function slug(value: string): string {
  return value.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g, '-')
}

function chooseThree<T>(values: readonly T[], random: () => number): [T, T, T] | null {
  if (values.length < 3) return null
  const first = Math.floor(random() * values.length)
  let second = Math.floor(random() * (values.length - 1))
  if (second >= first) second += 1
  let third = Math.floor(random() * (values.length - 2))
  const skipped = [first, second].sort((a, b) => a - b)
  if (third >= skipped[0]) third += 1
  if (third >= skipped[1]) third += 1
  return [values[first]!, values[second]!, values[third]!]
}

function hasDistinctGridAnswers(cells: Country[][]): boolean {
  const ordered = [...cells].sort((left, right) => left.length - right.length)
  const used = new Set<string>()
  function assign(index: number): boolean {
    if (index === ordered.length) return true
    for (const country of ordered[index]!) {
      if (used.has(country.iso3)) continue
      used.add(country.iso3)
      if (assign(index + 1)) return true
      used.delete(country.iso3)
    }
    return false
  }
  return assign(0)
}
