import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Check, MapPin } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { RoundProgress } from '../../components/RoundProgress'
import { AdvancedGameSettings, GameSettingSelect, GameSettingToggle, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadMajorCities } from '../../geography/data'
import { isCurrentWholeSettlement } from '../../geography/cityRecords'
import { formatCoordinates } from '../../geography/coordinates'
import type { City, Country, GameMode, GeographyData } from '../../geography/types'
import { hashSeed } from '../../puzzles/engine'
import { distancePrompt, makeDistanceQuestions, type DistanceDifficulty, type DistanceMeasure } from '../../puzzles/distance'
import { useGameSession } from '../session'
import { eligibleCountries, initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'
import { useAppData } from '../../app/useAppData'

type CountOption = '10' | '20' | '50' | 'infinite'

function getDistanceScopes(cities: City[] | null, countries: Country[], minimumPopulation: number): string[] {
  if (!cities) return []
  const eligibleCountryCodes = new Set(countries.map((country) => country.iso3))
  const countryByCode = new Map(countries.map((country) => [country.iso3, country]))
  const continentCounts = new Map<string, number>()
  for (const city of cities) {
    if (city.population < minimumPopulation || !isCurrentWholeSettlement(city) || !eligibleCountryCodes.has(city.countryIso3)) continue
    const continent = countryByCode.get(city.countryIso3)?.continent
    if (continent) continentCounts.set(continent, (continentCounts.get(continent) ?? 0) + 1)
  }
  return [...continentCounts].filter(([, cityCount]) => cityCount >= 3).map(([continent]) => continent).sort()
}

export function DistanceGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [cities, setCities] = useState<City[] | null>(null)
  const [error, setError] = useState('')
  const [measure, setMeasure] = useState<DistanceMeasure>('distance')
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
  const [scope, setScope] = useState('World')
  const [minimumPopulation, setMinimumPopulation] = useState(50_000)
  const [difficulty, setDifficulty] = useState<DistanceDifficulty>('standard')
  const [count, setCount] = useState<CountOption>('10')
  const [timed, setTimed] = useState(false)
  const [round, setRound] = useState(0)
  useEffect(() => {
    let active = true
    loadMajorCities().then((loaded) => { if (active) setCities(loaded.cities) }).catch((issue) => {
      if (active) setError(issue instanceof Error ? issue.message : 'The city gazetteer could not open.')
    })
    return () => { active = false }
  }, [])
  const countries = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const scopes = useMemo(() => getDistanceScopes(cities, countries, minimumPopulation), [cities, countries, minimumPopulation])
  const activeScope = scope === 'World' || scopes.includes(scope) ? scope : 'World'
  const changeMinimumPopulation = (value: number) => {
    setMinimumPopulation(value)
    if (scope !== 'World' && !getDistanceScopes(cities, countries, value).includes(scope)) setScope('World')
  }
  const changeEligibility = (value: GeographyEligibility) => {
    const nextCountries = eligibleCountries(data.countries, value)
    setEligibility(value)
    if (scope !== 'World' && !getDistanceScopes(cities, nextCountries, minimumPopulation).includes(scope)) setScope('World')
  }
  const dailyMeasure: DistanceMeasure = (['distance', 'latitude', 'longitude'] as const)[hashSeed(seed) % 3] ?? 'distance'
  if (error) return <div className="game-body"><InlineNotice title="The city gazetteer could not open" tone="warning">{error}</InlineNotice></div>
  if (!cities) return <LoadingState label="Opening city coordinates…" />
  return <DistanceRound key={`${round}:${measure}:${activeScope}:${minimumPopulation}:${difficulty}:${count}:${timed}:${eligibility}`} data={data} cities={cities} countries={countries} mode={mode} date={date} seed={`${seed}:${round}:${measure}:${activeScope}:${minimumPopulation}:${difficulty}:${count}:${timed}:${eligibility}`} measure={mode === 'daily' ? dailyMeasure : measure} scope={activeScope} eligibility={eligibility} minimumPopulation={minimumPopulation} difficulty={difficulty} count={count} timed={timed} scopes={scopes} onMeasure={setMeasure} onScope={setScope} onEligibility={changeEligibility} onPopulation={changeMinimumPopulation} onDifficulty={setDifficulty} onCount={setCount} onTimed={setTimed} onReplay={() => setRound((value) => value + 1)} />
}

