import { Compass, Flag, Globe2, Grid3X3, Map, Route, type LucideIcon } from 'lucide-react'
import type { GameId } from '../geography/types'

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
]

export const categories = ['All games', ...new Set(games.map((game) => game.category))]

export function getGame(id: string | undefined): GameInfo | undefined {
  return games.find((game) => game.id === id)
}
