import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleHelp } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { RoundProgress } from '../../components/RoundProgress'
import { AdvancedGameSettings, GameSettingSelect, GameSettingToggle, GameSettingsMenu } from '../../components/GameControls'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice } from '../../components/Kit'
import type { GameMode, GeographyData } from '../../geography/types'
import { makeNeighbourQuestions, scoreNeighbourAnswer, type NeighbourDifficulty } from '../../puzzles/neighbours'
import { useGameSession } from '../session'
import { eligibleCountries, eligibleFeatures, initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'
import { normalizeAnswer } from '../../puzzles/engine'
import { useAppData } from '../../app/useAppData'

type CountOption = '5' | '10' | '20' | 'infinite'

export function NeighbourGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
  const countries = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const scopes = useMemo(() => [...new Set(countries.map((country) => country.continent).filter((value): value is string => Boolean(value)))].sort(), [countries])
  const [scope, setScope] = useState('World')
  const [difficulty, setDifficulty] = useState<NeighbourDifficulty>('all')
  const [count, setCount] = useState<CountOption>('5')
  const [timed, setTimed] = useState(false)
  const [round, setRound] = useState(0)
  return <NeighbourRound key={`${round}:${scope}:${difficulty}:${count}:${timed}:${eligibility}`} data={data} countries={countries} eligibility={eligibility} mode={mode} date={date} seed={`${seed}:${round}:${scope}:${difficulty}:${count}:${timed}:${eligibility}`} scope={scope} difficulty={difficulty} count={count} timed={timed} scopes={scopes} onEligibility={setEligibility} onScope={setScope} onDifficulty={setDifficulty} onCount={setCount} onTimed={setTimed} onReplay={() => setRound((value) => value + 1)} />
}

