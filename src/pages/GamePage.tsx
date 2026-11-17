import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { InlineNotice, LoadingState } from '../components/Kit'
import type { GameMode, GameResult } from '../geography/types'
import { loadGeography } from '../geography/data'
import { dailyPuzzleId } from '../puzzles/engine'
import { usePuzzleDate } from '../hooks/usePuzzleDate'
import { getGame } from '../games/catalog'

const CountryIdentificationGame = lazy(() => import('../games/country-map/CountryIdentificationGame').then((module) => ({ default: module.CountryIdentificationGame })))
const OutlineGame = lazy(() => import('../games/outlines/OutlineGame').then((module) => ({ default: module.OutlineGame })))
const BorderRouteGame = lazy(() => import('../games/border-route/BorderRouteGame').then((module) => ({ default: module.BorderRouteGame })))
const FlagGame = lazy(() => import('../games/flags/FlagGame').then((module) => ({ default: module.FlagGame })))
const GeographyGridGame = lazy(() => import('../games/connections-grid/GeographyGridGame').then((module) => ({ default: module.GeographyGridGame })))
const CitiesGame = lazy(() => import('../games/cities/CitiesGame').then((module) => ({ default: module.CitiesGame })))

export function GamePage() {
  const { gameId: rawGameId } = useParams()
  const game = getGame(rawGameId)
  const [params] = useSearchParams()
  const mode: GameMode = params.get('mode') === 'daily' ? 'daily' : 'practice'
  const { state, ready } = useAppData()
  const date = usePuzzleDate(state.settings.timeZone)
  const [data, setData] = useState<Awaited<ReturnType<typeof loadGeography>> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    loadGeography().then((loaded) => { if (active) setData(loaded) }).catch((issue) => {
      if (active) setError(issue instanceof Error ? issue.message : 'Geographic data could not be loaded.')
    })
    return () => { active = false }
  }, [])

  if (!game) return <div className="page"><InlineNotice title="Game not found">Choose a game from the <Link to="/explore">library</Link>.</InlineNotice></div>
  if (!date) return <div className="page game-page"><LoadingState label="Setting this puzzle’s date…" /></div>
  if (error) return <div className="page game-page"><InlineNotice title="The atlas could not open" tone="warning">{error}</InlineNotice></div>
  if (!data || !ready) return <div className="page game-page"><LoadingState label="Setting up the map…" /></div>

  const existing = mode === 'daily'
    ? state.history.find((result) => result.puzzleId === dailyPuzzleId(game.id, date) && result.completed)
    : undefined

  return (
    <div className="page game-page">
      {game.id !== 'flags' && <div className="game-page-heading">
        <h1>{game.title}</h1>
        <div className="mode-switch" aria-label="Game mode">
          <Link to={`${game.path}?mode=daily`} className={mode === 'daily' ? 'is-selected' : ''}>Daily</Link>
          <Link to={`${game.path}?mode=practice`} className={mode === 'practice' ? 'is-selected' : ''}>Practice</Link>
        </div>
      </div>}
      {existing ? <CompletedDailyResult gameTitle={game.title} result={existing} /> : <GameExperience key={`${game.id}:${mode}:${date}`} gameId={game.id} mode={mode} date={date} data={data} />}
    </div>
  )
}

function GameExperience({ gameId, mode, date, data }: {
  gameId: NonNullable<ReturnType<typeof getGame>>['id']
  mode: GameMode
  date: string
  data: Awaited<ReturnType<typeof loadGeography>>
}) {
  const [seed] = useState(() => mode === 'daily' ? `${gameId}:${date}:v1` : `${gameId}:practice:${crypto.randomUUID?.() ?? Math.random()}`)
  let Game: typeof CountryIdentificationGame | typeof OutlineGame | typeof BorderRouteGame | typeof FlagGame | typeof GeographyGridGame | typeof CitiesGame
  switch (gameId) {
    case 'countries': Game = CountryIdentificationGame; break
    case 'outlines': Game = OutlineGame; break
    case 'routes': Game = BorderRouteGame; break
    case 'flags': Game = FlagGame; break
    case 'grid': Game = GeographyGridGame; break
    case 'cities': Game = CitiesGame; break
    default: return null
  }
  return <div className={`game-playfield game-playfield-${gameId}`}><Suspense fallback={<LoadingState label="Opening this game…" />}><Game key={seed} data={data} mode={mode} date={date} seed={seed} /></Suspense></div>
}

function CompletedDailyResult({ gameTitle, result }: { gameTitle: string; result: GameResult }) {
  return (
    <div className="result-panel already-complete">
      <span className="eyebrow">Daily puzzle complete</span>
      <h2>You’ve already played today.</h2>
      <p>{gameTitle} · {result.correct} of {result.total} correct</p>
      <div className="result-score">{result.score.toLocaleString()}<small>points</small></div>
      <div className="result-actions"><Link className="button button-dark" to="/statistics">See your statistics</Link><Link className="button button-outline" to={`${getGame(result.gameId)?.path ?? '/explore'}?mode=practice`}><RotateCcw size={15} /> Play practice</Link></div>
    </div>
  )
}
