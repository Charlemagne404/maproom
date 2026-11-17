import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import type { GameId, GameMode, GameResult } from '../geography/types'
import { getGame } from '../games/catalog'

interface GameResultsDialogProps {
  complete: boolean
  gameId: GameId
  mode: GameMode
  score: number
  correct: number
  total: number
  title: string
  message?: string
  saveError?: string
  onReplay?: () => void
  replayLabel?: string
}

export function GameResultsDialog({ complete, gameId, mode, score, correct, total, title, message, saveError, onReplay, replayLabel = 'Play again' }: GameResultsDialogProps) {
  const [dismissed, setDismissed] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const primaryAction = useRef<HTMLButtonElement>(null)
  const reopen = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const open = complete && !dismissed
  const accuracy = total > 0 ? Math.round(correct / total * 100) : 0

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      element.showModal()
      requestAnimationFrame(() => {
        const action = primaryAction.current ?? element.querySelector<HTMLElement>('.game-results-actions a.button')
        action?.focus({ preventScroll: true })
      })
    } else if (!open && element.open) {
      element.close()
      if (restoreFocus.current) {
        restoreFocus.current = false
        requestAnimationFrame(() => reopen.current?.focus({ preventScroll: true }))
      }
    }
  }, [open])

  function dismiss(event?: SyntheticEvent<HTMLDialogElement>) {
    event?.preventDefault()
    restoreFocus.current = true
    setDismissed(true)
  }

  function trapFocus(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')]
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!complete) return null

  return (
    <>
      {dismissed && <button ref={reopen} className="results-reopen" type="button" onClick={() => setDismissed(false)}>View results</button>}
      <dialog ref={dialog} className="game-results-dialog" aria-labelledby={`results-${gameId}-title`} onCancel={dismiss} onKeyDown={trapFocus}>
        <div className="game-results-topline">
          <span className="eyebrow">{mode === 'daily' ? 'Daily puzzle' : 'Free play'}</span>
          <button className="game-results-close" type="button" aria-label="Close results" onClick={() => dismiss()}><X size={18} aria-hidden="true" /></button>
        </div>
        <h2 id={`results-${gameId}-title`}>{title}</h2>
        {message && <p className="game-results-message">{message}</p>}
        <div className="game-results-score"><strong>{score.toLocaleString()}</strong><span>points</span></div>
        <p className="game-results-summary"><strong>{correct} / {total}</strong> correct <span aria-hidden="true">·</span> <strong>{accuracy}%</strong> accuracy</p>
        <div className="game-results-actions">
          {onReplay
            ? <button ref={primaryAction} className="button button-dark" type="button" onClick={onReplay}>{replayLabel}</button>
            : <Link className="button button-dark" to={`${getGame(gameId)?.path ?? '/explore'}?mode=freeplay`}>{mode === 'daily' ? 'Play in Free play' : 'Play again'}</Link>}
          {mode === 'daily' && <Link className="button button-outline" to="/">Today’s puzzles</Link>}
          <Link className="button button-outline" to="/statistics">Statistics</Link>
          <Link className="game-results-library" to="/explore">All games</Link>
        </div>
        <button className="game-results-return" type="button" onClick={() => dismiss()}>Return to the puzzle</button>
        {saveError && <div className="form-message form-message-error" role="alert">{saveError}</div>}
      </dialog>
    </>
  )
}

export function CompletedPuzzle({ gameTitle, result }: { gameTitle: string; result: GameResult }) {
  const accuracy = result.total > 0 ? Math.round(result.correct / result.total * 100) : 0
  const gamePath = getGame(result.gameId)?.path ?? '/explore'
  return (
    <section className="completed-daily-result" aria-labelledby="completed-puzzle-title">
      <span className="eyebrow">Daily puzzle complete</span>
      <h2 id="completed-puzzle-title">You’ve already played today.</h2>
      <p className="completed-daily-game">{gameTitle}</p>
      <div className="completed-daily-score"><strong>{result.score.toLocaleString()}</strong><span>points</span></div>
      <p className="completed-daily-summary"><strong>{result.correct} / {result.total}</strong> correct <span aria-hidden="true">·</span> <strong>{accuracy}%</strong> accuracy</p>
      <div className="completed-daily-actions">
        <Link className="button button-dark" to={`${gamePath}?mode=freeplay`}>Play in Free play</Link>
        <Link className="button button-outline" to="/">Today’s puzzles</Link>
        <Link className="completed-daily-statistics" to="/statistics">Statistics</Link>
      </div>
    </section>
  )
}
