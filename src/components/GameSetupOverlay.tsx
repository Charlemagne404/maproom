import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefCallback } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { GameFormat, GameInfo } from '../games/catalog'

export function GameSetupOverlay({
  game,
  open,
  formats,
  format,
  canStart,
  onFormatChange,
  onStart,
  onDismiss,
  onSettingsTargetChange,
  onEntered,
}: {
  game: GameInfo
  open: boolean
  formats: GameFormat[]
  format: string | null
  canStart: boolean
  onFormatChange: (format: string) => void
  onStart: () => void
  onDismiss: () => void
  onSettingsTargetChange: RefCallback<HTMLDivElement>
  onEntered: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const entryTimer = useRef<number | undefined>(undefined)
  const onEnteredRef = useRef(onEntered)
  const entryNotified = useRef(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => { onEnteredRef.current = onEntered }, [onEntered])

  const notifyEntered = useCallback(() => {
    if (entryNotified.current) return
    entryNotified.current = true
    window.clearTimeout(entryTimer.current)
    onEnteredRef.current()
  }, [])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      entryNotified.current = false
      element.showModal()
      requestAnimationFrame(() => closeButton.current?.focus({ preventScroll: true }))
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      entryTimer.current = window.setTimeout(notifyEntered, reducedMotion ? 100 : 1000)
    } else if (!open && element.open) {
      window.clearTimeout(entryTimer.current)
      element.close()
      setClosing(false)
    }
    return () => {
      window.clearTimeout(closeTimer.current)
      window.clearTimeout(entryTimer.current)
    }
  }, [notifyEntered, open])

  function beginClose(action: () => void) {
    if (closing) return
    setClosing(true)
    window.clearTimeout(entryTimer.current)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    closeTimer.current = window.setTimeout(action, reducedMotion ? 0 : 180)
  }

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const candidates = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), summary, a[href], [tabindex]:not([tabindex="-1"])')
    const focusable = Array.from(candidates ?? []).filter((element) => element.getClientRects().length > 0)
    if (!focusable.length) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog
      ref={dialog}
      className={`game-setup-dialog${closing ? ' is-closing' : ''}`}
      aria-labelledby={`game-setup-title-${game.id}`}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); beginClose(onDismiss) }}
      onKeyDown={keepFocusInside}
      onClick={(event) => { if (event.target === event.currentTarget) beginClose(onDismiss) }}
    >
      <img className="game-setup-topography" src="/illustrations/game-setup-topography.svg" alt="" aria-hidden="true" />
      <section className="game-setup-panel" aria-label="Free play setup" onAnimationEnd={(event) => {
        if (event.animationName === 'setup-panel-enter' && dialog.current?.open) notifyEntered()
      }}>
        <header className="game-setup-heading">
          <div><span className="eyebrow">Free play setup</span><h2 id={`game-setup-title-${game.id}`}>{game.title}</h2><p className="game-setup-description">{game.description}</p></div>
          <button ref={closeButton} className="game-setup-close" type="button" aria-label="Close setup" onClick={() => beginClose(onDismiss)}><X size={19} aria-hidden="true" /></button>
        </header>
        <div className="game-setup-options" role="group" aria-label="Free play setup">
          {formats.length > 0 && <section className="game-setup-formats" aria-label="Game formats">
            <span className="setup-section-label">Format</span>
            <div className={`setup-format-grid${formats.length > 2 ? ' has-many-formats' : ''}`} role="group" aria-label="Game formats">
              {formats.map((item) => <button type="button" key={item.id} className={`setup-format-option${format === item.id ? ' is-selected' : ''}`} aria-pressed={format === item.id} onClick={() => onFormatChange(item.id)}>
                <strong>{item.title}</strong><span>{item.description}</span>
              </button>)}
            </div>
          </section>}
          <div ref={onSettingsTargetChange} className="game-setup-settings" />
          <button className="button button-dark game-setup-start" type="button" disabled={closing} aria-disabled={!canStart} onClick={() => { if (canStart) beginClose(onStart) }}>Start free play <ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </section>
    </dialog>
  )
}
