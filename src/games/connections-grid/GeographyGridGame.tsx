import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleHelp, Grid3X3, Plus, X } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice } from '../../components/Kit'
import type { GeographyData, GameMode, Country } from '../../geography/types'
import { gridAnswerScore, gridCandidates, seededShuffle, validGridPresets, type GridPreset } from '../../puzzles/engine'
import { useGameSession } from '../session'
import { useAppData } from '../../app/useAppData'
import { eligibleCountries, initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'

export function GeographyGridGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
  const eligible = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const presets = useMemo(() => validGridPresets(eligible, { expanded: mode === 'freeplay' }), [eligible, mode])
  const daily = seededShuffle(presets, `${seed}:preset`)[0]
  const savedPreset = mode === 'daily' ? state.sessions.find((session) => session.gameId === 'grid' && session.mode === 'daily' && session.date === date)?.payload.preset : undefined
  const [presetId, setPresetId] = useState(typeof savedPreset === 'string' ? savedPreset : daily?.id ?? presets[0]?.id ?? '')
  const [round, setRound] = useState(0)
  if (!presets.length) return <InlineNotice title="A validated grid is unavailable" tone="warning">The current country facts do not fill every square for these grid sets.</InlineNotice>
  const preset = presets.find((item) => item.id === presetId) ?? daily ?? presets[0]
  const roundSeed = mode === 'daily' ? `${seed}:${preset.id}` : `${seed}:${preset.id}:${round}:${eligibility}`
  return <GridRound key={`${preset.id}:${roundSeed}`} countries={eligible} mode={mode} date={date} seed={roundSeed} preset={preset} eligibility={eligibility} onEligibility={setEligibility} onReplay={() => {
    const current = presets.findIndex((item) => item.id === preset.id)
    setPresetId(presets[(current + 1) % presets.length]!.id)
    setRound((value) => value + 1)
  }} />
}

