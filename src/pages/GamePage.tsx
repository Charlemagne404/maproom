import { Suspense, useCallback, useContext, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { InlineNotice, LoadingState } from '../components/Kit'
import { CompletedPuzzle } from '../components/GameResults'
import type { GameMode, GeographyData } from '../geography/types'
import { loadGeography } from '../geography/data'
import { dailyPuzzleId, dailyPuzzleSeed } from '../puzzles/engine'
import { usePuzzleDate } from '../hooks/usePuzzleDate'
import { formatsForGame, getGame, isDailyGame } from '../games/catalog'
import { getGameComponent, type GeographyGameComponent } from '../games/components'
import { FreePlaySetupContext } from '../components/FreePlaySetupContext'
import { isCompatibleGameSession } from '../games/sessionCompatibility'
import { getReturnDestination } from '../navigation/returnLocation'

export function GamePage({ gameId, preparing = false, launchFormat = null }: { gameId: string; preparing?: boolean; launchFormat?: string | null }) {
  const rawGameId = gameId
  const game = getGame(rawGameId)
  const requiresCountryGeometry = game?.requiresCountryGeometry ?? false
  const location = useLocation()
  const [params] = useSearchParams()
  const mode: GameMode = preparing ? 'freeplay' : params.get('mode') === 'daily' ? 'daily' : 'freeplay'
  const { setup: setupInProgress, format: setupFormat, settingsTarget, onExperienceReady } = useContext(FreePlaySetupContext)
  const { state, ready, deleteSession } = useAppData()
  const date = usePuzzleDate(state.settings.timeZone)
  const [loadedData, setLoadedData] = useState<{ requiresCountryGeometry: boolean; data: GeographyData } | null>(null)
  const [loadFailure, setLoadFailure] = useState<{ requiresCountryGeometry: boolean; message: string } | null>(null)
  const data = loadedData?.requiresCountryGeometry === requiresCountryGeometry ? loadedData.data : null
  const error = loadFailure?.requiresCountryGeometry === requiresCountryGeometry ? loadFailure.message : ''
  const [startedRouteKey, setStartedRouteKey] = useState('')
  const routeKey = `${game?.id ?? rawGameId}:${mode}:${date ?? ''}:${location.key}`
  const formats = game ? formatsForGame(game.id) : []
  const requestedFormat = params.get('format')
  const routeFormat = mode === 'daily'
    ? formats[0]?.id ?? null
    : formats.some((item) => item.id === requestedFormat) ? requestedFormat : formats[0]?.id ?? null
  const format = preparing && formats.some((item) => item.id === launchFormat) ? launchFormat : setupFormat ?? routeFormat
  const setup = mode === 'freeplay' && setupInProgress
  const [mountedExperienceKey, setMountedExperienceKey] = useState('')
  const experienceKey = `${game?.id ?? rawGameId}:${mode}:${date ?? ''}:${format ?? ''}`
  const markExperienceMounted = useCallback(() => setMountedExperienceKey(experienceKey), [experienceKey])
  useEffect(() => {
    if (!game) return
    let active = true
    loadGeography(requiresCountryGeometry).then((loaded) => {
      if (active) {
        setLoadedData({ requiresCountryGeometry, data: loaded })
        setLoadFailure((current) => current?.requiresCountryGeometry === requiresCountryGeometry ? null : current)
      }
    }).catch((issue) => {
      if (active) setLoadFailure({
        requiresCountryGeometry,
        message: issue instanceof Error ? issue.message : 'Geographic data could not be loaded.',
      })
    })
    return () => { active = false }
  }, [game, requiresCountryGeometry])

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
      && !isCompatibleGameSession(session, 'daily', puzzleId))
    if (hasStaleSession) void deleteSession(game.id, 'daily', date, puzzleId)
  }, [state.sessions, deleteSession, date, game, mode])

  useEffect(() => {
    if (setup && settingsTarget && mountedExperienceKey === experienceKey) onExperienceReady?.()
  }, [experienceKey, mountedExperienceKey, onExperienceReady, setup, settingsTarget])

  if (!game) return <div className="page"><InlineNotice title="Game not found">Choose a game from the <Link to="/explore">library</Link>.</InlineNotice></div>
  if (mode === 'daily' && !isDailyGame(game.id)) return <Navigate to={`${game.path}?mode=freeplay`} replace />
  if (!date) return <div className="page game-page"><LoadingState label="Setting this puzzle’s date…" /></div>
  if (error) return <div className="page game-page"><InlineNotice title="The atlas could not open" tone="warning">{error}</InlineNotice></div>
  if (!data || !ready) return <div className="page game-page"><LoadingState label="Setting up the map…" /></div>

  const existing = mode === 'daily'
    ? state.history.find((result) => result.gameId === game.id && result.mode === 'daily' && result.date === date && result.completed)
    : undefined
  const showCompleted = mode === 'daily' && Boolean(existing) && startedRouteKey !== routeKey

  return (
    <div className={`page game-page game-page-${game.id}${setup ? ' is-setup' : ''}`}>
      <h1 className="visually-hidden">{game.title}</h1>
      <GameContextToolbar game={game} mode={mode} returnState={location.state} />
      {showCompleted && existing
        ? <CompletedPuzzle gameTitle={game.title} result={existing} />
        : <FreePlaySetupContext.Provider value={{
          setup,
          format,
          settingsTarget,
          onExperienceReady,
        }}>
          <GameExperience key={experienceKey} gameId={game.id} mode={mode} date={date} data={data} onMounted={markExperienceMounted} />
        </FreePlaySetupContext.Provider>}
    </div>
  )
}

