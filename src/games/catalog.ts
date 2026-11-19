import { AlignHorizontalSpaceAround, ArrowDownUp, BarChart3, Clock3, Compass, Flag, Globe2, Grid3X3, Map, MapPin, Route, Shuffle, Waves, type LucideIcon } from 'lucide-react'
import type { GameId } from '../geography/types'

// Daily games are curated explicitly. Registering a game in `games` never opts it in.
export const DAILY_GAME_IDS: readonly GameId[] = ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities', 'rivers', 'latitude-ladder']

export function isDailyGame(gameId: GameId): boolean {
  return DAILY_GAME_IDS.includes(gameId)
}

export interface GameInfo {
  id: GameId
  title: string
  shortTitle: string
  category: string
  description: string
  action: string
  icon: LucideIcon
  path: string
  requiresCountryGeometry: boolean
  formats?: GameFormat[]
}

export interface GameFormat {
  id: string
  title: string
  description: string
}

export const games: GameInfo[] = [
  { id: 'countries', title: 'Find the country', shortTitle: 'Country map', category: 'Identify places', description: 'Read the clue, then find the country on a living map.', action: 'Play map quiz', icon: Map, path: '/games/countries', requiresCountryGeometry: true },
  { id: 'outlines', title: 'Country Outline Quiz', shortTitle: 'Outlines', category: 'Identify places', description: 'Recognise a place by the shape of its borders.', action: 'Play outline', icon: Compass, path: '/games/outlines', requiresCountryGeometry: true },
  { id: 'routes', title: 'Border route', shortTitle: 'Border route', category: 'Maps & movement', description: 'Cross the map one shared land border at a time.', action: 'Build a route', icon: Route, path: '/games/routes', requiresCountryGeometry: true },
  { id: 'flags', title: 'Flag Match', shortTitle: 'Flags', category: 'Identify places', description: 'Match a flag to its country, or the other way around.', action: 'Play flags', icon: Flag, path: '/games/flags', formats: [
    { id: 'flag-to-country', title: 'Identify the country', description: 'See a national flag and choose its country.' },
    { id: 'country-to-flag', title: 'Find the flag', description: 'See a country and choose its flag.' },
  ], requiresCountryGeometry: false },
  { id: 'grid', title: 'Geography grid', shortTitle: 'Geography grid', category: 'Clues & comparisons', description: 'Fill nine squares with different countries that fit both the row and column clues.', action: 'Open the grid', icon: Grid3X3, path: '/games/grid', requiresCountryGeometry: false },
  { id: 'cities', title: 'Capitals & cities', shortTitle: 'Cities', category: 'Identify places', description: 'Name a capital, place a city, or read the coordinates.', action: 'Explore cities', icon: Globe2, path: '/games/cities', formats: [
    { id: 'country-to-capital', title: 'Country to capital', description: 'Name the capital for each country.' },
    { id: 'capital-to-country', title: 'Capital to country', description: 'Match a capital city to its country.' },
    { id: 'locate-city', title: 'Locate a city', description: 'Place a city on the map using its name.' },
    { id: 'identify-city', title: 'Identify a city', description: 'Use the map marker to name the city.' },
  ], requiresCountryGeometry: true },
  { id: 'connections', title: 'Geography Connections', shortTitle: 'Connections', category: 'Clues & comparisons', description: 'Select countries in groups of four to uncover four shared geographic connections. Four mistakes end the round.', action: 'Find the links', icon: Shuffle, path: '/games/connections', requiresCountryGeometry: false },
  { id: 'higher-lower', title: 'Higher or Lower: Countries', shortTitle: 'Higher or Lower', category: 'Clues & comparisons', description: 'Compare countries using sourced population, area and density facts.', action: 'Make a comparison', icon: ArrowDownUp, path: '/games/higher-lower', requiresCountryGeometry: false },
  { id: 'neighbours', title: 'Neighbour Challenge', shortTitle: 'Neighbours', category: 'Maps & movement', description: 'Complete every land border around a country.', action: 'Find the borders', icon: Map, path: '/games/neighbours', requiresCountryGeometry: true },
  { id: 'distance', title: 'City Distance & Direction', shortTitle: 'City distance', category: 'Maps & movement', description: 'Use real coordinates to compare cities across the world.', action: 'Compare places', icon: MapPin, path: '/games/distance', requiresCountryGeometry: false },
  { id: 'rivers', title: 'Riverways', shortTitle: 'Riverways', category: 'Physical geography', description: 'Trace a major river on the map, then name the watercourse.', action: 'Trace a river', icon: Waves, path: '/games/rivers', requiresCountryGeometry: true },
  { id: 'latitude-ladder', title: 'Latitude Ladder', shortTitle: 'Latitude Ladder', category: 'Spatial reasoning', description: 'Put five cities in north–south or west–east order.', action: 'Order five cities', icon: AlignHorizontalSpaceAround, path: '/games/latitude-ladder', formats: [
    { id: 'north-south', title: 'North to south', description: 'Order five cities by latitude.' },
    { id: 'west-east', title: 'West to east', description: 'Order five cities by longitude.' },
  ], requiresCountryGeometry: true },
  { id: 'historical-geography', title: 'When Was This Map?', shortTitle: 'Historical maps', category: 'Historical geography', description: 'Read a Maproom-generated snapshot of historical boundaries, then guess its depicted year.', action: 'Place the year', icon: Clock3, path: '/games/historical-geography', requiresCountryGeometry: false },
  { id: 'projection-match', title: 'Map Projection Match', shortTitle: 'Projection Match', category: 'Map literacy', description: 'Match four map projections to the jobs they suit, and see the tradeoffs each one makes.', action: 'Match the maps', icon: Globe2, path: '/games/projection-match', requiresCountryGeometry: true },
  { id: 'population-pyramid', title: 'Population Pyramid Sort', shortTitle: 'Population Pyramid', category: 'Human geography', description: 'Order anonymous 2023 age profiles by the share of people aged 65 and older.', action: 'Order age profiles', icon: BarChart3, path: '/games/population-pyramid', requiresCountryGeometry: false },
  { id: 'watershed-match', title: 'Watershed Match', shortTitle: 'Watersheds', category: 'Physical geography', description: 'Follow the majority flow from one subwatershed into the neighboring area it drains to.', action: 'Follow the flow', icon: Waves, path: '/games/watershed-match', requiresCountryGeometry: false },
]

export function formatsForGame(gameId: GameId): GameFormat[] {
  return getGame(gameId)?.formats ?? []
}

export const categories = ['All games', ...new Set(games.map((game) => game.category))]

export function getGame(id: string | undefined): GameInfo | undefined {
  return games.find((game) => game.id === id)
}
