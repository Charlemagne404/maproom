import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAppData } from '../app/useAppData'
import { GameCard, PageHeading } from '../components/Kit'
import { categories, games } from '../games/catalog'

export function ExplorePage() {
  const { state, toggleFavorite } = useAppData()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const category = params.get('category') ?? 'All games'
  const favoritesOnly = params.get('filter') === 'favorites'
  const recentIds = useMemo(() => [...new Set(state.history.map((item) => item.gameId))], [state.history])
  const filtered = games.filter((game) => {
    const needle = query.trim().toLocaleLowerCase()
    const matchesSearch = !needle || `${game.title} ${game.shortTitle} ${game.category} ${game.description}`.toLocaleLowerCase().includes(needle)
    const matchesCategory = category === 'All games' || game.category === category
    const matchesFavorite = !favoritesOnly || state.favorites.includes(game.id)
    return matchesSearch && matchesCategory && matchesFavorite
  }).sort((a, b) => {
    const aRecent = recentIds.indexOf(a.id)
    const bRecent = recentIds.indexOf(b.id)
    if (aRecent >= 0 && bRecent >= 0) return aRecent - bRecent
    if (aRecent >= 0) return -1
    if (bRecent >= 0) return 1
    return games.indexOf(a) - games.indexOf(b)
  })

  function selectCategory(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'All games') next.delete('category')
    else next.set('category', value)
    setParams(next, { replace: true })
  }

  return (
    <div className="page explore-page">
      <PageHeading eyebrow="Find your next puzzle" title="Explore" />
      <div className="explore-controls">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search games</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games or subjects" />
          {query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => setQuery('')}>×</button>}
        </label>
        <div className="filter-caption"><SlidersHorizontal size={15} aria-hidden="true" /> Browse by</div>
      </div>
      <div className="filter-row" aria-label="Game category filters">
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
      {recentIds.length > 0 && !query && !favoritesOnly && category === 'All games' && (
        <div className="section-label-row"><span className="eyebrow">Recently played</span></div>
      )}
      {filtered.length ? (
        <section className="game-grid explore-grid" aria-label="Available games">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} mode="practice" favorite={state.favorites.includes(game.id)} onFavorite={(id) => { void toggleFavorite(id) }} />
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
      <div className="explore-count">{filtered.length} {filtered.length === 1 ? 'game' : 'games'} in the library</div>
    </div>
  )
}
