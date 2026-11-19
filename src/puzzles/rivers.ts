import { geoCentroid, geoContains } from 'd3-geo'
import type { Country, Coordinates, GeoFeature, RiverFeature } from '../geography/types'
import { directionFromTo, greatCircleKm, normalizeAnswer, seededShuffle } from './engine'

export interface RiverQuestion {
  id: string
  name: string
  aliases: string[]
  scaleRank: number
  feature: GeoFeature
}

export type RiverDifficulty = 'easy' | 'medium' | 'hard'

const RANK_LIMIT: Record<RiverDifficulty, number> = { easy: 2, medium: 3, hard: 4 }

export function riverRankLimit(difficulty: RiverDifficulty): number {
  return RANK_LIMIT[difficulty]
}

export interface RiverCentreProximity {
  distanceKm: number
  direction: string | null
}

/** Compare the calculated centres of two generalized river traces. */
export function riverCentreProximity(guess: GeoFeature, target: GeoFeature): RiverCentreProximity | null {
  const from = riverCentre(target)
  const to = riverCentre(guess)
  if (!from || !to) return null
  const distanceKm = greatCircleKm(from, to)
  return {
    distanceKm: Math.round(distanceKm / 50) * 50,
    direction: distanceKm < 25 ? null : directionFromTo(from, to),
  }
}

/** Returns the catalogued country containing the calculated centre of a mapped river trace. */
export function riverCentreCountry(
  river: GeoFeature,
  countryFeatures: GeoFeature[],
  countriesByCode: ReadonlyMap<string, Country>,
): string | null {
  const [longitude, latitude] = geoCentroid(river as unknown as GeoJSON.Feature)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 90) return null
  const point: [number, number] = [longitude, latitude]
  for (const feature of countryFeatures) {
    if (!geoContains(feature as unknown as GeoJSON.Feature, point)) continue
    const code = feature.properties.iso3
    const country = code ? countriesByCode.get(code) : undefined
    if (country) return country.name
  }
  return null
}

function riverCentre(feature: GeoFeature): Coordinates | null {
  const [longitude, latitude] = geoCentroid(feature as unknown as GeoJSON.Feature)
  return Number.isFinite(longitude) && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    ? { lat: latitude, lon: longitude }
    : null
}

export function buildRiverQuestionPool(features: RiverFeature[]): RiverQuestion[] {
  const groups = new Map<string, { name: string; aliases: Set<string>; rank: number; features: RiverFeature[] }>()
  for (const feature of features) {
    if (!isUsableRiver(feature)) continue
    const names = riverNames(feature)
    const name = canonicalRiverName(feature)
    if (!name) continue
    const key = normalizeAnswer(name)
    if (!key) continue
    const group = groups.get(key) ?? { name, aliases: new Set<string>(), rank: 4, features: [] }
    group.rank = Math.min(group.rank, feature.properties.scaleRank)
    group.features.push(feature)
    for (const alias of names) group.aliases.add(alias)
    groups.set(key, group)
  }

  const entries = [...groups.entries()].map(([key, group]) => ({
    key,
    name: group.name,
    aliases: [...group.aliases],
    rank: group.rank,
    features: group.features,
  }))
  const owners = new Map<string, Set<string>>()
  for (const entry of entries) for (const alias of entry.aliases) {
    const key = normalizeAnswer(alias)
    const ownersForAlias = owners.get(key) ?? new Set<string>()
    ownersForAlias.add(entry.key)
    owners.set(key, ownersForAlias)
  }

  return entries.map((entry): RiverQuestion => {
    const aliases = entry.aliases.filter((alias) => normalizeAnswer(alias) === entry.key || owners.get(normalizeAnswer(alias))?.size === 1)
    const lines = entry.features.flatMap((feature) => lineCoordinates(feature))
    return {
      id: `river-${entry.key.replaceAll(' ', '-')}`,
      name: entry.name,
      aliases,
      scaleRank: entry.rank,
      feature: {
        type: 'Feature',
        id: `river-${entry.key}`,
        properties: { iso3: null, name: entry.name, nameLong: null, continent: null, mapUnit: null, naturalEarthId: null },
        geometry: { type: 'MultiLineString', coordinates: lines },
      },
    }
  }).filter((question) => question.feature.geometry.type === 'MultiLineString' && question.feature.geometry.coordinates.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function pickRiverQuestion(pool: RiverQuestion[], seed: string, excludedIds: readonly string[] = []): RiverQuestion | undefined {
  const excluded = new Set(excludedIds)
  return seededShuffle(pool.filter((question) => !excluded.has(question.id)), seed)[0]
}

function isUsableRiver(feature: RiverFeature): boolean {
  return typeof feature.properties.name === 'string'
    && feature.properties.scaleRank >= 1
    && feature.properties.scaleRank <= 4
    && (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString')
}

function riverNames(feature: RiverFeature): string[] {
  return uniqueNames([
    ...splitNames(feature.properties.nameEnglish),
    ...splitNames(feature.properties.name),
    ...splitNames(feature.properties.nameAlt),
  ])
}

function canonicalRiverName(feature: RiverFeature): string | undefined {
  return splitNames(feature.properties.nameEnglish)[0]
    ?? splitNames(feature.properties.name)[0]
    ?? splitNames(feature.properties.nameAlt)[0]
}

function splitNames(value: string | null): string[] {
  return typeof value === 'string' ? value.split(/[;,|]/u).map((name) => name.trim()).filter(Boolean) : []
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const normalized = normalizeAnswer(value)
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function lineCoordinates(feature: RiverFeature): GeoJSON.Position[][] {
  return feature.geometry.type === 'LineString'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates
}
