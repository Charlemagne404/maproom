import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Check, Compass, MapPin } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadCities } from '../../geography/data'
import type { City, GameMode, GeographyData } from '../../geography/types'
import { hashSeed } from '../../puzzles/engine'
import { distancePrompt, makeDistanceQuestions, type DistanceDifficulty, type DistanceMeasure } from '../../puzzles/distance'
import { useGameSession } from '../session'
import { eligibleCountries, initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'
import { useAppData } from '../../app/useAppData'

type CountOption = '10' | '20' | '50' | 'infinite'

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
    loadCities().then((loaded) => { if (active) setCities(loaded.cities) }).catch((issue) => {
      if (active) setError(issue instanceof Error ? issue.message : 'The city gazetteer could not open.')
    })
    return () => { active = false }
  }, [])
  const countries = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const scopes = useMemo(() => [...new Set(countries.map((country) => country.continent).filter((value): value is string => Boolean(value)))].sort(), [countries])
  const dailyMeasure: DistanceMeasure = (['distance', 'latitude', 'longitude'] as const)[hashSeed(seed) % 3] ?? 'distance'
  if (error) return <div className="game-body"><InlineNotice title="The city gazetteer could not open" tone="warning">{error}</InlineNotice></div>
  if (!cities) return <LoadingState label="Opening city coordinates…" />
  return <DistanceRound key={`${round}:${measure}:${scope}:${minimumPopulation}:${difficulty}:${count}:${timed}:${eligibility}`} data={data} cities={cities} countries={countries} mode={mode} date={date} seed={`${seed}:${round}:${measure}:${scope}:${minimumPopulation}:${difficulty}:${count}:${timed}:${eligibility}`} measure={mode === 'daily' ? dailyMeasure : measure} scope={scope} eligibility={eligibility} minimumPopulation={minimumPopulation} difficulty={difficulty} count={count} timed={timed} scopes={scopes} onMeasure={setMeasure} onScope={setScope} onEligibility={setEligibility} onPopulation={setMinimumPopulation} onDifficulty={setDifficulty} onCount={setCount} onTimed={setTimed} onReplay={() => setRound((value) => value + 1)} />
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
  const eligibleCities = useMemo(() => cities.filter((city) => eligibleCodes.has(city.countryIso3)), [cities, eligibleCodes])
  const [cycle, setCycle] = useState(0)
  const [deck, setDeck] = useState(() => makeDistanceQuestions(eligibleCities, new Map(countries.map((country) => [country.iso3, country])), `${seed}:deck:0`, totalQuestions, { scope, measure, minimumPopulation, difficulty }))
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState<'left' | 'right' | ''>('')
  const [resolved, setResolved] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [message, setMessage] = useState('Use the coordinates and scale of the world to compare these places.')
  const [seconds, setSeconds] = useState(60)
  const [finished, setFinished] = useState(false)
  const infinite = mode === 'freeplay' && count === 'infinite'
  const question = deck[index]
  const { save, saveError } = useGameSession('distance', mode, date, seed)

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

  if (!question) return <div className="game-body"><InlineNotice title="No city comparisons fit those settings" tone="warning"><span>Choose a wider region, a lower population threshold or standard difficulty. Distances use the bundled GeoNames city coordinates.</span>{mode === 'freeplay' && <div className="empty-game-actions"><button className="button button-outline" type="button" onClick={() => { onScope('World'); onPopulation(50_000); onDifficulty('standard') }}>Use standard world comparisons</button></div>}</InlineNotice></div>

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
    if (!infinite && index === deck.length - 1) {
      setFinished(true)
      await save(nextScore, nextCorrect, nextResolved, { measure, scope, minimumPopulation, difficulty, bestStreak: Math.max(bestStreak, nextStreak) })
    }
  }

  function nextQuestion() {
    if (index < deck.length - 1) setIndex((value) => value + 1)
    else if (infinite) {
      const nextCycle = cycle + 1
      setDeck(makeDistanceQuestions(eligibleCities, new Map(countries.map((country) => [country.iso3, country])), `${seed}:deck:${nextCycle}`, 40, { scope, measure, minimumPopulation, difficulty }))
      setCycle(nextCycle)
      setIndex(0)
    }
    setChoice('')
    setMessage('Use the coordinates and scale of the world to compare these places.')
  }

  const settings = mode === 'freeplay' && !finished ? <GameSettingsMenu><div className="practice-config">
    <label><span>Challenge</span><select value={measure} onChange={(event) => onMeasure(event.target.value as DistanceMeasure)}><option value="distance">Closer to the origin</option><option value="latitude">Farther north</option><option value="longitude">Farther east of Greenwich</option></select></label>
    <label><span>Country pool</span><select value={eligibility} onChange={(event) => onEligibility(event.target.value as GeographyEligibility)}><option value="standard">Standard · 195 states</option><option value="extended">Extended · territories included</option></select></label>
    <label><span>City region</span><select value={scope} onChange={(event) => onScope(event.target.value)}><option>World</option>{scopes.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label><span>Minimum population</span><select value={minimumPopulation} onChange={(event) => onPopulation(Number(event.target.value))}><option value={50000}>50,000</option><option value={100000}>100,000</option><option value={250000}>250,000</option><option value={1000000}>1 million</option></select></label>
    <label><span>Difficulty</span><select value={difficulty} onChange={(event) => onDifficulty(event.target.value as DistanceDifficulty)}><option value="standard">Standard</option><option value="close">Close calls</option></select></label>
    <label><span>Questions</span><select value={count} onChange={(event) => onCount(event.target.value as CountOption)}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="infinite">Infinite</option></select></label>
    <label className="flag-reveal-setting"><input type="checkbox" checked={timed} onChange={(event) => onTimed(event.target.checked)} /><span>60-second round</span></label>
  </div></GameSettingsMenu> : null
  const prompt = distancePrompt(measure, question.origin.name)
  const selectedCity = choice === 'left' ? question.left : choice === 'right' ? question.right : null
  const revealed = Boolean(choice)

  return <div className="game-body distance-game-body">
    <div className="question-toolbar"><div><h2 className="distance-prompt">{prompt}</h2></div><div className="question-toolbar-tools">{settings}<div className="question-count"><strong>{resolved + 1}</strong><span>{infinite ? 'question' : `of ${deck.length}`}</span></div></div></div>
    <div className="distance-origin"><span><MapPin size={16} /> Starting point</span><strong>{question.origin.name}</strong>{revealed && <><small>{data.countriesByCode.get(question.origin.countryIso3)?.name}</small><code>{question.origin.lat.toFixed(2)}°, {question.origin.lon.toFixed(2)}°</code></>}</div>
    <div className="distance-live" aria-live="polite"><span><strong>{score.toLocaleString()}</strong> points</span><span>{streak} streak <small>best {bestStreak}</small></span><span>{timed ? `${seconds}s left` : `${correct} correct`}</span>{infinite && resolved > 0 && !finished && <button className="button button-outline" type="button" onClick={() => void finishRound()}>End session</button>}</div>
    <div className="distance-choices" role="group" aria-label="Choose the city that fits the clue">
      <CityChoice city={question.left} side="left" countryName={data.countriesByCode.get(question.left.countryIso3)?.name ?? ''} distance={question.leftDistanceKm} direction={question.leftDirection} revealed={revealed} selected={selectedCity?.id === question.left.id} correct={question.answer === 'left'} disabled={revealed || finished} onChoose={answer} />
      <div className="distance-versus"><ArrowLeftRight size={22} /><span>OR</span></div>
      <CityChoice city={question.right} side="right" countryName={data.countriesByCode.get(question.right.countryIso3)?.name ?? ''} distance={question.rightDistanceKm} direction={question.rightDirection} revealed={revealed} selected={selectedCity?.id === question.right.id} correct={question.answer === 'right'} disabled={revealed || finished} onChoose={answer} />
    </div>
    <div className={`answer-feedback${choice ? choice === question.answer ? ' is-correct' : ' is-incorrect' : ''}`} role="status"><span className="feedback-icon">{choice ? <Check size={17} /> : <Compass size={16} />}</span><span>{message}{revealed && <small className="distance-reveal">{question.left.name}: {Math.round(question.leftDistanceKm).toLocaleString()} km {question.leftDirection} · {question.right.name}: {Math.round(question.rightDistanceKm).toLocaleString()} km {question.rightDirection}</small>}</span>{revealed && !finished && <button className="button button-dark" type="button" onClick={nextQuestion}>{index === deck.length - 1 && !infinite ? 'See result' : 'Next comparison'}</button>}</div>
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
    {revealed && <><span>{countryName}</span><span className="distance-city-coordinates"><MapPin size={16} />{city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°</span><small className="distance-city-result">{Math.round(distance).toLocaleString()} km away · {direction}</small></>}
  </button>
}
