import { ArrowDownUp, Compass, Flag, Globe2, Grid3X3, Map, MapPin, Route, Shuffle, type LucideIcon } from 'lucide-react'
import type { GameId } from '../geography/types'

// Daily games are curated explicitly. Registering a game in `games` never opts it in.
export const DAILY_GAME_IDS: readonly GameId[] = ['countries', 'outlines', 'routes', 'flags', 'grid', 'cities']

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
}

export interface GameFormat {
  id: string
  title: string
  description: string
}

export const games: GameInfo[] = [
  { id: 'countries', title: 'Find the country', shortTitle: 'Country map', category: 'Identify places', description: 'Read the clue, then find the country on a living map.', action: 'Play map quiz', icon: Map, path: '/games/countries' },
  { id: 'outlines', title: 'Country outlines', shortTitle: 'Outlines', category: 'Identify places', description: 'Recognise a place by the shape of its borders.', action: 'Play outline', icon: Compass, path: '/games/outlines' },
  { id: 'routes', title: 'Border route', shortTitle: 'Border route', category: 'Maps & movement', description: 'Cross the map one shared land border at a time.', action: 'Build a route', icon: Route, path: '/games/routes' },
  { id: 'flags', title: 'Flag study', shortTitle: 'Flags', category: 'Identify places', description: 'Match a flag to its country, or the other way around.', action: 'Play flags', icon: Flag, path: '/games/flags' },
  { id: 'grid', title: 'Geography grid', shortTitle: 'Geography grid', category: 'Clues & comparisons', description: 'Fill each crossing with a country that fits both clues.', action: 'Open the grid', icon: Grid3X3, path: '/games/grid' },
  { id: 'cities', title: 'Capitals & cities', shortTitle: 'Cities', category: 'Identify places', description: 'Name a capital, place a city, or read the coordinates.', action: 'Explore cities', icon: Globe2, path: '/games/cities' },
  { id: 'connections', title: 'Geography Connections', shortTitle: 'Connections', category: 'Clues & comparisons', description: 'Find four defensible ways to group sixteen places.', action: 'Find the links', icon: Shuffle, path: '/games/connections' },
  { id: 'higher-lower', title: 'Higher or Lower', shortTitle: 'Higher or Lower', category: 'Clues & comparisons', description: 'Compare countries using sourced population, area and density facts.', action: 'Make a comparison', icon: ArrowDownUp, path: '/games/higher-lower' },
  { id: 'neighbours', title: 'Neighbour Challenge', shortTitle: 'Neighbours', category: 'Maps & movement', description: 'Complete every land border around a country.', action: 'Find the borders', icon: Map, path: '/games/neighbours' },
  { id: 'distance', title: 'Distance & Direction', shortTitle: 'Distance & Direction', category: 'Maps & movement', description: 'Use real coordinates to compare cities across the world.', action: 'Compare places', icon: MapPin, path: '/games/distance' },
]

const gameFormats: Partial<Record<GameId, GameFormat[]>> = {
  flags: [
    { id: 'flag-to-country', title: 'Identify the country', description: 'See a national flag and choose its country.' },
    { id: 'country-to-flag', title: 'Find the flag', description: 'See a country and choose its flag.' },
  ],
  cities: [
    { id: 'country-to-capital', title: 'Country to capital', description: 'Name the capital for each country.' },
    { id: 'capital-to-country', title: 'Capital to country', description: 'Match a capital city to its country.' },
    { id: 'locate-city', title: 'Locate a city', description: 'Place a city on the map using its name.' },
    { id: 'identify-city', title: 'Identify a city', description: 'Use the map marker to name the city.' },
  ],
}

export function formatsForGame(gameId: GameId): GameFormat[] {
  return gameFormats[gameId] ?? []
}

export const categories = ['All games', ...new Set(games.map((game) => game.category))]

export function getGame(id: string | undefined): GameInfo | undefined {
  return games.find((game) => game.id === id)
}
