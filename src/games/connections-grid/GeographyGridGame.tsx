import { useEffect, useMemo, useState } from 'react'
import { Check, CircleHelp, Grid3X3, Plus } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice } from '../../components/Kit'
import type { GeographyData, GameMode, Country } from '../../geography/types'
import { gridAnswerScore, gridCandidates, seededShuffle, validGridPresets, type GridPreset } from '../../puzzles/engine'
import { useGameSession } from '../session'
import { useAppData } from '../../app/useAppData'
import { eligibleCountries, type GeographyEligibility } from '../../geography/eligibility'

export function GeographyGridGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [eligibility, setEligibility] = useState<GeographyEligibility>('standard')
  const eligible = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const presets = useMemo(() => validGridPresets(eligible), [eligible])
  const daily = seededShuffle(presets, `${seed}:preset`)[0]
  const savedPreset = mode === 'daily' ? state.sessions.find((session) => session.gameId === 'grid' && session.mode === 'daily' && session.date === date)?.payload.preset : undefined
  const [presetId, setPresetId] = useState(typeof savedPreset === 'string' ? savedPreset : daily?.id ?? presets[0]?.id ?? '')
  const [round, setRound] = useState(0)
  if (!presets.length) return <InlineNotice title="A validated grid is unavailable" tone="warning">The current country facts do not fill every square for these grid sets.</InlineNotice>
  const preset = presets.find((item) => item.id === presetId) ?? daily ?? presets[0]
  const roundSeed = mode === 'daily' ? `${seed}:${preset.id}` : `${seed}:${preset.id}:${round}:${eligibility}`
  return <GridRound key={`${preset.id}:${roundSeed}`} countries={eligible} mode={mode} date={date} seed={roundSeed} preset={preset} presets={presets} eligibility={eligibility} onEligibility={setEligibility} onPreset={setPresetId} onReplay={() => {
    const current = presets.findIndex((item) => item.id === preset.id)
    setPresetId(presets[(current + 1) % presets.length]!.id)
    setRound((value) => value + 1)
  }} />
}

