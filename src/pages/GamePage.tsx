import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { InlineNotice, LoadingState } from '../components/Kit'
import { CompletedPuzzle } from '../components/GameResults'
import type { GameId, GameMode } from '../geography/types'
import { loadGeography } from '../geography/data'
import { dailyPuzzleId, dailyPuzzleSeed } from '../puzzles/engine'
import { usePuzzleDate } from '../hooks/usePuzzleDate'
import { getGame, isDailyGame } from '../games/catalog'

const CountryIdentificationGame = lazy(() => import('../games/country-map/CountryIdentificationGame').then((module) => ({ default: module.CountryIdentificationGame })))
const OutlineGame = lazy(() => import('../games/outlines/OutlineGame').then((module) => ({ default: module.OutlineGame })))
const BorderRouteGame = lazy(() => import('../games/border-route/BorderRouteGame').then((module) => ({ default: module.BorderRouteGame })))
const FlagGame = lazy(() => import('../games/flags/FlagGame').then((module) => ({ default: module.FlagGame })))
const GeographyGridGame = lazy(() => import('../games/connections-grid/GeographyGridGame').then((module) => ({ default: module.GeographyGridGame })))
const CitiesGame = lazy(() => import('../games/cities/CitiesGame').then((module) => ({ default: module.CitiesGame })))
const ConnectionsGame = lazy(() => import('../games/connections/ConnectionsGame').then((module) => ({ default: module.ConnectionsGame })))
const HigherLowerGame = lazy(() => import('../games/higher-lower/HigherLowerGame').then((module) => ({ default: module.HigherLowerGame })))
const NeighbourGame = lazy(() => import('../games/neighbours/NeighbourGame').then((module) => ({ default: module.NeighbourGame })))
const DistanceGame = lazy(() => import('../games/distance/DistanceGame').then((module) => ({ default: module.DistanceGame })))

type GeographyGameProps = { data: Awaited<ReturnType<typeof loadGeography>>; mode: GameMode; date: string; seed: string }
type GeographyGameComponent = LazyExoticComponent<ComponentType<GeographyGameProps>>
const gameComponents: Partial<Record<GameId, GeographyGameComponent>> = {
  countries: CountryIdentificationGame,
  outlines: OutlineGame,
  routes: BorderRouteGame,
  flags: FlagGame,
  grid: GeographyGridGame,
  cities: CitiesGame,
  connections: ConnectionsGame,
  'higher-lower': HigherLowerGame,
  neighbours: NeighbourGame,
  distance: DistanceGame,
}

