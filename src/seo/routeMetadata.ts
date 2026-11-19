import { games, type GameInfo } from '../games/catalog'

export interface PageMetadata {
  path: string
  title: string
  description: string
  heading: string
  summary: string
  robots: 'index,follow' | 'noindex,follow'
  kind: 'website' | 'webpage' | 'game'
  game?: GameInfo
}

export const staticPages: PageMetadata[] = [
  {
    path: '/',
    title: 'Maproom | Daily geography puzzles and free games',
    description: 'Take on six daily geography puzzles or explore free country quizzes, historical maps, flags, capital-city challenges and more.',
    heading: 'Today’s geography puzzles',
    summary: 'Play six daily challenges, then keep exploring with free geography games for countries, capitals, flags, routes and historical maps.',
    robots: 'index,follow',
    kind: 'website',
  },
  {
    path: '/explore',
    title: 'Geography games and country quizzes | Maproom',
    description: 'Choose a geography game: find countries, read historical maps, match flags, explore capitals, solve map puzzles and trace rivers.',
    heading: 'Geography games',
    summary: 'Browse country quizzes, capital-city challenges, map games, flag matches, geography puzzles and more. Choose a game and play at your own pace.',
    robots: 'index,follow',
    kind: 'webpage',
  },
  {
    path: '/about',
    title: 'About Maproom | Free geography games',
    description: 'Maproom brings daily geography puzzles and free map, country, capital, flag and route games together in one calm atlas.',
    heading: 'About Maproom',
    summary: 'Maproom gathers maps, names, flags, routes and daily puzzles into one small atlas, made for a few curious minutes at a time.',
    robots: 'index,follow',
    kind: 'webpage',
  },
  {
    path: '/data',
    title: 'Geography data sources | Maproom',
    description: 'Read about the open geographic datasets, country boundaries, city records, coverage and licenses used by Maproom.',
    heading: 'Geography data sources',
    summary: 'Maproom’s maps and geography games use documented geographic datasets. Review the sources, licenses, coverage and limitations behind the atlas.',
    robots: 'index,follow',
    kind: 'webpage',
  },
  {
    path: '/privacy',
    title: 'Privacy | Maproom',
    description: 'Maproom has no accounts, advertising trackers or analytics. Game history, favorites and settings stay in your browser.',
    heading: 'Privacy',
    summary: 'Maproom keeps game history, favorites and preferences in this browser. There are no accounts, advertising trackers or analytics services.',
    robots: 'index,follow',
    kind: 'webpage',
  },
  {
    path: '/statistics',
    title: 'Your statistics | Maproom',
    description: 'Review personal game activity stored in this browser.',
    heading: 'Your statistics',
    summary: 'Personal game activity is stored locally in this browser.',
    robots: 'noindex,follow',
    kind: 'webpage',
  },
  {
    path: '/settings',
    title: 'Settings | Maproom',
    description: 'Manage your local Maproom preferences and saved progress.',
    heading: 'Settings',
    summary: 'Manage local preferences and saved game progress.',
    robots: 'noindex,follow',
    kind: 'webpage',
  },
  {
    path: '/404',
    title: 'Page not found | Maproom',
    description: 'This Maproom page could not be found. Return to today’s geography puzzles or explore the games.',
    heading: 'We can’t find that place.',
    summary: 'The address may have moved, or it may never have been part of this atlas.',
    robots: 'noindex,follow',
    kind: 'webpage',
  },
]

