import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { InlineNotice, LoadingState } from '../components/Kit'
import { CompletedPuzzle } from '../components/GameResults'
import type { GameMode } from '../geography/types'
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
  const location = useLocation()
  const [params] = useSearchParams()
  const mode: GameMode = params.get('mode') === 'daily' ? 'daily' : 'practice'
  const { state, ready } = useAppData()
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

  if (!game) return <div className="page"><InlineNotice title="Game not found">Choose a game from the <Link to="/explore">library</Link>.</InlineNotice></div>
  if (!date) return <div className="page game-page"><LoadingState label="Setting this puzzle’s date…" /></div>
  if (error) return <div className="page game-page"><InlineNotice title="The atlas could not open" tone="warning">{error}</InlineNotice></div>
  if (!data || !ready) return <div className="page game-page"><LoadingState label="Setting up the map…" /></div>

  const existing = mode === 'daily'
    ? state.history.find((result) => result.puzzleId === dailyPuzzleId(game.id, date) && result.completed)
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
        <Link to={`${game.path}?mode=daily`} className={mode === 'daily' ? 'is-selected' : ''} aria-current={mode === 'daily' ? 'page' : undefined}>Daily</Link>
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
