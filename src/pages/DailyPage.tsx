import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { GameCard, LoadingState } from '../components/Kit'
import { usePuzzleDate, formatPuzzleDate } from '../hooks/usePuzzleDate'
import { DAILY_GAME_IDS, games } from '../games/catalog'

const pageLoadedAt = new Date()

export function DailyPage() {
  const { state, toggleFavorite } = useAppData()
  const carousel = useRef<HTMLDivElement>(null)
  const date = usePuzzleDate(state.settings.timeZone)
  if (!date) return <div className="page daily-page"><LoadingState label="Setting today’s date…" /></div>
  const dailyGames = DAILY_GAME_IDS.map((id) => games.find((game) => game.id === id)).filter((game) => game !== undefined)
  const done = new Set(state.history
    .filter((result) => result.mode === 'daily' && result.completed && result.date === date)
    .map((result) => result.gameId))
  const dateLabel = formatPuzzleDate(date, state.settings.timeZone)
  const dailyCount = dailyGames.filter((game) => done.has(game.id)).length

  return (
    <div className="page daily-page">
      <section className="welcome-hero" aria-label="Welcome">
        <h1>{stockholmGreeting(pageLoadedAt, state.settings.timeZone)}</h1>
        <time dateTime={date}>{dateLabel}</time>
      </section>
      <section className="daily-puzzles" aria-labelledby="daily-puzzles-heading">
        <div className="daily-section-heading">
            <div><h2 id="daily-puzzles-heading">Today’s puzzles</h2><span className="daily-section-subtitle">Six daily challenges</span></div>
          <div className="daily-progress" aria-label={`${dailyCount} of ${dailyGames.length} daily puzzles complete`}>
            <div className="daily-progress-label"><span>{dailyCount} / {dailyGames.length}</span><span>complete</span></div>
            <div className="progress-track"><span style={{ width: `${dailyCount / dailyGames.length * 100}%` }} /></div>
          </div>
        </div>
        <section className="game-grid daily-grid" aria-label="Daily games">
          {dailyGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              mode="daily"
              favorite={state.favorites.includes(game.id)}
              completed={done.has(game.id)}
              onFavorite={(gameId) => { void toggleFavorite(gameId) }}
            />
          ))}
        </section>
      </section>
      <section className="other-games-section" aria-labelledby="play-anytime-heading">
        <div className="play-anytime-heading">
          <div><span className="eyebrow">Free play</span><h2 id="play-anytime-heading">Play anytime</h2></div>
          <div className="other-games-controls" aria-label="Play anytime carousel controls">
            <button type="button" aria-label="Scroll games left" title="Scroll games left" onClick={() => carousel.current?.scrollBy({ left: -260, behavior: 'smooth' })}><ChevronLeft size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Scroll games right" title="Scroll games right" onClick={() => carousel.current?.scrollBy({ left: 260, behavior: 'smooth' })}><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="other-games-carousel" ref={carousel} role="region" tabIndex={0} aria-label="Free play games; scroll horizontally" onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          carousel.current?.scrollBy({ left: event.key === 'ArrowRight' ? 240 : -240, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        }}>
          {games.map((game) => <GameCard key={game.id} game={game} mode="freeplay" favorite={state.favorites.includes(game.id)} onFavorite={(gameId) => { void toggleFavorite(gameId) }} compact />)}
        </div>
        <div className="daily-underbar"><Link className="text-link" to="/explore">Explore all games <ArrowRight size={15} aria-hidden="true" /></Link></div>
      </section>
    </div>
  )
}

function stockholmGreeting(now = new Date(), timeZone = 'Europe/Stockholm') {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
