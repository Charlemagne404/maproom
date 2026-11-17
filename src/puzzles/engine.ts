import type { Country, GameId } from '../geography/types'

export const GAME_IDS: GameId[] = ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities']
export const PUZZLE_VERSION = 1

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
  return `${gameId}:${date}:v${PUZZLE_VERSION}`
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

export function generateRoutePuzzle(countries: Country[], seed: string): { start: string; end: string; shortest: string[] } {
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

export function createGridPresets(): GridPreset[] {
  const continents = (continent: string): GridCategory => ({
    id: `continent-${continent.toLowerCase().replaceAll(' ', '-')}`,
    label: continent,
    matches: (country) => country.continent?.toLowerCase() === continent.toLowerCase(),
  })
  const landlocked: GridCategory = { id: 'landlocked', label: 'Landlocked', matches: (country) => country.landlocked }
  const coastal: GridCategory = { id: 'coastal', label: 'Has a coastline', matches: (country) => !country.landlocked }
  const population = (threshold: number): GridCategory => ({
    id: `population-${threshold}`,
    label: `Population over ${threshold / 1_000_000} million`,
    matches: (country) => (country.population ?? 0) >= threshold,
  })
  const area = (threshold: number): GridCategory => ({
    id: `area-${threshold}`,
    label: `Area over ${threshold.toLocaleString('en')} km²`,
    matches: (country) => (country.areaKm2 ?? 0) >= threshold,
  })
  return [
    {
      id: 'continents-land-and-people',
      title: 'Land, sea & population',
      columns: [continents('Europe'), continents('Africa'), continents('Asia')],
      rows: [landlocked, coastal, population(25_000_000)],
    },
    {
      id: 'continents-shape-and-scale',
      title: 'Borders & scale',
      columns: [continents('Europe'), continents('Asia'), continents('South America')],
      rows: [landlocked, coastal, area(500_000)],
    },
  ]
}

export function gridCandidates(countries: Country[], row: GridCategory, column: GridCategory): Country[] {
  return countries.filter((country) => row.matches(country) && column.matches(country))
}

export function validGridPresets(countries: Country[]): GridPreset[] {
  return createGridPresets().filter((preset) =>
    preset.rows.every((row) => preset.columns.every((column) => gridCandidates(countries, row, column).length > 0)),
  )
}

export function gridAnswerScore(candidateCount: number): number {
  return candidateCount > 0 ? Math.max(1, Math.round(1000 / candidateCount)) : 0
}
