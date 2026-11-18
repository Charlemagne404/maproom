import { type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Check, Heart } from 'lucide-react'
import type { GameId } from '../geography/types'
import type { GameFormat, GameInfo } from '../games/catalog'
import { useBeginGameEntry } from './GameEntryContext'
import { GameArtwork } from './GameArtwork'

export function PageHeading({ eyebrow, title, description, aside }: {
  eyebrow?: string
  title: string
  description?: string
  aside?: React.ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {aside && <div className="page-heading-aside">{aside}</div>}
    </div>
  )
}

export function GameCard({ game, mode, favorite, completed, onFavorite, compact = false, favoriteContext }: {
  game: GameInfo
  mode: 'daily' | 'freeplay'
  favorite: boolean
  completed?: boolean
  onFavorite?: (id: GameId) => void
  compact?: boolean
  favoriteContext?: string
}) {
  const location = useLocation()
  const beginGameEntry = useBeginGameEntry()
  const returnState = { from: `${location.pathname}${location.search}${location.hash}` }
  const href = `${game.path}?mode=${mode}`
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (mode !== 'freeplay' || !isPlainLinkActivation(event)) return
    event.preventDefault()
    beginGameEntry({ gameId: game.id, href, from: returnState.from, returnFocusKey: `${game.id}:${mode}` })
  }
  return (
    <article className={`game-card game-card-${game.id}${compact ? ' game-card-compact' : ''}${completed ? ' is-complete' : ''}`}>
      <div className="game-card-topline">
        {completed && <span className="completed-mark" role="img" aria-label={`${game.title} played today`} title="Played today"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>}
        {onFavorite && (
          <button type="button" className={`favorite-button${favorite ? ' is-favorite' : ''}`} aria-label={favoriteActionLabel(game.title, favorite, favoriteContext)} aria-pressed={favorite} onClick={() => onFavorite(game.id)}>
            <Heart size={17} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}
      </div>
      <Link className="game-card-link" to={href} state={returnState} onClick={handleClick} aria-label={`${game.title}, ${mode === 'daily' ? completed ? 'review today’s puzzle' : 'daily puzzle' : 'Free play setup'}`} data-game-entry-focus={`${game.id}:${mode}`}>
        <div className="game-card-art" aria-hidden="true"><GameArtwork gameId={game.id} /></div>
        <div className="game-card-copy">
          <h2>{game.title}</h2>
        </div>
        <span className="game-card-action" aria-hidden="true"><ArrowUpRight size={17} /></span>
      </Link>
    </article>
  )
}

export function GameFormatCard({ game, format, favorite, onFavorite }: {
  game: GameInfo
  format: GameFormat
  favorite: boolean
  onFavorite?: (id: GameId) => void
}) {
  const location = useLocation()
  const beginGameEntry = useBeginGameEntry()
  const href = `${game.path}?mode=freeplay&format=${encodeURIComponent(format.id)}`
  const from = `${location.pathname}${location.search}${location.hash}`
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainLinkActivation(event)) return
    event.preventDefault()
    beginGameEntry({ gameId: game.id, href, from, returnFocusKey: `${game.id}:${format.id}` })
  }
  return (
    <article className={`game-card game-card-${game.id} game-format-card`}>
      <div className="game-card-topline">
        <span className="game-format-category">{game.shortTitle}</span>
        {onFavorite && <button type="button" className={`favorite-button${favorite ? ' is-favorite' : ''}`} aria-label={favoriteActionLabel(game.title, favorite, format.title)} aria-pressed={favorite} onClick={() => onFavorite(game.id)}>
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>}
      </div>
      <Link className="game-card-link" to={href} state={{ from }} onClick={handleClick} aria-label={`${game.title}: ${format.title}, Free play`} data-game-entry-focus={`${game.id}:${format.id}`}>
        <div className="game-card-art" aria-hidden="true"><GameArtwork gameId={game.id} /></div>
        <div className="game-card-copy">
          <h2>{format.title}</h2>
          <p>{format.description}</p>
        </div>
        <span className="game-card-action" aria-hidden="true"><ArrowUpRight size={17} /></span>
      </Link>
    </article>
  )
}

function favoriteActionLabel(title: string, favorite: boolean, context?: string): string {
  const subject = context ? `${title} (${context})` : title
  return `${favorite ? 'Remove' : 'Add'} ${subject} ${favorite ? 'from' : 'to'} favorites`
}

function isPlainLinkActivation(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !event.defaultPrevented
    && event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
    && (!event.currentTarget.target || event.currentTarget.target === '_self')
}

export function InlineNotice({ title, children, tone = 'neutral' }: {
  title: string
  children: React.ReactNode
  tone?: 'neutral' | 'success' | 'warning'
}) {
  return <div className={`inline-notice notice-${tone}`} role="status"><strong>{title}</strong><div>{children}</div></div>
}

export function LoadingState({ label = 'Opening the atlas…' }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="loading-rule" /><span>{label}</span></div>
}
