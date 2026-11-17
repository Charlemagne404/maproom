export interface Country {
  iso3: string
  parentIso3: string | null
  iso2: string | null
  name: string
  officialName: string
  aliases: string[]
  continent: string | null
  subregion: string | null
  capital: string | null
  capitals: string[]
  capitalCoordinates: Coordinates | null
  coordinates: Coordinates | null
  population: number | null
  populationYear: string | null
  areaKm2: number | null
  landlocked: boolean
  borders: string[]
  independent: boolean
  flagCode: string
  flagEligible?: boolean
  hasGeometry: boolean
  regionCount: number
  regionSource: RegionSource | null
}

export interface Coordinates {
  lat: number
  lon: number
}

export interface RegionSource {
  provider: string
  boundaryId: string
  year: string
  license: string
  source: string
  sourceUrl: string
  licenseUrl: string
  attribution: string
  url: string
  releaseRef: string | null
}

export interface GeoProperties {
  iso3: string | null
  name: string
  nameLong: string | null
  continent: string | null
  mapUnit: string | null
  naturalEarthId: number | null
  id?: string
  isoCode?: string | null
  countryIso3?: string
  adminLevel?: number
  [key: string]: unknown
}

export interface GeoFeature {
  type: 'Feature'
  id?: string | number
  properties: GeoProperties
  geometry: GeoJSON.Geometry
}

export interface City {
  id: string
  name: string
  aliases: string[]
  lat: number
  lon: number
  countryIso2: string
  countryIso3: string
  admin1Code: string | null
  population: number
  featureCode: string
  capital: boolean
}

export interface GeographyData {
  countries: Country[]
  features: GeoFeature[]
  countriesByCode: Map<string, Country>
  featuresByCode: Map<string, GeoFeature[]>
}

export interface RegionCollection {
  type: 'FeatureCollection'
  countryIso3: string
  boundaryId: string
  year: string
  features: GeoFeature[]
}

export interface CityData {
  cities: City[]
}

export type GameId = 'countries' | 'outlines' | 'routes' | 'flags' | 'grid' | 'cities' | 'connections' | 'higher-lower' | 'neighbours' | 'distance'
export type GameMode = 'daily' | 'freeplay'

export interface GameResult {
  id: string
  gameId: GameId
  mode: GameMode
  puzzleId: string
  date: string
  startedAt: string
  completedAt: string
  score: number
  correct: number
  total: number
  completed: boolean
  elapsedSeconds: number
  detail?: Record<string, unknown>
}

export interface GameSessionSnapshot {
  id: string
  gameId: GameId
  mode: GameMode
  puzzleId: string
  seed: string
  date: string
  startedAt: string
  updatedAt: string
  version: number
  payload: Record<string, unknown>
}

export interface UserSettings {
  timeZone: string
  mapLabels: boolean
  catalogue: 'standard' | 'extended'
  theme: 'light' | 'dark' | 'system'
  sound: boolean
  hasSeenInstallHelp: boolean
}

export interface AppState {
  settings: UserSettings
  favorites: GameId[]
  history: GameResult[]
  sessions: GameSessionSnapshot[]
  storageAvailable: boolean
}
