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

export const games: GameInfo[] = [
  { id: 'countries', title: 'Find the country', shortTitle: 'Country map', category: 'Map games', description: 'Read the clue, then find the country on a living map.', action: 'Play map quiz', icon: Map, path: '/games/countries' },
  { id: 'outlines', title: 'Country outlines', shortTitle: 'Outlines', category: 'Country games', description: 'Recognise a place by the shape of its borders.', action: 'Play outline', icon: Compass, path: '/games/outlines' },
  { id: 'routes', title: 'Border route', shortTitle: 'Border route', category: 'Logic & connections', description: 'Cross the map one shared land border at a time.', action: 'Build a route', icon: Route, path: '/games/routes' },
  { id: 'flags', title: 'Flag study', shortTitle: 'Flags', category: 'Flags', description: 'Match a flag to its country, or the other way around.', action: 'Play flags', icon: Flag, path: '/games/flags' },
  { id: 'grid', title: 'Geography grid', shortTitle: 'Geography grid', category: 'Geography puzzles', description: 'Fill each crossing with a country that fits both clues.', action: 'Open the grid', icon: Grid3X3, path: '/games/grid' },
  { id: 'cities', title: 'Capitals & cities', shortTitle: 'Cities', category: 'Cities & capitals', description: 'Name a capital, place a city, or read the coordinates.', action: 'Explore cities', icon: Globe2, path: '/games/cities' },
  { id: 'connections', title: 'Geography Connections', shortTitle: 'Connections', category: 'Logic & connections', description: 'Find four defensible ways to group sixteen places.', action: 'Find the links', icon: Shuffle, path: '/games/connections' },
  { id: 'higher-lower', title: 'Higher or Lower', shortTitle: 'Higher or Lower', category: 'Country games', description: 'Compare countries using sourced population, area and density facts.', action: 'Make a comparison', icon: ArrowDownUp, path: '/games/higher-lower' },
  { id: 'neighbours', title: 'Neighbour Challenge', shortTitle: 'Neighbours', category: 'Map games', description: 'Complete every land border around a country.', action: 'Find the borders', icon: Map, path: '/games/neighbours' },
  { id: 'distance', title: 'Distance & Direction', shortTitle: 'Distance & Direction', category: 'Cities & capitals', description: 'Use real coordinates to compare cities across the world.', action: 'Compare places', icon: MapPin, path: '/games/distance' },
]

export const categories = ['All games', ...new Set(games.map((game) => game.category))]

export function getGame(id: string | undefined): GameInfo | undefined {
  return games.find((game) => game.id === id)
}
