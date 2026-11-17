import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { GameCard, LoadingState } from '../components/Kit'
import { usePuzzleDate, formatPuzzleDate } from '../hooks/usePuzzleDate'
import { games } from '../games/catalog'

export function DailyPage() {
  const { state, toggleFavorite } = useAppData()
  const date = usePuzzleDate(state.settings.timeZone)
  if (!date) return <div className="page daily-page"><LoadingState label="Setting today’s date…" /></div>
  const done = new Set(state.history
    .filter((result) => result.mode === 'daily' && result.completed && result.date === date)
    .map((result) => result.gameId))
  const dateLabel = formatPuzzleDate(date, state.settings.timeZone)
  const practice = state.history.find((item) => item.mode === 'practice')
  const dailyCount = games.filter((game) => done.has(game.id)).length

  return (
    <div className="page daily-page">
      <section className="welcome-hero" aria-label="Welcome">
        <h1>{stockholmGreeting()}</h1>
        <time dateTime={date}>{dateLabel}</time>
      </section>
      <section className="daily-puzzles" aria-labelledby="daily-puzzles-heading">
        <div className="daily-section-heading">
          <h2 id="daily-puzzles-heading">Today’s puzzles</h2>
          <div className="daily-progress" aria-label={`${dailyCount} of 6 daily puzzles complete`}>
            <div className="daily-progress-label"><span>{dailyCount} / 6</span><span>complete</span></div>
            <div className="progress-track"><span style={{ width: `${dailyCount / 6 * 100}%` }} /></div>
          </div>
        </div>
        <section className="game-grid daily-grid" aria-label="Daily games">
          {games.map((game) => (
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
        <div className="daily-underbar">
          <Link className="text-link" to="/explore">Explore all games <ArrowRight size={15} /></Link>
        </div>
      </section>
      {practice && (
        <section className="continue-strip">
          <div><span className="eyebrow">Pick up a thread</span><h2>{games.find((game) => game.id === practice.gameId)?.title ?? 'Practice game'}</h2></div>
          <Link className="button button-outline" to={`${games.find((game) => game.id === practice.gameId)?.path ?? '/explore'}?mode=practice`}>Play again</Link>
        </section>
      )}
    </div>
  )
}

function stockholmGreeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', hour: 'numeric', hourCycle: 'h23' }).format(now))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
