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
