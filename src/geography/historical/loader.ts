import type { HistoricalAtlasManifest, HistoricalAtlasMap, HistoricalFlagEntry, HistoricalFlagsManifest, HistoricalManifest, HistoricalMap } from './types'

const MANIFEST_URL = '/data/historical/manifest.json'
const ATLAS_MANIFEST_URL = '/data/historical/atlas/v2/manifest.json'
const FLAGS_MANIFEST_URL = '/data/historical/flags/v1/manifest.json'
let manifestPromise: Promise<HistoricalManifest> | null = null
let atlasManifestPromise: Promise<HistoricalAtlasManifest> | null = null
let flagsManifestPromise: Promise<HistoricalFlagsManifest> | null = null

export function loadHistoricalMaps(): Promise<HistoricalMap[]> {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Historical map data could not be loaded (${response.status}).`)
        return validateHistoricalManifest(await response.json())
      })
      .catch((error: unknown) => {
        manifestPromise = null
        throw error
      })
  }
  return manifestPromise.then((manifest) => manifest.maps)
}

export function loadHistoricalAtlasMaps(): Promise<HistoricalAtlasMap[]> {
  if (!atlasManifestPromise) {
    atlasManifestPromise = fetch(ATLAS_MANIFEST_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error(`The expanded historical atlas could not be loaded (${response.status}).`)
        return validateHistoricalAtlasManifest(await response.json())
      })
      .catch((error: unknown) => {
        atlasManifestPromise = null
        throw error
      })
  }
  return atlasManifestPromise.then((manifest) => manifest.maps)
}

export function loadHistoricalFlags(): Promise<HistoricalFlagEntry[]> {
  if (!flagsManifestPromise) {
    flagsManifestPromise = fetch(FLAGS_MANIFEST_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error(`The historical flag catalogue could not be loaded (${response.status}).`)
        return validateHistoricalFlagsManifest(await response.json())
      })
      .catch((error: unknown) => {
        flagsManifestPromise = null
        throw error
      })
  }
  return flagsManifestPromise.then((manifest) => manifest.items)
}

export function validateHistoricalManifest(value: unknown): HistoricalManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.dataset) || !Array.isArray(value.maps)) {
    throw new Error('The historical map manifest has an unsupported schema.')
  }
  if (value.maps.length < 20) throw new Error('The historical map collection is incomplete.')
  const ids = new Set<string>()
  const years = new Set<number>()
  const manifest = value as unknown as HistoricalManifest
  for (const map of manifest.maps) {
    if (!isRecord(map) || typeof map.id !== 'string' || ids.has(map.id) || years.has(map.depictedYear)) {
      throw new Error('The historical map manifest contains a duplicate or malformed map.')
    }
    ids.add(map.id)
    years.add(map.depictedYear)
    if (!Number.isInteger(map.depictedYear) || map.depictedYear < 1886 || map.depictedYear > 2023
      || map.depictedDate !== `${map.depictedYear}-12-31`
      || map.mapPublishedYear !== null
      || typeof map.assetUrl !== 'string' || !/^\/data\/historical\/maps\/historical-map-\d{2}\.svg$/.test(map.assetUrl)
      || typeof map.assetSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(map.assetSha256)
      || map.originalMapUrl !== null
      || typeof map.geographicContext !== 'string' || !map.geographicContext
      || typeof map.historicalContext !== 'string' || !map.historicalContext
      || typeof map.datingUncertainty !== 'string' || !map.datingUncertainty
      || !Array.isArray(map.contextSources) || map.contextSources.length === 0
      || !isRecord(map.source) || map.source.license !== 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International'
      || !Array.isArray(map.source.authors) || !map.source.authors.length
      || typeof map.source.attribution !== 'string' || !map.source.attribution
      || typeof map.source.originalUrl !== 'string' || !map.source.originalUrl.startsWith('https://')) {
      throw new Error(`Historical map “${map.id}” is missing a required date, rights, attribution or context field.`)
    }
    for (const citation of map.contextSources) {
      if (!isRecord(citation) || typeof citation.title !== 'string' || typeof citation.url !== 'string' || !citation.url.startsWith('https://')) {
        throw new Error(`Historical map “${map.id}” has an invalid context citation.`)
      }
    }
  }
  if (typeof manifest.snapshotConvention !== 'string' || !manifest.snapshotConvention
    || manifest.dataset.license !== 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International'
    || typeof manifest.dataset.originalUrl !== 'string' || !manifest.dataset.originalUrl.startsWith('https://')
    || typeof manifest.dataset.dataSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(manifest.dataset.dataSha256)) {
    throw new Error('The historical map dataset source or license metadata is incomplete.')
  }
  return manifest
}

export function validateHistoricalAtlasManifest(value: unknown): HistoricalAtlasManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.source) || !Array.isArray(value.maps)) {
    throw new Error('The expanded historical atlas manifest has an unsupported schema.')
  }
  if (value.maps.length < 20) throw new Error('The expanded historical atlas collection is incomplete.')
  const ids = new Set<string>()
  const manifest = value as unknown as HistoricalAtlasManifest
  const source = manifest.source
  if (source.title !== 'Cliopatria' || source.version !== 'v0.2.1'
    || source.license !== 'Creative Commons Attribution 4.0 International'
    || source.licenseUrl !== 'https://creativecommons.org/licenses/by/4.0/'
    || !/^https:\/\//.test(source.repositoryUrl) || !/^https:\/\//.test(source.releasePageUrl)
    || !/^[a-f0-9]{40}$/.test(source.releaseCommit)
    || !/^[a-f0-9]{64}$/.test(source.archiveSha256) || !/^[a-f0-9]{64}$/.test(source.dataSha256)
    || typeof source.attribution !== 'string' || !source.attribution) {
    throw new Error('The expanded historical atlas source, version or reuse terms are incomplete.')
  }
  for (const map of manifest.maps) {
    if (!isRecord(map) || typeof map.id !== 'string' || ids.has(map.id)
      || !Number.isInteger(map.sampleYear) || map.sampleYear === 0
      || !Number.isInteger(map.acceptedFromYear) || map.acceptedFromYear === 0
      || !Number.isInteger(map.acceptedToYear) || map.acceptedToYear === 0
      || map.acceptedFromYear > map.acceptedToYear
      || map.sampleYear < map.acceptedFromYear || map.sampleYear > map.acceptedToYear
      || typeof map.assetUrl !== 'string' || !/^\/data\/historical\/atlas\/v2\/maps\/[a-z0-9-]+\.svg$/.test(map.assetUrl)
      || typeof map.assetSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(map.assetSha256)
      || !isRecord(map.region) || typeof map.region.id !== 'string' || typeof map.region.name !== 'string'
      || !Number.isFinite(map.region.west) || !Number.isFinite(map.region.east)
      || !Number.isFinite(map.region.south) || !Number.isFinite(map.region.north)
      || map.region.west < -180 || map.region.east > 180 || map.region.west >= map.region.east
      || map.region.south < -90 || map.region.north > 90 || map.region.south >= map.region.north
      || typeof map.visibleClue !== 'string' || !map.visibleClue
      || typeof map.historicalContext !== 'string' || !map.historicalContext
      || typeof map.uncertainty !== 'string' || !map.uncertainty
      || !Array.isArray(map.contextSources) || map.contextSources.length === 0
      || !Array.isArray(map.polities) || map.polities.length === 0
      || ![1, 2, 3].includes(map.visualDistinctiveness)
      || !Number.isInteger(map.sourceFeatureCount) || map.sourceFeatureCount < 1) {
      throw new Error(`Historical atlas map “${String(map?.id ?? 'unknown')}” is missing a valid time, frame, source or clue field.`)
    }
    ids.add(map.id)
    for (const polity of map.polities) {
      if (!isRecord(polity) || typeof polity.name !== 'string' || !polity.name
        || (polity.wikipediaUrl !== null && (typeof polity.wikipediaUrl !== 'string' || !polity.wikipediaUrl.startsWith('https://')))
        || (polity.wikidataUrl !== null && (typeof polity.wikidataUrl !== 'string' || !polity.wikidataUrl.startsWith('https://www.wikidata.org/')))) {
        throw new Error(`Historical atlas map “${map.id}” has an invalid polity identity.`)
      }
    }
    for (const citation of map.contextSources) {
      if (!isRecord(citation) || typeof citation.title !== 'string' || typeof citation.url !== 'string' || !citation.url.startsWith('https://')) {
        throw new Error(`Historical atlas map “${map.id}” has an invalid context citation.`)
      }
    }
  }
  if (typeof manifest.snapshotConvention !== 'string' || !manifest.snapshotConvention) {
    throw new Error('The expanded historical atlas snapshot convention is missing.')
  }
  return manifest
}

export function validateHistoricalFlagsManifest(value: unknown): HistoricalFlagsManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.contentVersion !== 'historical-flags-v1' || !Array.isArray(value.items)
    || value.items.length < 16 || value.artworkLicense !== 'Creative Commons Attribution 4.0 International'
    || value.artworkLicenseUrl !== 'https://creativecommons.org/licenses/by/4.0/'
    || typeof value.scope !== 'string' || !value.scope) {
    throw new Error('The historical flag catalogue has an unsupported or incomplete schema.')
  }
  const manifest = value as unknown as HistoricalFlagsManifest
  const ids = new Set<string>()
  const entities = new Set<string>()
  for (const item of manifest.items) {
    if (!isRecord(item) || typeof item.id !== 'string' || ids.has(item.id)
      || typeof item.entity !== 'string' || !item.entity || typeof item.entityType !== 'string' || !item.entityType
      || typeof item.flagName !== 'string' || !item.flagName
      || !Number.isInteger(item.periodStartYear) || Number(item.periodStartYear) < 1
      || !Number.isInteger(item.periodEndYear) || Number(item.periodEndYear) < Number(item.periodStartYear)
      || typeof item.periodLabel !== 'string' || !item.periodLabel || typeof item.region !== 'string' || !item.region
      || !['documented', 'reconstructed'].includes(item.designStatus)
      || typeof item.artworkNote !== 'string' || !item.artworkNote || typeof item.visibleClue !== 'string' || !item.visibleClue
      || typeof item.explanation !== 'string' || !item.explanation || !isRecord(item.source)
      || typeof item.source.title !== 'string' || !item.source.title || typeof item.source.url !== 'string' || !item.source.url.startsWith('https://')
      || item.artworkLicense !== manifest.artworkLicense || item.artworkLicenseUrl !== manifest.artworkLicenseUrl
      || typeof item.artworkAttribution !== 'string' || !item.artworkAttribution
      || (item.additionalSources !== undefined && !Array.isArray(item.additionalSources))
      || typeof item.assetUrl !== 'string' || !/^\/data\/historical\/flags\/v1\/flags\/[a-z0-9-]+\.svg$/.test(item.assetUrl)
      || typeof item.assetSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.assetSha256)) {
      throw new Error(`Historical flag “${String(item?.id ?? 'unknown')}” is missing a valid period, attribution, artwork or source.`)
    }
    ids.add(item.id)
    entities.add(item.entity)
    for (const citation of item.additionalSources ?? []) {
      if (!isRecord(citation) || typeof citation.title !== 'string' || !citation.title
        || typeof citation.url !== 'string' || !citation.url.startsWith('https://')) {
        throw new Error(`Historical flag “${item.id}” has an invalid additional source.`)
      }
    }
  }
  if (entities.size < 14) throw new Error('The historical flag set needs broader political coverage.')
  return manifest
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