const gameCopy = {
  countries: {
    title: 'Find the country map quiz',
    description: 'Use a clue to locate a country on an interactive world map. Practice country geography with a relaxed, replayable map quiz.',
    summary: 'Read a clue, then find the country on a world map. Build your knowledge of countries and their locations one round at a time.',
  },
  outlines: {
    title: 'Country Outline Quiz',
    description: 'Identify countries from the shapes of their borders in this geography quiz. Make a guess, then see where each place lies.',
    summary: 'Recognise a country from its outline and learn where it sits on the map.',
  },
  routes: {
    title: 'Border route geography game',
    description: 'Build a route across the map by traveling from country to country over shared land borders.',
    summary: 'Cross the map one shared land border at a time to connect places in a geography route puzzle.',
  },
  flags: {
    title: 'Flag match quiz',
    description: 'Match national flags with their countries, or match a country with its flag in two quick geography quiz formats.',
    summary: 'Practice world flags by identifying the country or finding the flag that belongs to a country.',
  },
  grid: {
    title: 'Geography grid puzzle',
    description: 'Fill a three-by-three geography grid with different countries that fit both the row and column clues.',
    summary: 'Solve nine country clues by finding places that fit the crossing categories in a geography grid.',
  },
  cities: {
    title: 'Capital city quiz and map game',
    description: 'Test your capital-city knowledge, match cities to countries, or place a city on the map in four free-play formats.',
    summary: 'Practice world capitals and cities with country matches, map placement and location clues.',
  },
  connections: {
    title: 'Geography Connections puzzle',
    description: 'Group countries by shared geographic connections in a daily-style logic puzzle about places around the world.',
    summary: 'Select countries in groups of four to uncover the geographic connections linking them.',
  },
  'higher-lower': {
    title: 'Higher or Lower: Countries',
    description: 'Compare countries using sourced facts about population, land area and population density in this geography quiz.',
    summary: 'Use population, area and density clues to decide which country is higher or lower.',
  },
  neighbours: {
    title: 'Neighbour Challenge map quiz',
    description: 'Find every country that shares a land border with the target in this neighbour geography challenge.',
    summary: 'Use the map to complete the full set of land-border neighbours around a country.',
  },
  distance: {
    title: 'City Distance & Direction',
    description: 'Use real city coordinates to compare distance and direction between places around the world.',
    summary: 'Compare cities by their real-world distance and direction on a geography map.',
  },
  rivers: {
    title: 'Riverways map quiz',
    description: 'Trace a major river across the map, then identify the watercourse in this river geography game.',
    summary: 'Follow the course of a major river and match its path to its name.',
  },
  'latitude-ladder': {
    title: 'Latitude Ladder city puzzle',
    description: 'Put five cities in north-to-south or west-to-east order using their real locations on Earth.',
    summary: 'Arrange five cities by latitude or longitude in a quick world geography puzzle.',
  },
  'historical-geography': {
    title: 'Historical map year guessing game',
    description: 'Study a Maproom-generated snapshot of international boundaries from 1886 to 2011, then estimate the year depicted.',
    summary: 'Read a generated historical political-boundary snapshot, enter its depicted year, and learn the context and sources behind it.',
  },
  'projection-match': {
    title: 'Map projection quiz',
    description: 'Compare four world map projections and match each one to a mapping task, from equal-area maps to globe-like views.',
    summary: 'Match Equal Earth, Mercator, Equirectangular and Orthographic maps to the tasks they suit, then learn what each projection distorts.',
  },
  'population-pyramid': {
    title: 'Population Pyramid Sort',
    description: 'Compare sourced 2023 population pyramids and order countries by their share of people aged 65 and older.',
    summary: 'Read three anonymous age-and-sex population profiles, order them by the share aged 65+, and reveal the countries and data sources.',
  },
  'watershed-match': {
    title: 'Watershed Match',
    description: 'Read a detailed map of U.S. subwatersheds and choose the neighboring area that receives most of the highlighted unit’s flow.',
    summary: 'Follow the USGS Watershed Boundary Dataset’s downstream links across five map questions. Each reveal shows which neighboring subwatershed receives most of the mapped flow.',
  },
} satisfies Record<string, { title: string; description: string; summary: string }>

export const gamePages: PageMetadata[] = games.map((game) => {
  const copy = gameCopy[game.id as keyof typeof gameCopy]
  if (!copy) throw new Error(`Missing SEO copy for game ${game.id}.`)
  return {
    path: game.path,
    title: `${copy.title} | Maproom`,
    description: copy.description,
    heading: game.title,
    summary: copy.summary,
    robots: 'index,follow',
    kind: 'game',
    game,
  }
})

export const allMetadataPages = [...staticPages, ...gamePages]

export function resolvePageMetadata(pathname: string, search = ''): PageMetadata & { canonicalPath: string; robotsContent: string } {
  const normalizedPath = normalizePath(pathname)
  const page = allMetadataPages.find((candidate) => candidate.path === normalizedPath)
    ?? staticPages.find((candidate) => candidate.path === '/404')!
  const hasSearch = search.length > 0 && search !== '?'
  const robotsContent = page.robots === 'noindex,follow' || hasSearch ? 'noindex,follow' : 'index,follow'
  return { ...page, canonicalPath: normalizedPath, robotsContent }
}

export function getStructuredData(page: PageMetadata, canonicalUrl: string): Record<string, unknown> {
  if (page.kind === 'website') {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Maproom',
      url: canonicalUrl,
      description: page.description,
      inLanguage: 'en',
    }
  }

  if (page.game) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.game.title,
      url: canonicalUrl,
      description: page.description,
      isPartOf: { '@type': 'WebSite', name: 'Maproom', url: canonicalUrl.replace(/\/games\/[^/]+$/, '/') },
      mainEntity: {
        '@type': 'WebApplication',
        name: page.game.title,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires JavaScript enabled in a modern web browser.',
        isAccessibleForFree: true,
      },
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.heading,
    url: canonicalUrl,
    description: page.description,
    isPartOf: { '@type': 'WebSite', name: 'Maproom', url: canonicalUrl.replace(/\/(?:explore|about|data|privacy|statistics|settings|404)$/, '/') },
    inLanguage: 'en',
  }
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  const noTrailingSlash = pathname.replace(/\/+$/, '')
  try {
    return decodeURIComponent(noTrailingSlash)
  } catch {
    return noTrailingSlash
  }
}
