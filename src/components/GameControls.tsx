import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Settings2 } from 'lucide-react'
import { FreePlaySetupContext } from './FreePlaySetupContext'

export function GameSettingsMenu({ children, label = 'Game settings', open: controlledOpen, onOpenChange }: { children: ReactNode; label?: string; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const setup = useContext(FreePlaySetupContext)
  const [localOpen, setLocalOpen] = useState(false)
  const open = setup.setup || (controlledOpen ?? localOpen)
  const changeOpen = useCallback((next: boolean) => {
    if (controlledOpen === undefined) setLocalOpen(next)
    onOpenChange?.(next)
  }, [controlledOpen, onOpenChange])
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) changeOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      changeOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [changeOpen, open])

  return (
    <div className={`game-settings-control${setup.setup ? ' is-launch-setup' : ''}`} ref={root}>
      <button ref={button} className="game-settings-button" type="button" aria-label={label} aria-controls="game-settings-panel" aria-expanded={open} title={label} onClick={() => changeOpen(!open)}>
        <Settings2 size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && <div className={`game-settings-panel${setup.setup ? ' freeplay-setup-panel' : ''}`} id="game-settings-panel" role="group" aria-label={setup.setup ? 'Free play setup' : label}>
        {setup.setup && <>
          <div className="freeplay-setup-heading"><span className="eyebrow">Free play setup</span><h2>Choose your format</h2></div>
          {setup.formats.length > 0 && <div className="setup-format-grid" role="group" aria-label="Game formats">
            {setup.formats.map((format) => <button type="button" key={format.id} className={`setup-format-option${setup.format === format.id ? ' is-selected' : ''}`} aria-pressed={setup.format === format.id} onClick={() => setup.onFormatChange(format.id)}>
              <strong>{format.title}</strong><span>{format.description}</span>
            </button>)}
          </div>}
          <h3 className="setup-options-heading">Options</h3>
        </>}
        {children}
        {setup.setup && <button className="button button-dark freeplay-start-button" type="button" onClick={setup.onStart}>Start Free play</button>}
      </div>}
    </div>
  )
}
