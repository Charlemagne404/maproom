import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { GameId, GameMode, GeographyData } from '../geography/types'

export type GeographyGameProps = { data: GeographyData; mode: GameMode; date: string; seed: string }
export type GeographyGameComponent = LazyExoticComponent<ComponentType<GeographyGameProps>>

const components: Record<GameId, GeographyGameComponent> = {
  countries: lazy(() => import('./country-map/CountryIdentificationGame').then((module) => ({ default: module.CountryIdentificationGame }))),
  outlines: lazy(() => import('./outlines/OutlineGame').then((module) => ({ default: module.OutlineGame }))),
  routes: lazy(() => import('./border-route/BorderRouteGame').then((module) => ({ default: module.BorderRouteGame }))),
  flags: lazy(() => import('./flags/FlagGame').then((module) => ({ default: module.FlagGame }))),
  grid: lazy(() => import('./connections-grid/GeographyGridGame').then((module) => ({ default: module.GeographyGridGame }))),
  cities: lazy(() => import('./cities/CitiesGame').then((module) => ({ default: module.CitiesGame }))),
  connections: lazy(() => import('./connections/ConnectionsGame').then((module) => ({ default: module.ConnectionsGame }))),
  'higher-lower': lazy(() => import('./higher-lower/HigherLowerGame').then((module) => ({ default: module.HigherLowerGame }))),
  neighbours: lazy(() => import('./neighbours/NeighbourGame').then((module) => ({ default: module.NeighbourGame }))),
  distance: lazy(() => import('./distance/DistanceGame').then((module) => ({ default: module.DistanceGame }))),
  rivers: lazy(() => import('./riverways/RiverwaysGame').then((module) => ({ default: module.RiverwaysGame }))),
  'latitude-ladder': lazy(() => import('./latitude-ladder/LatitudeLadderGame').then((module) => ({ default: module.LatitudeLadderGame }))),
  'historical-geography': lazy(() => import('./historical-geography/HistoricalGeographyGame').then((module) => ({ default: module.HistoricalGeographyGame }))),
  'projection-match': lazy(() => import('./projection-match/ProjectionMatchGame').then((module) => ({ default: module.ProjectionMatchGame }))),
}

export function getGameComponent(gameId: GameId): GeographyGameComponent {
  return components[gameId]
}
