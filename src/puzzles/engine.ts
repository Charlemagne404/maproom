import type { Country, GameId } from '../geography/types'

export { GAME_IDS } from '../geography/types'
export const PUZZLE_VERSION = 2
// Eligibility pools changed for the original daily games. Keep completed history
// intact while assigning the new, standard-country puzzle identities.
const GAME_PUZZLE_VERSIONS: Partial<Record<GameId, number>> = {
  countries: 2,
  outlines: 3,
  routes: 2,
  flags: 2,
  grid: 3,
  cities: 2,
}

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

/** Finds a deterministic ordering that uses each selected intermediate country once. */
export function findRouteOrdering(start: string, end: string, selected: string[], adjacency: Map<string, string[]>): string[] | null {
  if (!start || !end || start === end || new Set(selected).size !== selected.length) return null
  if (selected.includes(start) || selected.includes(end)) return null
  const selectedSet = new Set(selected)
  const orderedSelection = [...selectedSet].sort()
  const visited = new Set<string>([start])
  const route = [start]

  function search(current: string): string[] | null {
    if (route.length === selected.length + 2) return current === end ? [...route] : null
    const candidates = (adjacency.get(current) ?? [])
      .filter((code) => code === end ? selectedSet.size === route.length - 1 : selectedSet.has(code) && !visited.has(code))
      .sort((left, right) => left.localeCompare(right))
    for (const code of candidates) {
      if (code === end) {
        route.push(end)
        return [...route]
      }
      visited.add(code)
      route.push(code)
      const found = search(code)
      if (found) return found
      route.pop()
      visited.delete(code)
    }
    return null
  }

  // Sorting the selected codes makes the returned ordering independent of entry order.
  for (const code of orderedSelection) {
    if (!adjacency.has(code)) return null
  }
  return search(start)
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
  const longitudeDelta = radians(shortestLongitudeDelta(a.lon, b.lon))
  const angle = 2 * Math.asin(Math.sqrt(
    Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitudeDelta / 2) ** 2,
  ))
  return 6371.0088 * angle
}

export function directionFromTo(from: { lat: number; lon: number }, to: { lat: number; lon: number }): string {
  const longitudeDelta = shortestLongitudeDelta(from.lon, to.lon)
  const angle = (Math.atan2(longitudeDelta, to.lat - from.lat) * 180 / Math.PI + 360) % 360
  const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
  return directions[Math.round(angle / 45) % 8]
}

