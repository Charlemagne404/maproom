import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Flame, Heart, Menu, Moon, Settings, Sun, X } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { usePuzzleDate } from '../hooks/usePuzzleDate'
import { calculateStatistics } from '../statistics/summary'
import { GameEntryContext, type GameEntryRequest } from './GameEntryContext'
import { FreePlaySetupContext } from './FreePlaySetupContext'
import { GameSetupOverlay } from './GameSetupOverlay'
import { formatsForGame, getGame } from '../games/catalog'
import { LoadingState } from './Kit'
import '../seo/site-header-polish.css'

const GamePage = lazy(() => import('../pages/GamePage').then(({ GamePage }) => ({ default: GamePage })))

const navigation = [
  { to: '/', label: 'Daily' },
  { to: '/explore', label: 'Explore' },
  { to: '/statistics', label: 'Statistics' },
]

interface PendingGameEntry {
  gameId: string
  format: string | null
  href: string
  from: string
  returnFocusKey: string
  sourceKey: string
  ready: boolean
  experienceReady: boolean
  token: number
}

export function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const { state, updateSettings } = useAppData()
  const routeMatch = location.pathname.match(/^\/games\/([^/]+)\/?$/)
  const routeGameId = routeMatch?.[1] ? decodeRouteSegment(routeMatch[1]) : null
  const routeGame = getGame(routeGameId ?? undefined)
  const isGameRoute = routeMatch !== null
  const routeMode = new URLSearchParams(location.search).get('mode') === 'daily' ? 'daily' : 'freeplay'
  const routeFormat = routeGame ? getSelectedFormat(routeGame.id, new URLSearchParams(location.search).get('format')) : null
  const isResumeRoute = Boolean(routeGame && routeMode === 'freeplay' && new URLSearchParams(location.search).get('resume') === '1')
  const routeIdentity = `${location.key}:${routeGameId ?? ''}:${routeMode}:${routeFormat ?? ''}`
  const [pendingEntryState, setPendingEntry] = useState<PendingGameEntry | null>(null)
  const [startedLaunchKey, setStartedLaunchKey] = useState('')
  const [readyLaunchKey, setReadyLaunchKey] = useState('')
  const [settingsTarget, setSettingsTarget] = useState<HTMLDivElement | null>(null)
  const [pageTransitioning, setPageTransitioning] = useState(false)
  const pendingToken = useRef(0)
  const pendingSetupReturnFocus = useRef<{ key: string | null; pathname: string } | null>(null)
  const pageTransitionTimer = useRef<number | undefined>(undefined)
  const previousPathname = useRef(location.pathname)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuRouteKey, setMenuRouteKey] = useState(location.key)
  const menuButton = useRef<HTMLButtonElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const isMenuOpen = menuOpen && menuRouteKey === location.key
  const today = usePuzzleDate(state.settings.timeZone)
  const stats = useMemo(() => calculateStatistics(state.history, state.settings.timeZone, today ?? undefined), [state.history, state.settings.timeZone, today])
  const dark = state.settings.theme === 'dark'
    || (state.settings.theme === 'system' && systemDark)
  const pendingStateTarget = pendingEntryState ? new URL(pendingEntryState.href, window.location.origin) : null
  const pendingStateIsActiveRoute = Boolean(pendingStateTarget && location.pathname === pendingStateTarget.pathname && routeMode === 'freeplay')
  const pendingEntry = pendingEntryState
    && (location.key === pendingEntryState.sourceKey || pendingStateIsActiveRoute)
    ? pendingEntryState
    : null
  const pendingTokenForExperience = pendingEntry?.token
  const pendingTarget = pendingEntry ? new URL(pendingEntry.href, window.location.origin) : null
  const pendingIsActiveRoute = Boolean(pendingTarget && location.pathname === pendingTarget.pathname && routeMode === 'freeplay')
  const activeGameId = pendingEntry?.gameId ?? routeGameId
  const activeGame = getGame(activeGameId ?? undefined)
  const activeFormat = pendingEntry ? pendingEntry.format : routeFormat
  const setupOpen = Boolean((pendingEntry?.ready && !pendingIsActiveRoute) || (routeGame && routeMode === 'freeplay' && startedLaunchKey !== routeIdentity && !isResumeRoute))
  const shouldShowSetup = Boolean(pendingEntry || (routeGame && routeMode === 'freeplay' && startedLaunchKey !== routeIdentity && !isResumeRoute))
  const preparingGame = Boolean(pendingEntry && !pendingIsActiveRoute)
  const gameIsReady = !preparingGame && !pageTransitioning
    && (pendingEntry ? pendingEntry.experienceReady : readyLaunchKey === routeIdentity)

  useEffect(() => {
    if (!pendingEntryState || pendingEntry) return
    // The router moved away from both the source page and pending game target.
    // Clear the preloaded entry so returning through browser history cannot revive it.
    const token = pendingEntryState.token
    const frame = requestAnimationFrame(() => {
      setPendingEntry((current) => current?.token === token ? null : current)
    })
    return () => cancelAnimationFrame(frame)
  }, [location.key, location.pathname, pendingEntry, pendingEntryState])

  const beginGameEntry = useCallback(({ gameId, href, from, returnFocusKey }: GameEntryRequest) => {
    const game = getGame(gameId)
    if (!game) return
    const target = new URL(href, window.location.origin)
    target.searchParams.set('mode', 'freeplay')
    const format = getSelectedFormat(game.id, target.searchParams.get('format'))
    if (format) target.searchParams.set('format', format)
    else target.searchParams.delete('format')
    setReadyLaunchKey('')
    setPendingEntry({
      gameId: game.id,
      format,
      href: `${target.pathname}${target.search}`,
      from,
      returnFocusKey,
      sourceKey: location.key,
      ready: false,
      experienceReady: false,
      token: ++pendingToken.current,
    })
  }, [location.key])

  const changeSetupFormat = useCallback((format: string) => {
    const pendingGame = pendingEntry ? getGame(pendingEntry.gameId) : null
    if (pendingEntry && pendingGame) {
      if (!formatsForGame(pendingGame.id).some((item) => item.id === format) || pendingEntry.format === format) return
      const target = new URL(pendingEntry.href, window.location.origin)
      target.searchParams.set('format', format)
      if (pendingIsActiveRoute) {
        const next = new URLSearchParams(location.search)
        next.set('mode', 'freeplay')
        next.set('format', format)
        setSearchParams(next, { replace: true })
      }
      setReadyLaunchKey('')
      setPendingEntry((current) => current?.token === pendingEntry.token ? {
        ...current,
        format,
        href: `${target.pathname}${target.search}`,
        experienceReady: false,
      } : current)
      return
    }
    if (!routeGame || routeFormat === format) return
    const next = new URLSearchParams(location.search)
    next.set('mode', 'freeplay')
    next.set('format', format)
    setSearchParams(next, { replace: true })
  }, [location.search, pendingEntry, pendingIsActiveRoute, routeFormat, routeGame, setSearchParams])

  const onExperienceReady = useCallback(() => {
    if (pendingTokenForExperience !== undefined) {
      setPendingEntry((current) => current?.token === pendingTokenForExperience && (!current.ready || !current.experienceReady)
        ? { ...current, ready: true, experienceReady: true }
        : current)
    }
    if (routeGame && routeMode === 'freeplay') setReadyLaunchKey(routeIdentity)
  }, [pendingTokenForExperience, routeGame, routeIdentity, routeMode])

  const startFreePlay = useCallback(() => {
    if (!routeGame || routeMode !== 'freeplay') return
    setStartedLaunchKey(routeIdentity)
    setPendingEntry(null)
  }, [routeGame, routeIdentity, routeMode])

  const dismissSetup = useCallback(() => {
    const returnTo = pendingIsActiveRoute ? getSetupReturnPath(location.state) : pendingEntry?.from
    const destination = returnTo ?? getSetupReturnPath(location.state)
    pendingSetupReturnFocus.current = {
      key: pendingEntry?.returnFocusKey ?? null,
      pathname: new URL(destination, window.location.origin).pathname,
    }
    if (preparingGame) {
      setPendingEntry(null)
      return
    }
    setPendingEntry(null)
    navigate(destination, { replace: true })
  }, [location.state, navigate, pendingEntry?.from, pendingEntry?.returnFocusKey, pendingIsActiveRoute, preparingGame])

  useLayoutEffect(() => {
    const restore = pendingSetupReturnFocus.current
    if (!restore || pendingEntryState || location.pathname !== restore.pathname) return
    const frame = requestAnimationFrame(() => {
      const trigger = restore.key
        ? Array.from(document.querySelectorAll<HTMLElement>('[data-game-entry-focus]')).find((element) => element.dataset.gameEntryFocus === restore.key)
        : null
      ;(trigger ?? document.getElementById('main-content'))?.focus({ preventScroll: true })
      pendingSetupReturnFocus.current = null
    })
    return () => cancelAnimationFrame(frame)
  }, [location.key, location.pathname, pendingEntryState])

  const onSetupEntered = useCallback(() => {
    if (!pendingEntry || pendingIsActiveRoute) return
    navigate(pendingEntry.href, { state: { from: pendingEntry.from } })
  }, [navigate, pendingEntry, pendingIsActiveRoute])

  const updateSettingsTarget = useCallback((target: HTMLDivElement | null) => setSettingsTarget(target), [])

  useLayoutEffect(() => {
    const previous = previousPathname.current
    if (previous === location.pathname) return
    previousPathname.current = location.pathname
    const enteringDaily = isGamePath(location.pathname) && routeMode === 'daily'
    if (enteringDaily) return
    if (!isGamePath(location.pathname) && !isGamePath(previous)) return
    window.clearTimeout(pageTransitionTimer.current)
    setPageTransitioning(true)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    pageTransitionTimer.current = window.setTimeout(() => setPageTransitioning(false), reducedMotion ? 0 : 280)
  }, [location.pathname, routeMode])

  useEffect(() => () => window.clearTimeout(pageTransitionTimer.current), [])

  useLayoutEffect(() => {
    if (startedLaunchKey !== routeIdentity) return
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('.game-playfield')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [routeIdentity, startedLaunchKey])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButton.current?.focus()
    }
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !navigationRef.current?.contains(event.target) && !menuButton.current?.contains(event.target)) setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
    }
  }, [isMenuOpen])

  useEffect(() => {
    const closeOnHistoryNavigation = () => setMenuOpen(false)
    window.addEventListener('popstate', closeOnHistoryNavigation)
    return () => window.removeEventListener('popstate', closeOnHistoryNavigation)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    requestAnimationFrame(() => navigationRef.current?.querySelector('a')?.focus({ preventScroll: true }))
  }, [isMenuOpen])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'start' }))
      return
    }
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [location.pathname, location.hash])

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {offline && <div className="offline-banner" role="status">Offline mode · your saved games are still here</div>}
      {!state.storageAvailable && <div className="offline-banner storage-banner" role="status">Browser storage is unavailable. This session may not be saved.</div>}
      <header className="site-header site-header-polished">
        <NavLink className="brand" to="/" aria-label="maproom. home"><span>maproom<span className="brand-period">.</span></span></NavLink>
        <nav ref={navigationRef} id="primary-navigation" className={`primary-nav${isMenuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          {navigation.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' is-current' : ''}`}>{label}</NavLink>)}
        </nav>
        <button ref={menuButton} className="mobile-menu-toggle" type="button" aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="primary-navigation" aria-expanded={isMenuOpen} onClick={() => {
          if (isMenuOpen) setMenuOpen(false)
          else { setMenuRouteKey(location.key); setMenuOpen(true) }
        }}>{isMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}</button>
        <div className="header-tools">
          <button className="theme-toggle" type="button" title={`Switch to ${dark ? 'light' : 'dark'} appearance`} aria-label={`Switch to ${dark ? 'light' : 'dark'} appearance`} onClick={() => void updateSettings({ theme: dark ? 'light' : 'dark' })}>
            {dark ? <Sun size={17} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={17} strokeWidth={1.8} aria-hidden="true" />}
          </button>
          <NavLink className="streak-shortcut" to="/statistics#activity" title={`Current streak: ${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`} aria-label={`Current streak ${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}; view activity in Statistics`}>
            <Flame size={16} strokeWidth={1.65} aria-hidden="true" /><span>{stats.currentStreak}</span>
          </NavLink>
          <NavLink className="favorite-shortcut" to="/explore?filter=favorites" title={`Favorite games, ${state.favorites.length}`} aria-label={`Favorite games, ${state.favorites.length}`}>
            <Heart size={16} strokeWidth={1.7} aria-hidden="true" /><span>{state.favorites.length}</span>
          </NavLink>
          <NavLink className="settings-shortcut" to="/settings" title="Settings" aria-label="Settings">
            <Settings size={17} strokeWidth={1.7} aria-hidden="true" />
          </NavLink>
        </div>
      </header>
      <GameEntryContext.Provider value={beginGameEntry}>
        <FreePlaySetupContext.Provider value={{
          setup: shouldShowSetup,
          format: activeFormat,
          settingsTarget,
          onExperienceReady,
        }}>
          <main id="main-content" className={`main-content${isGameRoute ? ' main-content-game' : ''}`} tabIndex={-1}>
            <div className={`route-content${pageTransitioning && !isGameRoute ? ' is-transitioning' : ''}`}><Outlet /></div>
            {activeGameId && <div
              className={`game-route-layer${preparingGame ? ' is-preparing' : ''}${pageTransitioning && isGameRoute && routeMode === 'freeplay' ? ' is-transitioning' : ''}`}
              aria-hidden={preparingGame}
              inert={preparingGame}
            ><Suspense fallback={<div className="page game-page"><LoadingState label="Loading this game…" /></div>}><GamePage gameId={activeGameId} preparing={preparingGame} launchFormat={activeFormat} /></Suspense></div>}
          </main>
          {activeGame && shouldShowSetup && <GameSetupOverlay
            game={activeGame}
            open={setupOpen}
            formats={formatsForGame(activeGame.id)}
            format={activeFormat}
            canStart={gameIsReady}
            onFormatChange={changeSetupFormat}
            onStart={startFreePlay}
            onDismiss={dismissSetup}
            onSettingsTargetChange={updateSettingsTarget}
            onEntered={onSetupEntered}
          />}
        </FreePlaySetupContext.Provider>
      </GameEntryContext.Provider>
      <footer className="site-footer">
        <div className="footer-brand"><NavLink className="footer-wordmark" to="/" aria-label="Maproom home">maproom<span className="brand-period">.</span></NavLink><small>© Maproom</small></div>
        <nav className="footer-links" aria-label="Footer navigation">
          <NavLink to="/explore">Explore</NavLink><NavLink to="/about">About</NavLink><NavLink to="/data">Data sources</NavLink><NavLink to="/privacy">Privacy</NavLink>
        </nav>
      </footer>
    </div>
  )
}

function getSelectedFormat(gameId: NonNullable<ReturnType<typeof getGame>>['id'], requested: string | null): string | null {
  const formats = formatsForGame(gameId)
  return formats.find((format) => format.id === requested)?.id ?? formats[0]?.id ?? null
}

function decodeRouteSegment(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}

function isGamePath(pathname: string): boolean {
  return /^\/games\/[^/]+\/?$/.test(pathname)
}

function getSetupReturnPath(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/explore'
  const from = state.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/explore'
}