function GameContextToolbar({ game, mode, returnState }: { game: NonNullable<ReturnType<typeof getGame>>; mode: GameMode; returnState: unknown }) {
  const destination = getReturnDestination(returnState)
  return (
    <div className="game-context-bar">
      <Link className="game-context-back" to={destination.path} replace><ArrowLeft size={15} aria-hidden="true" /><span>{destination.label}</span></Link>
      <span className="game-context-title">{game.title}</span>
      {mode === 'daily' && <span className="game-context-daily">Today’s puzzle</span>}
    </div>
  )
}

function GameExperience({ gameId, mode, date, data, onMounted }: {
  gameId: NonNullable<ReturnType<typeof getGame>>['id']
  mode: GameMode
  date: string
  data: Awaited<ReturnType<typeof loadGeography>>
  onMounted: () => void
}) {
  const { state } = useAppData()
  const saved = state.sessions.find((session) => session.gameId === gameId
    && session.mode === mode
    && session.date === date
    && (mode === 'freeplay'
      ? session.version === 1
      : isCompatibleGameSession(session, mode, dailyPuzzleId(gameId, date))))
  const [seed] = useState(() => mode === 'daily'
    ? saved?.seed ?? dailyPuzzleSeed(gameId, date)
    : saved?.seed ?? `${gameId}:practice:${crypto.randomUUID?.() ?? Math.random()}`)
  const game = getGame(gameId)
  if (!game) return null
  const Game = getGameComponent(gameId)
  const gameSeed = mode === 'daily' ? saved?.seed ?? dailyPuzzleSeed(gameId, date) : seed
  return <div className={`game-playfield game-playfield-${gameId}`} tabIndex={-1}><Suspense fallback={<LoadingState label="Opening this game…" />}><MountedGame game={Game} gameSeed={gameSeed} data={data} mode={mode} date={date} onMounted={onMounted} /></Suspense></div>
}

function MountedGame({ game: Game, gameSeed, data, mode, date, onMounted }: {
  game: GeographyGameComponent
  gameSeed: string
  data: Awaited<ReturnType<typeof loadGeography>>
  mode: GameMode
  date: string
  onMounted: () => void
}) {
  useEffect(() => { onMounted() }, [onMounted])
  return <Game key={gameSeed} data={data} mode={mode} date={date} seed={gameSeed} />
}
