import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Flame, Heart, Menu, Moon, Settings, Sun, X } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { usePuzzleDate } from '../hooks/usePuzzleDate'
import { calculateStatistics } from '../statistics/summary'

const navigation = [
  { to: '/', label: 'Daily' },
  { to: '/explore', label: 'Explore' },
  { to: '/statistics', label: 'Statistics' },
]

export function Shell() {
  const location = useLocation()
  const { state, updateSettings } = useAppData()
  const isGameRoute = location.pathname.startsWith('/games/')
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
      <header className="site-header">
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
      <main id="main-content" className={`main-content${isGameRoute ? ' main-content-game' : ''}`} tabIndex={-1}><Outlet /></main>
      <footer className="site-footer">
        <div className="footer-brand"><NavLink className="footer-wordmark" to="/" aria-label="Maproom home">maproom<span className="brand-period">.</span></NavLink><small>© Maproom</small></div>
        <nav className="footer-links" aria-label="Footer navigation">
          <NavLink to="/explore">Explore</NavLink><NavLink to="/about">About</NavLink><NavLink to="/data">Data sources</NavLink><NavLink to="/privacy">Privacy</NavLink>
        </nav>
      </footer>
    </div>
  )
}