function shortestLongitudeDelta(from: number, to: number): number {
  const rawDelta = to - from
  const wrapped = ((rawDelta + 540) % 360) - 180
  if (Math.abs(wrapped) === 180) return rawDelta >= 0 ? 180 : -180
  return wrapped
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

const UN_M49_SOUTHERN_EUROPE = new Set(['ALB', 'AND', 'BIH', 'HRV', 'GIB', 'GRC', 'VAT', 'ITA', 'MLT', 'MNE', 'MKD', 'PRT', 'SMR', 'SRB', 'SVN', 'ESP'])
const EU_MEMBER_STATES_2026 = new Set(['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE'])

export function createGridPresets(countries: Country[] = [], options: { expanded?: boolean } = {}): GridPreset[] {
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

  if (options.expanded) {
    const southernEuropeCount = eligible.filter((country) => UN_M49_SOUTHERN_EUROPE.has(country.iso3)).length
    if (southernEuropeCount >= 4) {
      regions.push({
        id: 'm49-southern-europe',
        label: 'Southern Europe · UN M49',
        matches: (country: Country) => UN_M49_SOUTHERN_EUROPE.has(country.iso3),
      })
    }
    const expandedAttributes: GridCategory[] = [
      { id: 'eu-member-2026', label: 'European Union member', matches: (country: Country) => EU_MEMBER_STATES_2026.has(country.iso3) },
      { id: 'land-neighbours-five-plus', label: '5 or more recorded land neighbours', matches: (country: Country) => country.borders.length >= 5 },
      { id: 'population-2023-10-to-50m', label: '2023 population: 10–50 million', matches: (country: Country) => country.populationYear === '2023' && country.population !== null && country.population >= 10_000_000 && country.population < 50_000_000 },
      { id: 'area-2023-over-1m', label: 'Area over 1 million km²', matches: (country: Country) => country.areaKm2 !== null && country.areaKm2 >= 1_000_000 },
      { id: 'capital-north-equator', label: 'Capital north of the equator', matches: (country: Country) => country.capitalCoordinates !== null && country.capitalCoordinates.lat >= 0 },
      { id: 'capital-south-equator', label: 'Capital south of the equator', matches: (country: Country) => country.capitalCoordinates !== null && country.capitalCoordinates.lat < 0 },
    ].filter((category) => {
      const count = eligible.filter(category.matches).length
      return count >= 4 && count <= eligible.length - 4
    })
    attributes.push(...expandedAttributes)
  }

  if (regions.length < 3 || attributes.length < 3) return []

  const intersections = new Map<string, Country[]>()
  for (const region of regions) {
    for (const attribute of attributes) {
      intersections.set(`${region.id}|${attribute.id}`, eligible.filter((country) => region.matches(country) && attribute.matches(country)))
    }
  }

  const candidates: GridPreset[] = []
  const ids = new Set<string>()
  const addCandidate = (columns: GridCategory[], rows: GridCategory[], expanded: boolean) => {
    const cells = rows.flatMap((row) => columns.map((column) => intersections.get(`${column.id}|${row.id}`) ?? []))
    if (columns.length !== 3 || rows.length !== 3 || cells.some((cell) => cell.length < 2 || cell.length > 90) || !hasDistinctGridAnswers(cells)) return
    const id = `grid-${[...columns.map((item) => item.id).sort(), ...rows.map((item) => item.id).sort()].join('-')}`
    if (ids.has(id)) return
    ids.add(id)
    candidates.push({ id, title: expanded ? 'Regions & map facts' : 'Regions & geographic facts', columns, rows })
  }
  if (options.expanded) {
    const southernEurope = regions.find((category) => category.id === 'm49-southern-europe')
    const europe = regions.find((category) => category.id === 'continent-europe')
    const asia = regions.find((category) => category.id === 'continent-asia')
    const westernEurope = regions.find((category) => category.id === 'subregion-western-europe')
    const landlocked = attributes.find((category) => category.id === 'landlocked')
    const coastline = attributes.find((category) => category.id === 'coastline')
    const populationOverTenMillion = attributes.find((category) => category.id === 'population-over-10m')
    const euMember = attributes.find((category) => category.id === 'eu-member-2026')
    if (southernEurope && europe && asia && landlocked && coastline && populationOverTenMillion) {
      addCandidate([southernEurope, europe, asia], [landlocked, coastline, populationOverTenMillion], true)
    }
    if (southernEurope && europe && westernEurope && euMember && coastline && populationOverTenMillion) {
      addCandidate([southernEurope, europe, westernEurope], [euMember, coastline, populationOverTenMillion], true)
    }
  }
  const random = seededRandom(options.expanded ? 'maproom:grid-preset-pool:v3' : 'maproom:grid-preset-pool:v2')
  const maximumAttempts = 24_000
  for (let attempt = 0; attempt < maximumAttempts && candidates.length < 240; attempt += 1) {
    const columns = chooseThree(regions, random)
    const rows = chooseThree(attributes, random)
    if (!columns || !rows) continue
    addCandidate(columns, rows, Boolean(options.expanded))
    if (candidates.length >= 240) break
  }
  return candidates
}

export function gridCandidates(countries: Country[], row: GridCategory, column: GridCategory): Country[] {
  return countries.filter((country) => row.matches(country) && column.matches(country))
}

export function validGridPresets(countries: Country[], options: { expanded?: boolean } = {}): GridPreset[] {
  return createGridPresets(countries, options)
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