function GridRound({ countries, mode, date, seed, preset, presets, eligibility, onEligibility, onPreset, onReplay }: {
  countries: Country[]
  mode: GameMode
  date: string
  seed: string
  preset: GridPreset
  presets: GridPreset[]
  eligibility: GeographyEligibility
  onEligibility: (value: GeographyEligibility) => void
  onPreset: (id: string) => void
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
  const [activeKey, setActiveKey] = useState(() => typeof progress?.activeKey === 'string' ? progress.activeKey : '0:0')
  const [score, setScore] = useState(() => typeof progress?.score === 'number' ? progress.score : 0)
  const [finished, setFinished] = useState(() => progress?.finished === true)
  const { save, saveError, saveProgress } = session
  const countrySuggestions: Suggestion[] = useMemo(() => countries.map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [countries])
  const filled = Object.keys(answers).length
  const [activeRow, activeColumn] = activeKey.split(':').map(Number)

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
    if (Object.values(answers).some((answer) => answer.iso3 === country.iso3)) {
      setErrors((current) => ({ ...current, [key]: `${country.name} is already in another square.` }))
      return
    }
    const row = preset.rows[rowIndex]
    const column = preset.columns[columnIndex]
    if (!row.matches(country) || !column.matches(country)) {
      setErrors((current) => ({ ...current, [key]: `${country.name} doesn’t meet both clues.` }))
      return
    }
    const points = gridAnswerScore(gridCandidates(countries, row, column).length)
    const nextAnswers = { ...answers, [key]: country }
    const nextScore = score + points
    setAnswers(nextAnswers)
    setScore(nextScore)
    setErrors((current) => ({ ...current, [key]: '' }))
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
        <div><span className="eyebrow">{mode === 'daily' ? 'Today’s 3 × 3' : 'A fresh set of crossings'}</span><h2>{preset.title}</h2><p>Find one country for every row-and-column crossing.</p></div>
        <div className="question-toolbar-tools">
          {mode === 'practice' && <GameSettingsMenu><div className="practice-config">
            <label><span>Country pool</span><select value={eligibility} onChange={(event) => onEligibility(event.target.value as GeographyEligibility)}><option value="standard">Standard · 195 states</option><option value="extended">Extended · territories included</option></select></label>
            <label><span>Grid set</span><select value={preset.id} onChange={(event) => onPreset(event.target.value)}>{presets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <span className="practice-config-note">Each distinct board has nine valid, unique answers. Replay cycles to a fresh set.</span>
          </div></GameSettingsMenu>}
          <div className="question-count"><strong>{filled}</strong><span>of 9</span></div>
        </div>
      </div>
      <div className="geo-grid" role="grid" aria-label="Geography category intersection grid">
        <div className="grid-corner" role="columnheader"><Grid3X3 size={17} aria-hidden="true" /><span>Find the match</span></div>
        {preset.columns.map((column, columnIndex) => <div className={`grid-column-label${activeColumn === columnIndex ? ' is-active' : ''}`} role="columnheader" key={column.id}>{column.label}</div>)}
        {preset.rows.map((row, rowIndex) => <div className="grid-row" role="row" key={row.id}>
          <div className={`grid-row-label${activeRow === rowIndex ? ' is-active' : ''}`} role="rowheader">{row.label}</div>
          {preset.columns.map((column, columnIndex) => {
            const key = `${rowIndex}:${columnIndex}`
            const answer = answers[key]
            const candidates = gridCandidates(countries, row, column)
            return <div className={`grid-cell${answer ? ' is-filled' : ''}${activeKey === key && !answer ? ' is-current' : ''}`} role="gridcell" data-cell-key={key} key={key}>
              {answer ? <div className="grid-answer"><Check size={14} /><strong>{answer.name}</strong><small>{gridAnswerScore(candidates.length)} pts</small></div> : <button type="button" className="grid-cell-trigger" aria-label={`Answer for ${row.label} and ${column.label}${activeKey === key ? ', selected' : ''}`} aria-pressed={activeKey === key} onClick={() => setActiveKey(key)}><Plus size={17} aria-hidden="true" /><span>Add place</span></button>}
              {errors[key] && <div className="grid-cell-error" role="alert">{errors[key]}</div>}
            </div>
          })}
        </div>)}
      </div>
      {!finished && (() => {
        const [rowIndex, columnIndex] = activeKey.split(':').map(Number)
        const row = preset.rows[rowIndex]
        const column = preset.columns[columnIndex]
        if (!row || !column || answers[activeKey]) return null
        const candidates = gridCandidates(countries, row, column)
        return <div className="grid-entry-panel" aria-label="Selected square">
          <div className="grid-entry-prompt"><span className="eyebrow">Your pick</span><strong>{row.label}<b>×</b>{column.label}</strong><small>{candidates.length} possible countries · rarer answers score more</small></div>
          <AutocompleteInput
            id="grid-answer-input"
            label={`Country for ${row.label} and ${column.label}`}
            placeholder="Type a country"
            value={inputs[activeKey] ?? ''}
            onChange={(value) => { setInputs((current) => ({ ...current, [activeKey]: value })); setErrors((current) => ({ ...current, [activeKey]: '' })) }}
            suggestions={countrySuggestions}
            onPick={(suggestion) => { setInputs((current) => ({ ...current, [activeKey]: suggestion.label })); void submitCell(activeKey, suggestion.value) }}
            onSubmit={() => submitText(activeKey)}
            submitLabel="Add"
          />
          {errors[activeKey] && <div className="grid-cell-error" role="alert">{errors[activeKey]}</div>}
        </div>
      })()}
      <div className="grid-scoring-note"><CircleHelp size={15} /><span>Rarer, valid intersections score more; no popularity estimates are used. Current points: <strong>{score.toLocaleString()}</strong></span></div>
      <GameResultsDialog complete={finished} gameId="grid" mode={mode} score={score} correct={filled} total={9} title="Every crossing has a place." message="All nine squares filled with distinct countries." saveError={saveError} onReplay={mode === 'practice' ? onReplay : undefined} />
    </div>
  )
}