function NeighbourRound({ data, countries, eligibility, mode, date, seed, scope, difficulty, count, timed, scopes, onEligibility, onScope, onDifficulty, onCount, onTimed, onReplay }: {
  data: GeographyData
  countries: GeographyData['countries']
  eligibility: GeographyEligibility
  mode: GameMode
  date: string
  seed: string
  scope: string
  difficulty: NeighbourDifficulty
  count: CountOption
  timed: boolean
  scopes: string[]
  onEligibility: (value: GeographyEligibility) => void
  onScope: (value: string) => void
  onDifficulty: (value: NeighbourDifficulty) => void
  onCount: (value: CountOption) => void
  onTimed: (value: boolean) => void
  onReplay: () => void
}) {
  const totalQuestions = mode === 'daily' ? 5 : count === 'infinite' ? 40 : Number(count)
  const [cycle, setCycle] = useState(0)
  const [deck, setDeck] = useState(() => makeNeighbourQuestions(countries, `${seed}:targets:0`, totalQuestions, scope, difficulty))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [locked, setLocked] = useState(false)
  const [resolved, setResolved] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState('Select every country that shares a land border with the target.')
  const [selectionNotice, setSelectionNotice] = useState('')
  const [roundExact, setRoundExact] = useState(false)
  const [seconds, setSeconds] = useState(60)
  const [finished, setFinished] = useState(false)
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const advanceQuestion = useRef<() => void>(() => {})
  const focusQuestionOnAdvance = useRef(false)
  const question = deck[index]
  const { save, saveError } = useGameSession('neighbours', mode, date, seed)
  const infinite = mode === 'freeplay' && count === 'infinite'
  const suggestions: Suggestion[] = useMemo(() => countries
    .map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [countries])

  useLayoutEffect(() => {
    if (focusQuestionOnAdvance.current) {
      questionHeading.current?.focus()
      focusQuestionOnAdvance.current = false
    }
  }, [finished, index, locked])

  const finishRound = useCallback(async (finalScore = score, finalCorrect = correct, finalTotal = resolved) => {
    if (finished || finalTotal === 0) return
    setFinished(true)
    await save(finalScore, finalCorrect, finalTotal, { scope, difficulty, timed, perfectRounds: finalCorrect })
  }, [correct, difficulty, finished, resolved, save, scope, score, timed])

  useEffect(() => {
    if (!timed || finished) return
    const timer = window.setTimeout(() => {
      if (seconds <= 1) {
        setSeconds(0)
        void finishRound()
      } else setSeconds((value) => value - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [seconds, timed, finished, finishRound])

  function toggle(code: string) {
    if (locked || finished) return
    if (code === question.country.iso3) {
      setMessage(`${question.country.name} is the target, so it cannot be one of its own neighbours.`)
      setSelectionNotice(`${question.country.name} is the target, so it cannot be one of its own neighbours.`)
      return
    }
    if (!countries.some((country) => country.iso3 === code)) {
      setMessage('Choose a country from this country pool.')
      setSelectionNotice('Choose a country from this country pool.')
      return
    }
    if (selected.includes(code)) {
      const notice = `${data.countriesByCode.get(code)?.name ?? 'That country'} is already selected. Remove it from the selected list if you meant to undo it.`
      setMessage(notice)
      setSelectionNotice(notice)
      return
    }
    setSelectionNotice('')
    setMessage('Check your full set when you are ready; incorrect selections reduce the score.')
    setSelected((current) => current.includes(code) ? current : [...current, code])
  }

  function submitInput() {
    const normalized = normalizeAnswer(input)
    const match = suggestions.find((item) => [item.label, ...(item.aliases ?? [])].some((label) => normalizeAnswer(label) === normalized))
    if (!match) {
      setMessage('Choose a country from the suggestions.')
      setSelectionNotice('Choose a country from the suggestions.')
      return
    }
    toggle(match.value)
    setInput('')
  }

  function checkAnswer() {
    if (!question || locked || finished) return
    setSelectionNotice('')
    const result = scoreNeighbourAnswer(question.neighbourCodes, selected)
    const nextResolved = resolved + 1
    const nextCorrect = correct + Number(result.exact)
    const nextScore = score + result.points
    setResolved(nextResolved)
    setCorrect(nextCorrect)
    setScore(nextScore)
    setLocked(true)
    setRoundExact(result.exact)
    setMessage(result.exact
      ? `Complete. You found all ${question.neighbourCodes.length} land neighbours.`
      : `${result.matched} found · ${result.missed} missed · ${result.extra} incorrect.`)
  }

  async function nextQuestion() {
    if (index < deck.length - 1) {
      focusQuestionOnAdvance.current = true
      setIndex((value) => value + 1)
    }
    else if (infinite) {
      const nextCycle = cycle + 1
      setDeck(makeNeighbourQuestions(countries, `${seed}:targets:${nextCycle}`, 40, scope, difficulty))
      setCycle(nextCycle)
      setIndex(0)
      focusQuestionOnAdvance.current = true
    } else {
      await finishRound()
      return
    }
    setSelected([])
    setInput('')
    setLocked(false)
    setSelectionNotice('')
    setRoundExact(false)
    setMessage('Select every country that shares a land border with the target.')
  }

  useLayoutEffect(() => {
    advanceQuestion.current = () => { void nextQuestion() }
  })

  useEffect(() => {
    if (!locked || finished) return
    const timer = window.setTimeout(() => advanceQuestion.current(), 1_850)
    return () => window.clearTimeout(timer)
  }, [locked, finished, index])

  if (!question) return <div className="game-body"><InlineNotice title="No border challenges fit those settings" tone="warning"><span>Choose a wider region or switch to all border counts. The map only uses recorded land-border neighbors.</span>{mode === 'freeplay' && <div className="empty-game-actions"><button className="button button-outline" type="button" onClick={() => { onScope('World'); onDifficulty('all') }}>Use all recorded borders</button></div>}</InlineNotice></div>

  const settings = mode === 'freeplay' && !finished ? <GameSettingsMenu><div className="practice-config">
    <GameSettingSelect label="Target region" value={scope} control="select" options={['World', ...scopes].map((item) => ({ value: item, label: item }))} onChange={onScope} />
    <GameSettingSelect label="Border count" value={difficulty} options={[{ value: 'all', label: 'All countries' }, { value: 'dense', label: '5+ neighbors' }]} onChange={(value) => onDifficulty(value as NeighbourDifficulty)} />
    <GameSettingSelect label="Countries" value={count} options={[{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }, { value: 'infinite', label: 'Infinite' }]} onChange={(value) => onCount(value as CountOption)} />
    <GameSettingToggle label="60-second round" checked={timed} onChange={onTimed} />
    <AdvancedGameSettings><GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => onEligibility(value as GeographyEligibility)} /></AdvancedGameSettings>
  </div></GameSettingsMenu> : null
  const mapActive = locked ? question.neighbourCodes : selected
  const neighbourNames = question.neighbourCodes.map((code) => data.countriesByCode.get(code)?.name ?? code)
  const focusCodes = [question.country.iso3]

  return <div className="game-body neighbour-game-body">
    <div className="question-toolbar"><div><span className="eyebrow">Neighbour Challenge · {scope}</span><h2 ref={questionHeading} tabIndex={-1}>Complete the land borders</h2><p>Choose every country that shares a recorded land border with the target.</p></div><div className="question-toolbar-tools">{settings}{!infinite && <RoundProgress current={index + 1} total={deck.length} label="countries" />}{infinite && <span className="sr-only" role="status" aria-live="polite">Country {resolved + 1}</span>}</div></div>
    <div className="neighbour-target"><span className="eyebrow">Target country</span><strong>{question.country.name}</strong><span>{question.neighbourCodes.length} neighbours to find</span></div>
    <div className="neighbour-live"><span aria-live="polite"><strong>{score.toLocaleString()}</strong> points</span><span aria-live="polite">{correct} perfect rounds</span>{timed ? <span role="timer" aria-label={`Time remaining: ${seconds} seconds`}>{seconds}s left</span> : <span role="status" aria-live="polite" aria-atomic="true">{selected.length} selected</span>}{infinite && resolved > 0 && !finished && <button className="button button-outline" type="button" disabled={locked} onClick={() => void finishRound()}>End session</button>}</div>
    <div className="neighbour-map"><GeoMap features={eligibleFeatures(data.features, eligibility)} activeCodes={mapActive} focusCodes={focusCodes} focusPadding={82} hideFeatureNames showHoverLabels={false} onSelectCode={toggle} ariaLabel="Unlabelled map. Use the country search to identify a country without revealing map labels." /></div>
    {!locked && <div className="neighbour-answer-dock">
      <AutocompleteInput id="neighbour-answer" label="Add a country" placeholder="Type a country name" value={input} onChange={(value) => { setInput(value); setMessage(''); setSelectionNotice('') }} suggestions={suggestions} onPick={(item) => { toggle(item.value); setInput('') }} onSubmit={submitInput} submitLabel="Add" />
      <button className="button button-dark" type="button" disabled={selected.length === 0} onClick={() => void checkAnswer()}><Check size={15} /> Check neighbors</button>
    </div>}
    {selected.length > 0 && !locked && <div className="neighbour-selected" aria-label="Selected neighbors">{selected.map((code) => <button type="button" key={code} aria-label={`Remove ${data.countriesByCode.get(code)?.name ?? code}`} onClick={() => { setSelected((current) => current.filter((item) => item !== code)); setSelectionNotice(''); setMessage('Check your full set when you are ready; incorrect selections reduce the score.') }}>{data.countriesByCode.get(code)?.name} ×</button>)}</div>}
    {selectionNotice && !locked && <div className="form-message form-message-error neighbour-selection-feedback" role="status" aria-live="polite">{selectionNotice}</div>}
    {locked && <div className={`answer-feedback${roundExact ? ' is-correct' : ' is-incorrect'}`} role="status"><span className="feedback-icon"><Check size={17} /></span><span>{message}<small className="neighbour-reveal-list">Answer: {neighbourNames.join(', ')}.</small></span></div>}
    <p className="map-source-note"><CircleHelp size={14} /> Border answers follow reciprocal country-catalog land neighbors; maritime boundaries and disputed claims are not included.</p>
    <GameResultsDialog complete={finished} gameId="neighbours" mode={mode} score={score} correct={correct} total={resolved} title={timed && seconds === 0 ? 'Time is up.' : 'Border round complete.'} message={`${correct} perfect rounds across ${resolved} countries.`} saveError={saveError} onReplay={mode === 'freeplay' ? onReplay : undefined} replayLabel="Find more neighbours" />
  </div>
}
