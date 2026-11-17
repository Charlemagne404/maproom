import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Settings2 } from 'lucide-react'

export function GameSettingsMenu({ children, label = 'Game settings', open: controlledOpen, onOpenChange }: { children: ReactNode; label?: string; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = controlledOpen ?? localOpen
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
    <div className="game-settings-control" ref={root}>
      <button ref={button} className="game-settings-button" type="button" aria-label={label} aria-controls="game-settings-panel" aria-expanded={open} title={label} onClick={() => changeOpen(!open)}>
        <Settings2 size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && <div className="game-settings-panel" id="game-settings-panel" role="group" aria-label={label}>{children}</div>}
    </div>
  )
}
