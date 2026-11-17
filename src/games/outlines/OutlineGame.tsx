import { useMemo, useState } from 'react'
import { Check, CircleHelp } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice } from '../../components/Kit'
import type { Country, GeographyData, GameMode } from '../../geography/types'
import { resolveCountryAnswer, greatCircleKm, directionFromTo, seededShuffle } from '../../puzzles/engine'
import { useGameSession } from '../session'

export function OutlineGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [scope, setScope] = useState('World')
  const [round, setRound] = useState(0)
  const continents = useMemo(() => [...new Set(data.countries.filter((country) => country.hasGeometry && country.continent).map((country) => country.continent as string))].sort(), [data.countries])
  const choices = useMemo(() => mode === 'daily' ? ['World'] : ['World', ...continents], [continents, mode])
  const countryPool = useMemo(() => data.countries.filter((country) => country.hasGeometry && country.coordinates && (scope === 'World' || country.continent === scope)), [data.countries, scope])
  const target = seededShuffle(countryPool, `${seed}:outline:${scope}:${round}`)[0]
  if (!target) return <InlineNotice title="No outlines found" tone="warning">There are no country shapes available in this scope.</InlineNotice>
  return <OutlineRound key={`${scope}:${round}`} data={data} target={target} mode={mode} date={date} seed={`${seed}:${scope}:${round}`} onNext={() => setRound((value) => value + 1)} onScopeChange={setScope} scope={scope} choices={choices} />
}

function OutlineRound({ data, target, mode, date, seed, onNext, scope, choices, onScopeChange }: {
  data: GeographyData
  target: Country
  mode: GameMode
  date: string
  seed: string
  onNext: () => void
  scope: string
  choices: string[]
  onScopeChange: (scope: string) => void
}) {
  const [input, setInput] = useState('')
  const [attempts, setAttempts] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [finished, setFinished] = useState(false)
  const [solved, setSolved] = useState(false)
  const [score, setScore] = useState(0)
  const { save, saveError } = useGameSession('outlines', mode, date, seed)
  const features = data.featuresByCode.get(target.iso3) ?? []
  const suggestions: Suggestion[] = useMemo(() => data.countries
    .filter((country) => country.hasGeometry && (scope === 'World' || country.continent === scope))
    .map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [data.countries, scope])

  async function guess() {
    if (finished) return
    const country = resolveCountryAnswer(input, data.countries)
    if (!country || !suggestions.some((item) => item.value === country.iso3)) {
      setMessage('Choose a country name from the suggestions.')
      return
    }
    if (attempts.includes(country.iso3)) {
      setMessage(`You already tried ${country.name}.`)
      return
    }
    const nextAttempts = [...attempts, country.iso3]
    setAttempts(nextAttempts)
    setInput('')
    if (country.iso3 === target.iso3) {
      const points = Math.max(100, 1000 - (nextAttempts.length - 1) * 150)
      setSolved(true)
      setFinished(true)
      setScore(points)
      setMessage(`That’s ${target.name}. You found it in ${nextAttempts.length} ${nextAttempts.length === 1 ? 'guess' : 'guesses'}.`)
      await save(points, 1, 1, { country: target.iso3, attempts: nextAttempts.length })
      return
    }
    if (nextAttempts.length >= 6) {
      setFinished(true)
      setSolved(false)
      setMessage(`The outline was ${target.name}.`)
      await save(0, 0, 1, { country: target.iso3, attempts: nextAttempts.length })
      return
    }
    const from = country.coordinates
    const to = target.coordinates
    const distance = from && to ? greatCircleKm(from, to) : null
    const direction = from && to ? directionFromTo(from, to) : null
    setMessage(`${country.name} is ${direction ? `${direction} of the answer` : 'not the answer'}${distance !== null ? ` · about ${Math.round(distance).toLocaleString()} km away` : ''}.`)
  }

  return (
    <div className="game-body outline-game-body">
      {mode === 'practice' && <div className="practice-config"><label><span>Practice scope</span><select value={scope} onChange={(event) => onScopeChange(event.target.value)}>{choices.map((item) => <option key={item}>{item}</option>)}</select></label><span className="practice-config-note">Each outline gives six guesses.</span></div>}
      <div className="outline-prompt"><div><span className="eyebrow">Six guesses</span><h2>Which country is this?</h2><p>Look at the borders, not the fill. The silhouette is drawn from map data.</p></div><div className="attempt-meter" aria-label={`${attempts.length} of 6 guesses used`}>{Array.from({ length: 6 }, (_, index) => <span key={index} className={index < attempts.length ? (solved && index === attempts.length - 1 ? 'is-right' : 'is-used') : ''} />)}</div></div>
      <div className="outline-map-stage"><GeoMap features={features} ariaLabel="Unlabelled country silhouette" showHoverLabels={false} /></div>
      {!finished && <AutocompleteInput
        id="outline-answer"
        label="Name the country shown"
        placeholder="Type a country name"
        value={input}
        onChange={(value) => { setInput(value); setMessage('') }}
        suggestions={suggestions}
        onPick={(suggestion) => { setInput(suggestion.label) }}
        onSubmit={() => void guess()}
        submitLabel="Guess"
      />}
      {message && <div className={`answer-feedback${solved ? ' is-correct' : finished ? ' is-incorrect' : ''}`} role="status"><span className="feedback-icon">{solved ? <Check size={17} /> : <CircleHelp size={16} />}</span><span>{message}</span></div>}
      {finished && <div className="result-panel outline-result"><span className="eyebrow">{solved ? 'Outline solved' : 'Answer revealed'}</span><h2>{target.name}</h2><p>{attempts.length} of 6 guesses used</p><div className="result-score">{score.toLocaleString()}<small>points</small></div><div className="result-actions">{mode === 'daily' ? <a className="button button-dark" href="/games/outlines?mode=practice">Try another outline</a> : <button className="button button-dark" type="button" onClick={onNext}>Try another outline</button>}<a className="button button-outline" href="/statistics">See statistics</a></div>{saveError && <div className="form-message form-message-error" role="alert">{saveError}</div>}</div>}
      {attempts.length > 0 && !finished && <div className="guess-list" aria-label="Previous guesses">{attempts.map((code) => <span key={code}>{data.countriesByCode.get(code)?.name}</span>)}</div>}
      {mode === 'daily' && <p className="map-source-note">Daily country silhouette · {date}</p>}
    </div>
  )
}
