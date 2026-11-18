import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Settings2 } from 'lucide-react'
import { FreePlaySetupContext } from './FreePlaySetupContext'

export interface GameSettingOption {
  value: string
  label: string
}

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
    if (!open || setup.setup) return
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
  }, [changeOpen, open, setup.setup])

  if (setup.setup) return setup.settingsTarget ? createPortal(children, setup.settingsTarget) : null

  return (
    <div className="game-settings-control" ref={root}>
      <button ref={button} className="game-settings-button" type="button" aria-label={label} aria-controls="game-settings-panel" aria-expanded={open} title={label} onClick={() => changeOpen(!open)}>
        <Settings2 size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && <div className="game-settings-panel" id="game-settings-panel" role="group" aria-label={label}>{children}</div>}
    </div>
  )
}

export function GameSettingSelect({ label, value, options, onChange, control = 'auto' }: {
  label: string
  value: string | number
  options: GameSettingOption[]
  onChange: (value: string) => void
  control?: 'auto' | 'select'
}) {
  const { setup } = useContext(FreePlaySetupContext)
  const selected = String(value)
  const segmented = setup && control === 'auto' && options.length <= 4

  if (segmented) return (
    <div className="setup-setting-field">
      <span className="setup-setting-label">{label}</span>
      <div className={`setup-choice-group${options.length === 2 ? ' is-pair' : ''}${options.length > 2 ? ' is-wide' : ''}`} role="group" aria-label={label}>
        {options.map((option) => <button key={option.value} className={`setup-choice${selected === option.value ? ' is-selected' : ''}`} type="button" aria-pressed={selected === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
      </div>
    </div>
  )

  return (
    <label className="practice-config-field">
      <span>{label}</span>
      <select value={selected} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

export function GameSettingToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="game-setting-toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>
}

export function AdvancedGameSettings({ children, label = 'Advanced options' }: { children: ReactNode; label?: string }) {
  const { setup } = useContext(FreePlaySetupContext)
  if (!setup) return <>{children}</>
  return <details className="game-setup-advanced"><summary><span>{label}</span><ChevronDown size={16} aria-hidden="true" /></summary><div className="game-setup-advanced-fields">{children}</div></details>
}
