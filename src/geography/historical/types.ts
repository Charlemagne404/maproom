export interface HistoricalCitation {
  title: string
  url: string
}

export interface HistoricalMapSource {
  title: string
  originalUrl: string
  releasePageUrl: string
  institution: string
  authors: string[]
  license: string
  licenseUrl: string
  attribution: string
  adaptationTerms: string
}

export interface HistoricalMap {
  id: string
  depictedYear: number
  depictedDate: string
  mapPublishedYear: number | null
  assetUrl: string
  assetSha256: string
  originalMapUrl: string | null
  source: HistoricalMapSource
  geographicContext: string
  historicalContext: string
  contextSources: HistoricalCitation[]
  datingUncertainty: string
  sourceFeatureCount: number
}

export interface HistoricalManifest {
  schemaVersion: number
  dataset: {
    title: string
    originalUrl: string
    releasePageUrl: string
    dataSha256: string
    sourceDataDateRange: string
    license: string
    licenseUrl: string
  }
  snapshotConvention: string
  maps: HistoricalMap[]
}

export interface HistoricalAtlasSource {
  title: string
  version: string
  repositoryUrl: string
  releasePageUrl: string
  releaseCommit: string
  archiveUrl: string
  archiveSha256: string
  dataSha256: string
  license: string
  licenseUrl: string
  attribution: string
}

export interface HistoricalAtlasRegion {
  id: string
  name: string
  west: number
  east: number
  south: number
  north: number
}

export interface HistoricalAtlasMap {
  id: string
  sampleYear: number
  acceptedFromYear: number
  acceptedToYear: number
  assetUrl: string
  assetSha256: string
  region: HistoricalAtlasRegion
  visibleClue: string
  historicalContext: string
  contextSources: HistoricalCitation[]
  uncertainty: string
  visualDistinctiveness: 1 | 2 | 3
  polities: Array<{
    name: string
    wikipediaUrl: string | null
    wikidataUrl: string | null
  }>
  sourceFeatureCount: number
}

export interface HistoricalAtlasManifest {
  schemaVersion: 1
  source: HistoricalAtlasSource
  snapshotConvention: string
  maps: HistoricalAtlasMap[]
}

export interface HistoricalFlagEntry {
  id: string
  entity: string
  entityType: string
  flagName: string
  periodStartYear: number
  periodEndYear: number
  periodLabel: string
  region: string
  designStatus: 'documented' | 'reconstructed'
  artworkNote: string
  visibleClue: string
  explanation: string
  source: HistoricalCitation
  artworkLicense: string
  artworkLicenseUrl: string
  artworkAttribution: string
  additionalSources?: HistoricalCitation[]
  assetUrl: string
  assetSha256: string
}

export interface HistoricalFlagsManifest {
  schemaVersion: 1
  contentVersion: string
  artworkLicense: string
  artworkLicenseUrl: string
  scope: string
  items: HistoricalFlagEntry[]
}
