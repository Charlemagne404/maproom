import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUpRight, Search } from 'lucide-react'
import { normalizeAnswer } from '../puzzles/engine'

export interface Suggestion {
  value: string
  label: string
  detail?: string
  aliases?: string[]
}

export function AutocompleteInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  suggestions,
  onPick,
  onSubmit,
  submitLabel = 'Submit',
  disabled = false,
  retainFocusWhenDisabled = false,
  autoFocus = false,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  suggestions: Suggestion[]
  onPick: (suggestion: Suggestion) => void
  onSubmit: () => void
  submitLabel?: string
  disabled?: boolean
  retainFocusWhenDisabled?: boolean
  autoFocus?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const blurTimer = useRef<number | null>(null)
  const acceptedLabel = useRef<string | null>(null)
  const matches = useMemo(() => {
    const needle = normalizeAnswer(value)
    if (!needle) return []
    return suggestions.map((suggestion, order) => ({ suggestion, order, rank: suggestionRank(suggestion, needle) }))
      .filter((item) => item.rank < Number.POSITIVE_INFINITY)
      .sort((left, right) => left.rank - right.rank || left.order - right.order)
      .map((item) => item.suggestion)
      .slice(0, 7)
  }, [suggestions, value])

  useEffect(() => () => {
    if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    if (retainFocusWhenDisabled) input.current?.focus({ preventScroll: true })
    acceptedLabel.current = null
    setOpen(false)
    setActiveIndex(null)
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      if (event.key === 'Enter') event.preventDefault()
      return
    }
    if (event.key === 'Escape' && open && matches.length) {
      event.preventDefault()
      setOpen(false)
      setActiveIndex(null)
    }
    if (event.key === 'Enter' && acceptedLabel.current === value) {
      event.preventDefault()
      acceptedLabel.current = null
      setOpen(false)
      setActiveIndex(null)
      onSubmit()
      return
    }
    if (event.key === 'Enter' && open && matches.length) {
      event.preventDefault()
      acceptSuggestion(matches[activeIndex ?? 0] ?? matches[0]!)
      return
    }
    if (event.key === 'ArrowDown' && matches.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => current === null ? 0 : Math.min(current + 1, matches.length - 1))
    }
    if (event.key === 'ArrowUp' && matches.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => current === null ? matches.length - 1 : Math.max(Math.min(current, matches.length - 1) - 1, 0))
    }
  }

  function acceptSuggestion(suggestion: Suggestion) {
    if (disabled) return
    acceptedLabel.current = suggestion.label
    onChange(suggestion.label)
    setOpen(false)
    setActiveIndex(null)
  }

  return (
    <form className="answer-form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className="autocomplete-field">
        <Search size={17} aria-hidden="true" />
        <input
          ref={input}
          id={id}
          value={value}
          onChange={(event) => { acceptedLabel.current = null; setActiveIndex(null); onChange(event.target.value); setOpen(true) }}
          onFocus={() => {
            if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
            blurTimer.current = null
            setOpen(true)
          }}
          onBlur={() => {
            if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
            blurTimer.current = window.setTimeout(() => {
              blurTimer.current = null
              setOpen(false)
              setActiveIndex(null)
            }, 120)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && matches.length > 0}
          aria-controls={open && matches.length > 0 ? `${id}-suggestions` : undefined}
          aria-activedescendant={open && activeIndex !== null && matches[activeIndex] ? `${id}-suggestion-${activeIndex}` : undefined}
          disabled={disabled && !retainFocusWhenDisabled}
          readOnly={disabled && retainFocusWhenDisabled}
          aria-disabled={disabled && retainFocusWhenDisabled ? true : undefined}
          autoFocus={autoFocus}
        />
        <button className="button button-dark answer-submit" type="submit" disabled={disabled || !value.trim()}>
          {submitLabel}<ArrowUpRight size={15} aria-hidden="true" />
        </button>
        {open && matches.length > 0 && !disabled && (
          <div className="suggestion-list" id={`${id}-suggestions`} role="listbox" aria-label={`${label} suggestions`}>
            {matches.map((suggestion, index) => (
              <div
                id={`${id}-suggestion-${index}`}
                key={suggestion.value}
                role="option"
                aria-selected={activeIndex === index}
                className={`suggestion-option${activeIndex === index ? ' is-active' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { acceptedLabel.current = suggestion.label; onPick(suggestion); setOpen(false); setActiveIndex(null) }}
              >
                <span>{suggestion.label}</span>{suggestion.detail && <small>{suggestion.detail}</small>}
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  )
}

function suggestionRank(suggestion: Suggestion, needle: string): number {
  const label = normalizeAnswer(suggestion.label)
  const aliases = (suggestion.aliases ?? []).map(normalizeAnswer)
  if (label === needle) return 0
  if (aliases.includes(needle)) return 1
  if (label.startsWith(needle)) return 2
  if (aliases.some((alias) => alias.startsWith(needle))) return 3
  if (label.includes(needle)) return 4
  if (aliases.some((alias) => alias.includes(needle))) return 5
  return Number.POSITIVE_INFINITY
}
