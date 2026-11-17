import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, Heart } from 'lucide-react'
import type { GameId } from '../geography/types'
import type { GameInfo } from '../games/catalog'
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

export function GameCard({ game, mode, favorite, completed, onFavorite, compact = false }: {
  game: GameInfo
  mode: 'daily' | 'practice'
  favorite: boolean
  completed?: boolean
  onFavorite?: (id: GameId) => void
  compact?: boolean
}) {
  return (
    <article className={`game-card game-card-${game.id}${compact ? ' game-card-compact' : ''}${completed ? ' is-complete' : ''}`}>
      <div className="game-card-topline">
        {completed && <span className="completed-mark" role="img" aria-label={`${game.title} played today`} title="Played today"><Check size={14} strokeWidth={3} aria-hidden="true" /></span>}
        {onFavorite && (
          <button type="button" className={`favorite-button${favorite ? ' is-favorite' : ''}`} aria-label={`${favorite ? 'Remove' : 'Add'} ${game.title} ${favorite ? 'from' : 'to'} favorites`} aria-pressed={favorite} onClick={() => onFavorite(game.id)}>
            <Heart size={17} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}
      </div>
      <Link className="game-card-link" to={`${game.path}?mode=${mode}`} aria-label={`${game.title}, ${mode === 'daily' ? completed ? 'review today’s puzzle' : 'daily puzzle' : 'practice'}`}>
        <div className="game-card-art" aria-hidden="true"><GameArtwork gameId={game.id} /></div>
        <div className="game-card-copy">
          <h2>{game.title}</h2>
        </div>
        <span className="game-card-action" aria-hidden="true"><ArrowUpRight size={17} /></span>
      </Link>
    </article>
  )
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
