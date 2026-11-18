import type { HistoricalManifest, HistoricalMap } from './types'

const MANIFEST_URL = '/data/historical/manifest.json'
let manifestPromise: Promise<HistoricalManifest> | null = null

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