export function GamePage() {
  const { gameId: rawGameId } = useParams()
  const game = getGame(rawGameId)
  const location = useLocation()
  const [params] = useSearchParams()
  const mode: GameMode = params.get('mode') === 'daily' ? 'daily' : 'practice'
  const { state, ready, deleteSession } = useAppData()
  const date = usePuzzleDate(state.settings.timeZone)
  const [data, setData] = useState<Awaited<ReturnType<typeof loadGeography>> | null>(null)
  const [error, setError] = useState('')
  const [startedRouteKey, setStartedRouteKey] = useState('')
  const routeKey = `${game?.id ?? rawGameId}:${mode}:${date ?? ''}:${location.key}`

  useEffect(() => {
    let active = true
    loadGeography().then((loaded) => { if (active) setData(loaded) }).catch((issue) => {
      if (active) setError(issue instanceof Error ? issue.message : 'Geographic data could not be loaded.')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let inputTimer: number | undefined
    function markStarted(event: Event) {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.game-playfield')) return
      if (event.type === 'input') {
        window.clearTimeout(inputTimer)
        inputTimer = window.setTimeout(() => setStartedRouteKey(routeKey), 0)
      } else {
        setStartedRouteKey(routeKey)
      }
    }
    document.addEventListener('pointerdown', markStarted, true)
    document.addEventListener('keydown', markStarted, true)
    document.addEventListener('input', markStarted, true)
    return () => {
      window.clearTimeout(inputTimer)
      document.removeEventListener('pointerdown', markStarted, true)
      document.removeEventListener('keydown', markStarted, true)
      document.removeEventListener('input', markStarted, true)
    }
  }, [routeKey])

  useEffect(() => {
    if (!game || mode !== 'daily' || !date) return
    const puzzleId = dailyPuzzleId(game.id, date)
    const hasStaleSession = state.sessions.some((session) => session.gameId === game.id
      && session.mode === 'daily'
      && session.date === date
      && (session.version !== 1 || session.puzzleId !== puzzleId))
    if (hasStaleSession) void deleteSession(game.id, 'daily', date, puzzleId)
  }, [state.sessions, deleteSession, date, game, mode])

  if (!game) return <div className="page"><InlineNotice title="Game not found">Choose a game from the <Link to="/explore">library</Link>.</InlineNotice></div>
  if (mode === 'daily' && !isDailyGame(game.id)) return <Navigate to={`${game.path}?mode=practice`} replace />
  if (!date) return <div className="page game-page"><LoadingState label="Setting this puzzle’s date…" /></div>
  if (error) return <div className="page game-page"><InlineNotice title="The atlas could not open" tone="warning">{error}</InlineNotice></div>
  if (!data || !ready) return <div className="page game-page"><LoadingState label="Setting up the map…" /></div>

  const existing = mode === 'daily'
    ? state.history.find((result) => result.gameId === game.id && result.mode === 'daily' && result.date === date && result.completed)
    : undefined
  const showCompleted = mode === 'daily' && Boolean(existing) && startedRouteKey !== routeKey

  return (
    <div className={`page game-page game-page-${game.id}`}>
      <h1 className="visually-hidden">{game.title}</h1>
      <GameContextToolbar game={game} mode={mode} />
      {showCompleted && existing
        ? <CompletedPuzzle gameTitle={game.title} result={existing} />
        : <GameExperience key={`${game.id}:${mode}:${date}`} gameId={game.id} mode={mode} date={date} data={data} />}
    </div>
  )
}

function GameContextToolbar({ game, mode }: { game: NonNullable<ReturnType<typeof getGame>>; mode: GameMode }) {
  return (
    <div className="game-context-bar">
      <Link className="game-context-back" to="/explore"><ArrowLeft size={15} aria-hidden="true" /><span>All games</span></Link>
      <span className="game-context-title">{game.title}</span>
      <nav className="mode-switch" aria-label={`${game.title} mode`}>
        {isDailyGame(game.id) && <Link to={`${game.path}?mode=daily`} className={mode === 'daily' ? 'is-selected' : ''} aria-current={mode === 'daily' ? 'page' : undefined}>Daily</Link>}
        <Link to={`${game.path}?mode=practice`} className={mode === 'practice' ? 'is-selected' : ''} aria-current={mode === 'practice' ? 'page' : undefined}>Practice</Link>
      </nav>
    </div>
  )
}

function GameExperience({ gameId, mode, date, data }: {
  gameId: NonNullable<ReturnType<typeof getGame>>['id']
  mode: GameMode
  date: string
  data: Awaited<ReturnType<typeof loadGeography>>
}) {
  const { state } = useAppData()
  const saved = state.sessions.find((session) => session.gameId === gameId
    && session.mode === mode
    && session.date === date
    && session.version === 1
    && (mode === 'practice' || session.puzzleId === dailyPuzzleId(gameId, date)))
  const [seed] = useState(() => mode === 'daily'
    ? saved?.seed ?? dailyPuzzleSeed(gameId, date)
    : saved?.seed ?? `${gameId}:practice:${crypto.randomUUID?.() ?? Math.random()}`)
  const Game = gameComponents[gameId]
  if (!Game) return null
  const gameSeed = mode === 'daily' ? saved?.seed ?? dailyPuzzleSeed(gameId, date) : seed
  return <div className={`game-playfield game-playfield-${gameId}`}><Suspense fallback={<LoadingState label="Opening this game…" />}><Game key={gameSeed} data={data} mode={mode} date={date} seed={gameSeed} /></Suspense></div>
}