function GridRound({ countries, mode, date, seed, preset, eligibility, onEligibility, onReplay }: {
  countries: Country[]
  mode: GameMode
  date: string
  seed: string
  preset: GridPreset
  eligibility: GeographyEligibility
  onEligibility: (value: GeographyEligibility) => void
  onReplay: () => void
}) {
  const session = useGameSession('grid', mode, date, seed)
  const progress = mode === 'daily' ? session.progress : null
  const [answers, setAnswers] = useState<Record<string, Country>>(() => {
    if (!progress?.answers || typeof progress.answers !== 'object') return {}
    return Object.fromEntries(Object.entries(progress.answers as Record<string, unknown>).flatMap(([key, code]) => {
      const country = typeof code === 'string' ? countries.find((item) => item.iso3 === code) : undefined
      return country ? [[key, country]] : []
    }))
  })
  const [inputs, setInputs] = useState<Record<string, string>>(() => progress?.inputs && typeof progress.inputs === 'object' ? progress.inputs as Record<string, string> : {})
  const [errors, setErrors] = useState<Record<string, string>>(() => progress?.errors && typeof progress.errors === 'object' ? progress.errors as Record<string, string> : {})
  const [activeKey, setActiveKey] = useState<string | null>(() => typeof progress?.activeKey === 'string' ? progress.activeKey : null)
  const [score, setScore] = useState(() => typeof progress?.score === 'number' ? progress.score : 0)
  const [finished, setFinished] = useState(() => progress?.finished === true)
  const [criteriaResult, setCriteriaResult] = useState<{ key: string; code: string; rowMatches: boolean; columnMatches: boolean; duplicate: boolean } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const { save, saveError, saveProgress } = session
  const countrySuggestions: Suggestion[] = useMemo(() => countries.map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [countries])
  const filled = Object.keys(answers).length
  const [activeRow, activeColumn] = (activeKey ?? '-1:-1').split(':').map(Number)

  useLayoutEffect(() => {
    if (!activeKey || answers[activeKey] || finished) {
      return
    }
    const position = () => {
      const trigger = gridRef.current?.querySelector<HTMLButtonElement>(`[data-cell-key="${activeKey}"] .grid-cell-trigger`)
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const panel = document.querySelector<HTMLElement>('.grid-entry-panel')
      const margin = 12
      const width = Math.min(360, window.innerWidth - margin * 2)
      const height = panel?.offsetHeight ?? 245
      let left = rect.left + rect.width / 2 - width / 2
      left = Math.max(margin, Math.min(window.innerWidth - width - margin, left))
      let top = rect.bottom + 10
      if (top + height > window.innerHeight - margin) top = rect.top - height - 10
      top = Math.max(margin, Math.min(window.innerHeight - height - margin, top))
      setPopoverPosition({ top, left, width })
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [activeKey, answers, finished, errors, criteriaResult, inputs])

  useEffect(() => {
    if (mode !== 'daily' || finished) return
    void saveProgress({ answers: Object.fromEntries(Object.entries(answers).map(([key, country]) => [key, country.iso3])), inputs, errors, activeKey, score, finished, preset: preset.id })
  }, [mode, finished, answers, inputs, errors, activeKey, score, preset.id, saveProgress])

  async function submitCell(key: string, countryCode: string) {
    if (finished || answers[key]) return
    const [rowIndex, columnIndex] = key.split(':').map(Number)
    const country = countries.find((item) => item.iso3 === countryCode)
    if (!country) {
      setErrors((current) => ({ ...current, [key]: 'Choose a country name from the suggestions.' }))
      return
    }
    const row = preset.rows[rowIndex]
    const column = preset.columns[columnIndex]
    if (!row || !column) return
    const rowMatches = row.matches(country)
    const columnMatches = column.matches(country)
    const duplicate = Object.values(answers).some((answer) => answer.iso3 === country.iso3)
    setCriteriaResult({ key, code: country.iso3, rowMatches, columnMatches, duplicate })
    if (duplicate) {
      setErrors((current) => ({ ...current, [key]: `${country.name} is already in another square.` }))
      return
    }
    if (!rowMatches || !columnMatches) {
      setErrors((current) => ({ ...current, [key]: `${country.name} doesn’t meet both clues.` }))
      return
    }
    const points = gridAnswerScore(gridCandidates(countries, row, column).length)
    const nextAnswers = { ...answers, [key]: country }
    const nextScore = score + points
    setAnswers(nextAnswers)
    setScore(nextScore)
    setErrors((current) => ({ ...current, [key]: '' }))
    setCriteriaResult(null)
    setInputs((current) => ({ ...current, [key]: '' }))
    const nextKey = preset.rows.flatMap((_, row) => preset.columns.map((__, column) => `${row}:${column}`))
      .find((candidate) => candidate !== key && !nextAnswers[candidate])
    if (nextKey) setActiveKey(nextKey)
    if (Object.keys(nextAnswers).length === 9) {
      setFinished(true)
      await save(nextScore, 9, 9, { preset: preset.id, answers: Object.fromEntries(Object.entries(nextAnswers).map(([cell, answer]) => [cell, answer.iso3])) })
    }
  }

  function submitText(key: string) {
    const text = inputs[key] ?? ''
    const match = countrySuggestions.find((item) => [item.label, ...(item.aliases ?? [])].some((alias) => alias.toLocaleLowerCase() === text.trim().toLocaleLowerCase()))
    if (match) void submitCell(key, match.value)
    else setErrors((current) => ({ ...current, [key]: 'Choose an exact country name from the suggestions.' }))
  }

  return (
    <div className="game-body grid-game-body">
      <div className="question-toolbar">
        <div><span className="eyebrow">{mode === 'daily' ? 'Today’s 3 × 3' : 'A fresh set of crossings'}</span><h2>{preset.title}</h2><p>Fill all nine crossings with different countries that fit both clues.</p></div>
        <div className="question-toolbar-tools">
          {mode === 'freeplay' && <GameSettingsMenu><div className="practice-config">
            <GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => onEligibility(value as GeographyEligibility)} />
            <span className="practice-config-note">Each board has nine distinct answers. Replay cycles to a fresh set.</span>
          </div></GameSettingsMenu>}
          <div className="question-count" role="status" aria-live="polite" aria-atomic="true"><strong aria-hidden="true">{filled}</strong><span aria-hidden="true">of 9</span><span className="sr-only">{filled} of 9 squares filled</span></div>
        </div>
      </div>
      <div ref={gridRef} className="geo-grid" role="table" aria-label="Geography category intersection table">
        <div className="grid-header" role="row">
          <div className="grid-corner" role="columnheader"><Grid3X3 size={17} aria-hidden="true" /><span>Find the match</span></div>
          {preset.columns.map((column, columnIndex) => <div className={`grid-column-label${activeColumn === columnIndex ? ' is-active' : ''}`} role="columnheader" key={column.id}>{column.label}</div>)}
        </div>
        {preset.rows.map((row, rowIndex) => <div className="grid-row" role="row" key={row.id}>
          <div className={`grid-row-label${activeRow === rowIndex ? ' is-active' : ''}`} role="rowheader">{row.label}</div>
          {preset.columns.map((column, columnIndex) => {
            const key = `${rowIndex}:${columnIndex}`
            const answer = answers[key]
            const candidates = gridCandidates(countries, row, column)
            return <div className={`grid-cell${answer ? ' is-filled' : ''}${activeKey === key && !answer ? ' is-current' : ''}${errors[key] ? ' has-error' : ''}`} role="cell" data-cell-key={key} key={key}>
              {answer ? <div className="grid-answer"><Check size={14} /><strong>{answer.name}</strong><small>{gridAnswerScore(candidates.length)} pts</small></div> : <button type="button" className="grid-cell-trigger" aria-label={`Answer for ${row.label} and ${column.label}${activeKey === key ? ', selected' : ''}`} aria-pressed={activeKey === key} aria-haspopup="dialog" onClick={() => { setCriteriaResult(null); setActiveKey(key) }}><Plus size={17} aria-hidden="true" /><span>Add place</span></button>}
              {errors[key] && <span className="grid-cell-error-mark" aria-label="Last answer did not fit">!</span>}
            </div>
          })}
        </div>)}
      </div>
      {!finished && activeKey && (() => {
        const [rowIndex, columnIndex] = activeKey.split(':').map(Number)
        const row = preset.rows[rowIndex]
        const column = preset.columns[columnIndex]
        if (!row || !column || answers[activeKey]) return null
        const candidates = gridCandidates(countries, row, column)
        const result = criteriaResult?.key === activeKey ? criteriaResult : null
        return <div className="grid-entry-panel" role="dialog" aria-label={`Answer for ${row.label} and ${column.label}`} style={popoverPosition ? { top: popoverPosition.top, left: popoverPosition.left, width: popoverPosition.width } : undefined}>
          <div className="grid-entry-heading"><div className="grid-entry-prompt"><span className="eyebrow">Your pick</span><strong>{row.label}<b>×</b>{column.label}</strong><small>{candidates.length} possible answers</small></div><button type="button" className="grid-entry-close" onClick={() => { setPopoverPosition(null); setActiveKey(null) }} aria-label="Close answer input"><X size={17} /></button></div>
          <AutocompleteInput
            id="grid-answer-input"
            label={`Country for ${row.label} and ${column.label}`}
            placeholder="Type a country"
            value={inputs[activeKey] ?? ''}
            onChange={(value) => { setInputs((current) => ({ ...current, [activeKey]: value })); setErrors((current) => ({ ...current, [activeKey]: '' })); setCriteriaResult(null) }}
            suggestions={countrySuggestions}
            onPick={(suggestion) => { setInputs((current) => ({ ...current, [activeKey]: suggestion.label })); void submitCell(activeKey, suggestion.value) }}
            onSubmit={() => submitText(activeKey)}
            submitLabel="Add"
            autoFocus
          />
          {result && <div className="grid-criteria-feedback" aria-label="Criteria feedback">
            <span className={result.rowMatches ? 'is-met' : 'is-missed'}>{result.rowMatches ? <Check size={14} /> : <X size={14} />}<span>{row.label}</span><small>{result.rowMatches ? 'Fits' : 'Does not fit'}</small></span>
            <span className={result.columnMatches ? 'is-met' : 'is-missed'}>{result.columnMatches ? <Check size={14} /> : <X size={14} />}<span>{column.label}</span><small>{result.columnMatches ? 'Fits' : 'Does not fit'}</small></span>
            {result.duplicate && <span className="is-missed"><X size={14} /><span>Distinct answer</span><small>Already used</small></span>}
          </div>}
          {errors[activeKey] && <div className="grid-cell-error" role="alert">{errors[activeKey]}</div>}
        </div>
      })()}
      <div className="grid-scoring-note"><CircleHelp size={15} /><span>9 unique answers · rarer crossings score more · <strong>{score.toLocaleString()}</strong> points</span></div>
      <details className="grid-source-note"><summary>How clues are defined</summary><p>Population uses 2023 country observations; area and listed land neighbors come from the country catalog. Southern Europe follows UN M49. EU membership reflects the 27 member states listed on 18 November 2026.</p><a href="https://unstats.un.org/unsd/methodology/m49/overview" target="_blank" rel="noreferrer">UN M49 classification</a><a href="https://european-union.europa.eu/principles-countries-history/eu-countries_en" target="_blank" rel="noreferrer">EU member countries</a></details>
      <GameResultsDialog complete={finished} gameId="grid" mode={mode} score={score} correct={filled} total={9} title="Every crossing has a place." message="All nine squares filled with distinct countries." saveError={saveError} onReplay={mode === 'freeplay' ? onReplay : undefined} />
    </div>
  )
}
