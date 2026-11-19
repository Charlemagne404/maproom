import { describe, expect, it } from 'vitest'
import { games } from '../games/catalog'
import { allMetadataPages, resolvePageMetadata } from './routeMetadata'

describe('route metadata', () => {
  it('covers each stable game route exactly once', () => {
    const gamePaths = allMetadataPages.filter((page) => page.kind === 'game').map((page) => page.path).sort()
    expect(gamePaths).toEqual(games.map((game) => game.path).sort())
    expect(allMetadataPages).toHaveLength(24)
    expect(resolvePageMetadata('/games/historical-geography').title).toBe('Historical map year guessing game | Maproom')
    expect(resolvePageMetadata('/games/projection-match').title).toBe('Map projection quiz | Maproom')
    expect(resolvePageMetadata('/games/population-pyramid').title).toBe('Population Pyramid Sort | Maproom')
    expect(resolvePageMetadata('/games/watershed-match').title).toBe('Watershed Match | Maproom')
  })

  it('keeps query variants out of the index and canonicalizes them to the base route', () => {
    const page = resolvePageMetadata('/games/cities/', '?format=locate-city&mode=freeplay')
    expect(page.title).toBe('Capital city quiz and map game | Maproom')
    expect(page.canonicalPath).toBe('/games/cities')
    expect(page.robotsContent).toBe('noindex,follow')
  })

  it('keeps personal pages and unknown paths out of the index', () => {
    expect(resolvePageMetadata('/settings').robotsContent).toBe('noindex,follow')
    expect(resolvePageMetadata('/statistics').robotsContent).toBe('noindex,follow')
    expect(resolvePageMetadata('/unknown').robotsContent).toBe('noindex,follow')
  })
})
