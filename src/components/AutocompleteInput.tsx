import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
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
  autoFocus?: boolean
}) {
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => {
    const needle = normalizeAnswer(value)
    if (!needle) return []
    return suggestions
      .filter((suggestion) => [suggestion.label, ...(suggestion.aliases ?? [])]
        .some((text) => normalizeAnswer(text).includes(needle)))
      .slice(0, 7)
  }, [suggestions, value])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOpen(false)
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') setOpen(false)
    if (event.key === 'ArrowDown' && matches.length) {
      event.preventDefault()
      setOpen(true)
      document.getElementById(`${id}-suggestion-0`)?.focus()
    }
  }

  return (
    <form className="answer-form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className="autocomplete-field">
        <Search size={17} aria-hidden="true" />
        <input
          id={id}
          value={value}
          onChange={(event) => { onChange(event.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${id}-suggestions`}
          disabled={disabled}
          autoFocus={autoFocus}
        />
        <button className="button button-dark answer-submit" type="submit" disabled={disabled || !value.trim()}>
          {submitLabel}<ArrowUpRight size={15} aria-hidden="true" />
        </button>
        {open && matches.length > 0 && (
          <div className="suggestion-list" id={`${id}-suggestions`} role="listbox" aria-label={`${label} suggestions`}>
            {matches.map((suggestion, index) => (
              <button
                id={`${id}-suggestion-${index}`}
                key={suggestion.value}
                type="button"
                role="option"
                aria-selected={false}
                className="suggestion-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { onPick(suggestion); setOpen(false) }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    document.getElementById(`${id}-suggestion-${Math.min(index + 1, matches.length - 1)}`)?.focus()
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    if (index === 0) document.getElementById(id)?.focus()
                    else document.getElementById(`${id}-suggestion-${index - 1}`)?.focus()
                  }
                }}
              >
                <span>{suggestion.label}</span>{suggestion.detail && <small>{suggestion.detail}</small>}
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  )
}
