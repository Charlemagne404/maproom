import { games } from '../src/games/catalog'

export const freePlayCardCount = games.length
export const exploreExperienceCount = games.reduce((total, game) => total + Math.max(1, game.formats?.length ?? 0), 0)
