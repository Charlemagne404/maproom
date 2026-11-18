import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { GameCard, LoadingState } from '../components/Kit'
import { usePuzzleDate, formatPuzzleDate } from '../hooks/usePuzzleDate'
import { DAILY_GAME_IDS, formatsForGame, games } from '../games/catalog'
import { dailyPuzzleId } from '../puzzles/engine'
import { isCompatibleGameSession } from '../games/sessionCompatibility'

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
  const resumable = [...state.sessions]
    .filter((session) => session.date === date && (session.mode === 'freeplay'
      ? session.version === 1
      : isCompatibleGameSession(session, session.mode, dailyPuzzleId(session.gameId, date))))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
  const resumeGame = resumable ? games.find((game) => game.id === resumable.gameId) : undefined
  const resumeSearch = resumable && resumeGame ? createResumeSearch(resumable, formatsForGame(resumeGame.id).map((format) => format.id)) : ''
  const resumeProgress = resumable ? describeResumeProgress(resumable.payload) : ''

  return (
    <div className="page daily-page">
      <section className="welcome-hero" aria-label="Welcome">
        <h1>{greetingForDate(date)}</h1>
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
              favoriteContext="Today’s puzzles"
              onFavorite={(gameId) => { void toggleFavorite(gameId) }}
            />
          ))}
        </section>
      </section>
      {resumeGame && resumable && <section className="continue-strip" aria-labelledby="continue-title">
        <div>
          <span className="eyebrow">In progress</span>
          <h2 id="continue-title">Pick up where you left off</h2>
          <p>{resumeGame.title} · {resumable.mode === 'daily' ? 'Today’s puzzle' : 'Free play'}{resumeProgress ? ` · ${resumeProgress}` : ''}</p>
        </div>
        <Link className="continue-action" to={`${resumeGame.path}?${resumeSearch}`} state={{ from: '/' }}>
          <span>Resume {resumeGame.shortTitle}</span><ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>}
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
          {games.map((game) => <GameCard key={game.id} game={game} mode="freeplay" favorite={state.favorites.includes(game.id)} favoriteContext="Play anytime" onFavorite={(gameId) => { void toggleFavorite(gameId) }} compact />)}
        </div>
        <div className="daily-underbar"><Link className="text-link" to="/explore">Explore all games <ArrowRight size={15} aria-hidden="true" /></Link></div>
      </section>
    </div>
  )
}

const dailyGreetings = [
  'Ready to explore?',
  'Where are we going today?',
  'A new day, a new discovery.',
  'Let’s see what you know.',
  'Find your next place.',
  'Your atlas is waiting.',
  'How well do you know the world?',
  'Take the scenic route.',
]

function greetingForDate(date: string): string {
  let hash = 0
  for (const character of date) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return dailyGreetings[hash % dailyGreetings.length]!
}

function createResumeSearch(session: { mode: 'daily' | 'freeplay'; payload: Record<string, unknown> }, formatIds: string[]): string {
  const params = new URLSearchParams({ mode: session.mode })
  if (session.mode === 'freeplay') params.set('resume', '1')
  const taskFormat = session.payload.task === 'locate' ? 'locate-city'
    : session.payload.task === 'identify' ? 'identify-city'
      : session.payload.task === 'capitals' ? session.payload.direction
        : session.payload.task
  const payloadFormat = [session.payload.format, taskFormat, session.payload.direction]
    .find((value): value is string => typeof value === 'string' && formatIds.includes(value))
  if (payloadFormat) params.set('format', payloadFormat)
  return params.toString()
}

function describeResumeProgress(payload: Record<string, unknown>): string {
  if (payload.answers && typeof payload.answers === 'object' && !Array.isArray(payload.answers)) {
    const count = Object.keys(payload.answers).length
    return `${count} of 9 squares filled`
  }
  if (Array.isArray(payload.selectedCountries)) return `${payload.selectedCountries.length} countries selected`
  if (Array.isArray(payload.route)) {
    const route = payload.route.filter((item) => typeof item === 'string')
    const endpoints = typeof payload.start === 'string' && route[0] === payload.start ? 1 : 0
    return `${Math.max(0, route.length - endpoints)} countries selected`
  }
  if (typeof payload.resolved === 'number' && payload.resolved > 0) return `${payload.resolved} questions answered`
  if (typeof payload.index === 'number' && payload.index > 0 && Array.isArray(payload.questionCodes)) {
    return `Question ${payload.index + 1} of ${payload.questionCodes.length}`
  }
  return ''
}
