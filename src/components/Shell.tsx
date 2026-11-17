import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Heart, Menu, X } from 'lucide-react'
import { useAppData } from '../app/useAppData'

const navigation = [
  { to: '/', label: 'Daily' },
  { to: '/explore', label: 'Explore' },
  { to: '/statistics', label: 'Statistics' },
  { to: '/settings', label: 'Settings' },
]

export function Shell() {
  const location = useLocation()
  const { state } = useAppData()
  const isGameRoute = location.pathname.startsWith('/games/')
  const [offline, setOffline] = useState(!navigator.onLine)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuRouteKey, setMenuRouteKey] = useState(location.key)
  const menuButton = useRef<HTMLButtonElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const isMenuOpen = menuOpen && menuRouteKey === location.key

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
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [location.pathname])

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {offline && <div className="offline-banner" role="status">Offline mode · your saved games are still here</div>}
      {!state.storageAvailable && <div className="offline-banner storage-banner" role="status">Browser storage is unavailable. This session may not be saved.</div>}
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="maproom. home">
          <span>maproom<span className="brand-period">.</span></span>
        </NavLink>
        <nav ref={navigationRef} id="primary-navigation" className={`primary-nav${isMenuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          {navigation.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' is-current' : ''}`}>{label}</NavLink>
          ))}
        </nav>
        <button ref={menuButton} className="mobile-menu-toggle" type="button" aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="primary-navigation" aria-expanded={isMenuOpen} onClick={() => {
          if (isMenuOpen) setMenuOpen(false)
          else { setMenuRouteKey(location.key); setMenuOpen(true) }
        }}>{isMenuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}</button>
        <div className="header-tools">
          <NavLink className="favorite-shortcut" to="/explore?filter=favorites" aria-label={`Favorite games, ${state.favorites.length}`}>
            <Heart size={16} strokeWidth={1.7} aria-hidden="true" />
            <span>{state.favorites.length}</span>
          </NavLink>
        </div>
      </header>
      <main id="main-content" className={`main-content${isGameRoute ? ' main-content-game' : ''}`} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <NavLink to="/about">About Maproom</NavLink>
        <NavLink to="/data">Data sources</NavLink>
        <NavLink to="/privacy">Privacy</NavLink>
      </footer>
    </div>
  )
}