function DistanceRound({ data, cities, countries, mode, date, seed, measure, scope, eligibility, minimumPopulation, difficulty, count, timed, scopes, onMeasure, onScope, onEligibility, onPopulation, onDifficulty, onCount, onTimed, onReplay }: {
  data: GeographyData
  cities: City[]
  countries: GeographyData['countries']
  mode: GameMode
  date: string
  seed: string
  measure: DistanceMeasure
  scope: string
  eligibility: GeographyEligibility
  minimumPopulation: number
  difficulty: DistanceDifficulty
  count: CountOption
  timed: boolean
  scopes: string[]
  onMeasure: (value: DistanceMeasure) => void
  onScope: (value: string) => void
  onEligibility: (value: GeographyEligibility) => void
  onPopulation: (value: number) => void
  onDifficulty: (value: DistanceDifficulty) => void
  onCount: (value: CountOption) => void
  onTimed: (value: boolean) => void
  onReplay: () => void
}) {
  const totalQuestions = mode === 'daily' ? 10 : count === 'infinite' ? 40 : Number(count)
  const eligibleCodes = useMemo(() => new Set(countries.map((country) => country.iso3)), [countries])
  const eligibleCities = useMemo(() => cities.filter((city) => (mode === 'daily' || isCurrentWholeSettlement(city)) && eligibleCodes.has(city.countryIso3)), [cities, eligibleCodes, mode])
  const [cycle, setCycle] = useState(0)
  const [deck, setDeck] = useState(() => makeDistanceQuestions(eligibleCities, new Map(countries.map((country) => [country.iso3, country])), `${seed}:deck:0`, totalQuestions, { scope, measure, minimumPopulation, difficulty }))
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState<'left' | 'right' | ''>('')
  const [resolved, setResolved] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [message, setMessage] = useState('')
  const [seconds, setSeconds] = useState(60)
  const [finished, setFinished] = useState(false)
  const choices = useRef<HTMLDivElement>(null)
  const advanceQuestion = useRef<() => void>(() => {})
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const focusQuestionOnAdvance = useRef(false)
  const previousChoice = useRef<'left' | 'right' | ''>('')
  const infinite = mode === 'freeplay' && count === 'infinite'
  const question = deck[index]
  const { save, saveError } = useGameSession('distance', mode, date, seed)

  useLayoutEffect(() => {
    if (!choice && focusQuestionOnAdvance.current) {
      focusQuestionOnAdvance.current = false
      questionHeading.current?.focus({ preventScroll: true })
    } else if (!choice && previousChoice.current) choices.current?.querySelector<HTMLButtonElement>('.distance-city-choice')?.focus({ preventScroll: true })
    previousChoice.current = choice
  }, [choice, finished, index])

  const finishRound = useCallback(async (finalScore = score, finalCorrect = correct, finalTotal = resolved) => {
    if (finished || finalTotal === 0) return
    setFinished(true)
    await save(finalScore, finalCorrect, finalTotal, { measure, scope, minimumPopulation, difficulty, bestStreak })
  }, [bestStreak, correct, difficulty, finished, measure, minimumPopulation, resolved, save, scope, score])

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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (finished || choice || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowLeft' || event.key === '1') answer('left')
      if (event.key === 'ArrowRight' || event.key === '2') answer('right')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function answer(side: 'left' | 'right') {
    if (!question || choice || finished) return
    const isCorrect = question.answer === side
    const nextStreak = isCorrect ? streak + 1 : 0
    const earned = isCorrect ? 100 + Math.min(50, streak * 10) : 0
    const nextScore = score + earned
    const nextCorrect = correct + Number(isCorrect)
    const nextResolved = resolved + 1
    setChoice(side)
    setScore(nextScore)
    setCorrect(nextCorrect)
    setResolved(nextResolved)
    setStreak(nextStreak)
    setBestStreak((value) => Math.max(value, nextStreak))
    const answerCity = question.answer === 'left' ? question.left : question.right
    setMessage(isCorrect ? `Correct · ${earned} points${nextStreak > 1 ? ` · ${nextStreak} in a row` : ''}.` : `${answerCity.name}, ${data.countriesByCode.get(answerCity.countryIso3)?.name ?? ''} is the correct choice.`)
  }

  async function nextQuestion() {
    if (index < deck.length - 1) setIndex((value) => value + 1)
    else if (infinite) {
      const nextCycle = cycle + 1
      setDeck(makeDistanceQuestions(eligibleCities, new Map(countries.map((country) => [country.iso3, country])), `${seed}:deck:${nextCycle}`, 40, { scope, measure, minimumPopulation, difficulty }))
      setCycle(nextCycle)
      setIndex(0)
    } else {
      await finishRound()
      return
    }
    focusQuestionOnAdvance.current = true
    setChoice('')
    setMessage('')
  }

  useLayoutEffect(() => {
    advanceQuestion.current = () => { void nextQuestion() }
  })

  useEffect(() => {
    if (!choice || finished) return
    const timer = window.setTimeout(() => advanceQuestion.current(), 1_850)
    return () => window.clearTimeout(timer)
  }, [choice, finished, index])

  if (!question) return <div className="game-body"><InlineNotice title="No city comparisons fit those settings" tone="warning"><span>Choose a wider region, a lower population threshold or standard difficulty. Distances use the bundled GeoNames city coordinates.</span>{mode === 'freeplay' && <div className="empty-game-actions"><button className="button button-outline" type="button" onClick={() => { onScope('World'); onPopulation(50_000); onDifficulty('standard') }}>Use standard world comparisons</button></div>}</InlineNotice></div>

  const settings = mode === 'freeplay' && !finished ? <GameSettingsMenu><div className="practice-config">
    <GameSettingSelect label="Challenge" value={measure} options={[{ value: 'distance', label: 'Closest' }, { value: 'latitude', label: 'Farther north' }, { value: 'longitude', label: 'Farther east' }]} onChange={(value) => onMeasure(value as DistanceMeasure)} />
    <GameSettingSelect label="Difficulty" value={difficulty} options={[{ value: 'standard', label: 'Standard' }, { value: 'close', label: 'Close calls' }]} onChange={(value) => onDifficulty(value as DistanceDifficulty)} />
    <GameSettingSelect label="Questions" value={count} options={[{ value: '10', label: '10' }, { value: '20', label: '20' }, { value: '50', label: '50' }, { value: 'infinite', label: 'Infinite' }]} onChange={(value) => onCount(value as CountOption)} />
    <AdvancedGameSettings>
      <GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => onEligibility(value as GeographyEligibility)} />
      <GameSettingSelect label="City region" value={scope} control="select" options={['World', ...scopes].map((item) => ({ value: item, label: item }))} onChange={onScope} />
      <GameSettingSelect label="Minimum population" value={minimumPopulation} options={[{ value: '50000', label: '50,000' }, { value: '100000', label: '100,000' }, { value: '250000', label: '250,000' }, { value: '1000000', label: '1 million' }]} onChange={(value) => onPopulation(Number(value))} />
      <GameSettingToggle label="60-second round" checked={timed} onChange={onTimed} />
    </AdvancedGameSettings>
  </div></GameSettingsMenu> : null
  const prompt = distancePrompt(measure, question.origin.name)
  const selectedCity = choice === 'left' ? question.left : choice === 'right' ? question.right : null
  const revealed = Boolean(choice)

  return <div className="game-body distance-game-body">
    {!infinite && deck.length < totalQuestions && <InlineNotice title={`Only ${deck.length} of ${totalQuestions} comparisons fit these settings`} tone="warning"><span>Each comparison remains distinct. Try a wider region, lower population minimum or Standard difficulty for a longer round.</span></InlineNotice>}
    <div className="question-toolbar"><div><h2 ref={questionHeading} className="distance-prompt" tabIndex={-1}>{prompt}</h2></div><div className="question-toolbar-tools">{settings}{!infinite && <RoundProgress current={index + 1} total={deck.length} label="comparisons" />}{infinite && <span className="sr-only" role="status" aria-live="polite">Comparison {resolved + 1}</span>}</div></div>
    <div className="distance-origin"><span><MapPin size={16} /> Starting point</span><strong>{question.origin.name}</strong>{revealed && <><small>{data.countriesByCode.get(question.origin.countryIso3)?.name}</small><code>{formatCoordinates(question.origin, 2)}</code></>}</div>
    <div className="distance-live"><span aria-live="polite"><strong>{score.toLocaleString()}</strong> points</span><span aria-live="polite">{streak} streak <small>best {bestStreak}</small></span>{timed ? <span role="timer" aria-label={`Time remaining: ${seconds} seconds`}>{seconds}s left</span> : <span role="status" aria-live="polite" aria-atomic="true">{correct} correct</span>}{infinite && resolved > 0 && !finished && <button className="button button-outline" type="button" onClick={() => void finishRound()}>End session</button>}</div>
    <div ref={choices} className="distance-choices" role="group" aria-label="Choose the city that fits the clue">
      <CityChoice city={question.left} side="left" countryName={data.countriesByCode.get(question.left.countryIso3)?.name ?? ''} distance={question.leftDistanceKm} direction={question.leftDirection} revealed={revealed} selected={selectedCity?.id === question.left.id} correct={question.answer === 'left'} disabled={revealed || finished} onChoose={answer} />
      <div className="distance-versus"><ArrowLeftRight size={22} /><span>OR</span></div>
      <CityChoice city={question.right} side="right" countryName={data.countriesByCode.get(question.right.countryIso3)?.name ?? ''} distance={question.rightDistanceKm} direction={question.rightDirection} revealed={revealed} selected={selectedCity?.id === question.right.id} correct={question.answer === 'right'} disabled={revealed || finished} onChoose={answer} />
    </div>
    {revealed && <div className={`answer-feedback${choice === question.answer ? ' is-correct' : ' is-incorrect'}`} role="status"><span className="feedback-icon"><Check size={17} /></span><span>{message}<small className="distance-reveal">{question.left.name}: {Math.round(question.leftDistanceKm).toLocaleString()} km {question.leftDirection} · {question.right.name}: {Math.round(question.rightDistanceKm).toLocaleString()} km {question.rightDirection}</small></span></div>}
    <GameResultsDialog complete={finished} gameId="distance" mode={mode} score={score} correct={correct} total={resolved} title={timed && seconds === 0 ? 'Time is up.' : 'City comparison complete.'} message={`Best streak: ${bestStreak}. Great-circle distances use the Haversine calculation.`} saveError={saveError} onReplay={mode === 'freeplay' ? onReplay : undefined} replayLabel="Compare more cities" />
  </div>
}

function CityChoice({ city, side, countryName, distance, direction, revealed, selected, correct, disabled, onChoose }: {
  city: City
  side: 'left' | 'right'
  countryName: string
  distance: number
  direction: string
  revealed: boolean
  selected: boolean
  correct: boolean
  disabled: boolean
  onChoose: (side: 'left' | 'right') => void
}) {
  return <button className={`distance-city-choice${selected ? correct ? ' is-right' : ' is-wrong' : ''}${revealed ? ' is-revealed' : ''}`} type="button" onClick={() => onChoose(side)} disabled={disabled} aria-label={revealed ? `Choose ${city.name}, ${countryName}` : `Choose ${city.name}`}>
    <strong>{city.name}</strong>
    {revealed && <><span>{countryName}</span><span className="distance-city-coordinates"><MapPin size={16} />{formatCoordinates(city, 2)}</span><small className="distance-city-result">{Math.round(distance).toLocaleString()} km away · {direction}</small></>}
  </button>
}
