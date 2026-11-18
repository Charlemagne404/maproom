import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAppData } from '../app/useAppData'
import { GameCard, GameFormatCard, PageHeading } from '../components/Kit'
import { categories, formatsForGame, games, type GameFormat, type GameInfo } from '../games/catalog'
import { HistoricalExploreCollection } from '../games/historical-geography/HistoricalExploreCollection'

export function ExplorePage() {
  const { state, toggleFavorite } = useAppData()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const category = params.get('category') ?? 'All games'
  const favoritesOnly = params.get('filter') === 'favorites'
  const recentIds = useMemo(() => [...new Set(state.history.filter((item) => item.completed).map((item) => item.gameId))], [state.history])
  const experiences = useMemo(() => {
    const items: Array<{ game: GameInfo; format?: GameFormat; key: string }> = []
    for (const game of games) {
      const formats = formatsForGame(game.id)
      if (formats.length) for (const format of formats) items.push({ game, format, key: `${game.id}:${format.id}` })
      else items.push({ game, key: game.id })
    }
    return items
  }, [])
  const filtered = experiences.filter((experience) => {
    const { game, format } = experience
    const needle = query.trim().toLocaleLowerCase()
    const matchesSearch = !needle || `${game.title} ${game.shortTitle} ${game.category} ${game.description} ${format?.title ?? ''} ${format?.description ?? ''}`.toLocaleLowerCase().includes(needle)
    const matchesCategory = category === 'All games' || game.category === category
    const matchesFavorite = !favoritesOnly || state.favorites.includes(game.id)
    return matchesSearch && matchesCategory && matchesFavorite
  }).sort((a, b) => {
    const aRecent = recentIds.indexOf(a.game.id)
    const bRecent = recentIds.indexOf(b.game.id)
    if (aRecent >= 0 && bRecent >= 0) return aRecent - bRecent
    if (aRecent >= 0) return -1
    if (bRecent >= 0) return 1
    return experiences.indexOf(a) - experiences.indexOf(b)
  })

  function selectCategory(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'All games') next.delete('category')
    else next.set('category', value)
    setParams(next, { replace: true })
  }

  return (
    <div className="page explore-page">
      <PageHeading eyebrow="Free play" title="Geography games" description="Country quizzes, capital-city challenges, map puzzles, flags and more. Choose a game and play at your own pace." />
      <div className="explore-controls">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search games</span>
          <input type="search" name="games" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games or subjects" />
          {query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => setQuery('')}>×</button>}
        </label>
        <div className="filter-caption"><SlidersHorizontal size={15} aria-hidden="true" /> Browse by</div>
      </div>
      <div className="filter-row" role="group" aria-label="Game category filters">
        {categories.map((item) => (
          <button type="button" key={item} className={`filter-chip${category === item ? ' is-selected' : ''}`} aria-pressed={category === item} onClick={() => selectCategory(item)}>{item}</button>
        ))}
        <button type="button" className={`filter-chip favorites-chip${favoritesOnly ? ' is-selected' : ''}`} aria-pressed={favoritesOnly} onClick={() => {
          const next = new URLSearchParams(params)
          if (favoritesOnly) next.delete('filter')
          else next.set('filter', 'favorites')
          setParams(next, { replace: true })
        }}>Favorites {state.favorites.length > 0 && <span>{state.favorites.length}</span>}</button>
      </div>
      {filtered.length ? (
        <section className="game-grid explore-grid" aria-label="Free play games and formats">
          {filtered.map((game) => (
            game.format
              ? <GameFormatCard key={game.key} game={game.game} format={game.format} favorite={state.favorites.includes(game.game.id)} onFavorite={(id) => { void toggleFavorite(id) }} />
              : <GameCard key={game.key} game={game.game} mode="freeplay" favorite={state.favorites.includes(game.game.id)} onFavorite={(id) => { void toggleFavorite(id) }} />
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <span className="eyebrow">Nothing in this corner yet</span>
          <h2>{favoritesOnly ? 'No favorites saved' : 'No games match that search'}</h2>
          <p>{favoritesOnly ? 'Use the heart on a game to keep it close.' : 'Try another name or choose a broader category.'}</p>
          {(favoritesOnly || query) && <button className="button button-outline" type="button" onClick={() => { setQuery(''); selectCategory('All games'); setParams({}, { replace: true }) }}>Show all games</button>}
        </div>
      )}
      {!query.trim() && category === 'All games' && !favoritesOnly && <HistoricalExploreCollection />}
      <div className="explore-count">{filtered.length} {filtered.length === 1 ? 'experience' : 'experiences'} available</div>
    </div>
  )
}
