import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, MapPin, MoveUpRight } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadCities } from '../../geography/data'
import type { City, Coordinates, GeographyData, GameMode } from '../../geography/types'
import { distanceScore, directionFromTo, greatCircleKm, normalizeAnswer, resolveCountryAnswer, seededShuffle } from '../../puzzles/engine'
import { useAppData } from '../../app/useAppData'
import { useGameSession } from '../session'

type CityTask = 'capitals' | 'locate' | 'identify'
type CapitalDirection = 'country-to-capital' | 'capital-to-country'
type AnswerStyle = 'choices' | 'typed'
interface Question {
  kind: CityTask
  country?: GeographyData['countries'][number]
  city?: City
  direction?: CapitalDirection
}

export function CitiesGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [cityData, setCityData] = useState<Awaited<ReturnType<typeof loadCities>> | null>(null)
  const [loadError, setLoadError] = useState('')
  const [task, setTask] = useState<CityTask>('capitals')
  const [continent, setContinent] = useState('All regions')
  const [direction, setDirection] = useState<CapitalDirection>('country-to-capital')
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>('typed')
  const [round, setRound] = useState(0)

  useEffect(() => {
    let active = true
    loadCities().then((loaded) => { if (active) setCityData(loaded) }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'City data could not be loaded.')
    })
    return () => { active = false }
  }, [])

  const continents = useMemo(() => [...new Set(data.countries.map((country) => country.continent).filter(Boolean) as string[])].sort(), [data.countries])
  if (loadError) return <InlineNotice title="The city gazetteer could not open" tone="warning">{loadError}</InlineNotice>
  if (!cityData) return <LoadingState label="Opening the city gazetteer…" />
  return <CitiesRound
    key={`${round}:${task}:${continent}:${direction}:${answerStyle}`}
    data={data}
    cities={cityData.cities}
    mode={mode}
    date={date}
    seed={`${seed}:${round}:${task}:${continent}:${direction}:${answerStyle}`}
    task={task}
    continent={continent}
    direction={direction}
    answerStyle={answerStyle}
    continents={continents}
    onTask={setTask}
    onContinent={setContinent}
    onDirection={setDirection}
    onAnswerStyle={setAnswerStyle}
    onNextRound={() => setRound((value) => value + 1)}
  />
}

function CitiesRound({ data, cities, mode, date, seed, task, continent, direction, answerStyle, continents, onTask, onContinent, onDirection, onAnswerStyle, onNextRound }: {
  data: GeographyData
  cities: City[]
  mode: GameMode
  date: string
  seed: string
  task: CityTask
  continent: string
  direction: CapitalDirection
  answerStyle: AnswerStyle
  continents: string[]
  onTask: (task: CityTask) => void
  onContinent: (continent: string) => void
  onDirection: (direction: CapitalDirection) => void
  onAnswerStyle: (style: AnswerStyle) => void
  onNextRound: () => void
}) {
  const { state } = useAppData()
  const [index, setIndex] = useState(0)
  const [locked, setLocked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState('')
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState('')
  const [questionCorrect, setQuestionCorrect] = useState(false)
  const [guess, setGuess] = useState<Coordinates | null>(null)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const { save, saveError } = useGameSession('cities', mode, date, seed)

  const filteredCities = useMemo(() => cities.filter((city) => {
    const country = data.countriesByCode.get(city.countryIso3)
    return country && (continent === 'All regions' || country.continent === continent)
  }), [cities, continent, data.countriesByCode])
  const capitals = useMemo(() => data.countries.filter((country) => country.capital && country.capitalCoordinates && (continent === 'All regions' || country.continent === continent)), [data.countries, continent])
  const questions = useMemo<Question[]>(() => {
    if (mode === 'daily') {
      const capitalPool = data.countries.filter((country) => country.capital && country.capitalCoordinates)
      const majorCities = cities.filter((city) => city.population >= 100_000)
      const capitalQuestions = seededShuffle(capitalPool, `${seed}:capitals`).slice(0, 2).map((country) => ({ kind: 'capitals' as const, country, direction: 'country-to-capital' as const }))
      const locationQuestions = seededShuffle(majorCities, `${seed}:locations`).slice(0, 2).map((city) => ({ kind: 'locate' as const, city }))
      const identificationQuestions = seededShuffle(majorCities, `${seed}:identifications`).slice(2, 4).map((city) => ({ kind: 'identify' as const, city }))
      return seededShuffle([...capitalQuestions, ...locationQuestions, ...identificationQuestions], `${seed}:daily-order`)
    }
    if (task === 'capitals') {
      return seededShuffle(capitals, `${seed}:capital-practice`).slice(0, 8).map((country) => ({ kind: 'capitals', country, direction }))
    }
    const pool = filteredCities.filter((city) => city.population >= 25_000 || city.capital)
    return seededShuffle(pool, `${seed}:${task}`).slice(0, 6).map((city) => ({ kind: task, city }))
  }, [mode, data.countries, cities, seed, capitals, task, direction, filteredCities])

  const question = questions[index]
  const countrySuggestions: Suggestion[] = useMemo(() => data.countries.map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [data.countries])
  const capitalSuggestions: Suggestion[] = useMemo(() => capitals.map((country) => ({ value: country.iso3, label: country.capital ?? '', detail: country.name, aliases: country.capitals })), [capitals])
  const identifySuggestions: Suggestion[] = useMemo(() => question?.city
    ? cities.filter((city) => city.countryIso3 === question.city?.countryIso3).map((city) => ({ value: city.id, label: city.name, detail: data.countriesByCode.get(city.countryIso3)?.name, aliases: city.aliases }))
    : [], [question, cities, data.countriesByCode])
  const capitalChoices = useMemo(() => {
    if (!question?.country) return []
    const pool = capitals.filter((country) => country.iso3 !== question.country?.iso3)
    const others = seededShuffle(pool, `${seed}:capital-options:${index}`).slice(0, 3)
    return seededShuffle([question.country, ...others], `${seed}:capital-choice-order:${index}`)
  }, [question, capitals, seed, index])
  if (!question) return <InlineNotice title="No city questions are available" tone="warning">Choose another region or task and try again.</InlineNotice>

  function setCorrectAnswer(points: number, text: string) {
    setCorrect((value) => value + 1)
    setScore((value) => value + points)
    setQuestionCorrect(true)
    setLocked(true)
    setMessage(text)
  }

  function submitCountry(code: string) {
    if (locked) return
    if (question.kind !== 'capitals') return
    const correctCode = question.direction === 'capital-to-country' ? question.country?.iso3 : question.country?.iso3
    setSelected(code)
    if (code === correctCode) setCorrectAnswer(100, 'Correct. That is the country and capital pair.')
      else {
        setQuestionCorrect(false)
      setLocked(true)
        setMessage(question.direction === 'capital-to-country' ? `The answer is ${question.country?.name}.` : `The listed capital is ${question.country?.capital}.`)
    }
  }

  function submitCapitalText() {
    const value = input.trim()
    if (!value || !question.country) return
    const normalized = normalizeAnswer(value)
    if (question.direction === 'country-to-capital') {
      const accepted = [...question.country.capitals, question.country.capital ?? ''].filter(Boolean).some((name) => normalizeAnswer(name) === normalized)
      if (accepted) setCorrectAnswer(100, `Correct. ${question.country.name} has ${question.country.capital} as its listed capital.`)
      else {
        setQuestionCorrect(false)
        setLocked(true)
        setMessage(`The listed capital is ${question.country.capital}.`)
      }
    } else {
      const country = resolveCountryAnswer(value, data.countries)
      if (country?.iso3 === question.country.iso3) setCorrectAnswer(100, `Correct. ${question.country.capital} is the capital of ${country.name}.`)
      else {
        setQuestionCorrect(false)
        setLocked(true)
        setMessage(`The answer is ${question.country.name}.`)
      }
    }
    setInput('')
  }

  function submitCityText() {
    if (!question.city) return
    const normalized = normalizeAnswer(input)
    const isMatch = [question.city.name, ...question.city.aliases].some((name) => normalizeAnswer(name) === normalized)
    setInput('')
    if (isMatch) setCorrectAnswer(100, `Correct. ${question.city.name} is in ${data.countriesByCode.get(question.city.countryIso3)?.name}.`)
    else {
      setQuestionCorrect(false)
      setLocked(true)
      setMessage(`The marked city is ${question.city.name}, ${data.countriesByCode.get(question.city.countryIso3)?.name}.`)
    }
  }

  function recordLocation(point: Coordinates) {
    if (locked) return
    setGuess(point)
    setLatitude(point.lat.toFixed(2))
    setLongitude(point.lon.toFixed(2))
  }

  function submitLocation() {
    if (!question.city || locked) return
    const lat = Number(latitude)
    const lon = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setMessage('Enter a latitude from −90 to 90 and a longitude from −180 to 180.')
      return
    }
    const point = { lat, lon }
    const km = greatCircleKm(point, question.city)
    const points = distanceScore(km)
    setGuess(point)
    setLocked(true)
    setScore((value) => value + points)
    setQuestionCorrect(km <= 250)
    if (km <= 250) setCorrect((value) => value + 1)
    setMessage(`${Math.round(km).toLocaleString()} km away · the city is ${directionFromTo(point, question.city)} of your marker.`)
  }

  async function nextQuestion() {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1)
      setLocked(false)
      setMessage('')
      setInput('')
      setSelected('')
      setQuestionCorrect(false)
      setGuess(null)
      setLatitude('')
      setLongitude('')
      return
    }
    setFinished(true)
    await save(score, correct, questions.length, { task, continent, direction, answerStyle, questions: questions.map((item) => ({ kind: item.kind, country: item.country?.iso3, city: item.city?.id })) })
  }

  const modeLabel = mode === 'daily' ? 'A little of everything' : task === 'capitals' ? 'Capitals' : task === 'locate' ? 'City location' : 'City identification'
  const prompt = question.kind === 'capitals'
    ? question.direction === 'country-to-capital' ? `What is the capital of ${question.country?.name}?` : `${question.country?.capital} is the capital of which country?`
    : question.kind === 'locate'
      ? `Place ${question.city?.name}, ${data.countriesByCode.get(question.city?.countryIso3 ?? '')?.name ?? ''} on the map.`
      : `Which city is marked in ${data.countriesByCode.get(question.city?.countryIso3 ?? '')?.name ?? 'this country'}?`

  return (
    <div className="game-body cities-game-body">
      {mode === 'practice' && <div className="practice-config cities-config">
        <label><span>Practice task</span><select value={task} onChange={(event) => onTask(event.target.value as CityTask)}><option value="capitals">Capitals</option><option value="locate">City location</option><option value="identify">City identification</option></select></label>
        {task !== 'capitals' && <label><span>Region</span><select value={continent} onChange={(event) => onContinent(event.target.value)}><option>All regions</option>{continents.map((item) => <option key={item}>{item}</option>)}</select></label>}
        {task === 'capitals' && <><label><span>Direction</span><select value={direction} onChange={(event) => onDirection(event.target.value as CapitalDirection)}><option value="country-to-capital">Country → capital</option><option value="capital-to-country">Capital → country</option></select></label><label><span>Answer style</span><select value={answerStyle} onChange={(event) => onAnswerStyle(event.target.value as AnswerStyle)}><option value="typed">Type a name</option><option value="choices">Multiple choice</option></select></label></>}
      </div>}
      <div className="question-toolbar"><div><span className="eyebrow">{modeLabel}</span><h2>{prompt}</h2><p>Question {index + 1} of {questions.length}{question.city?.population ? ` · population ${question.city.population.toLocaleString()}` : ''}</p></div><div className="question-count"><strong>{index + 1}</strong><span>of {questions.length}</span></div></div>
      {question.kind === 'capitals' && (mode === 'daily' || answerStyle === 'choices') ? <div className="capital-choice-grid" role="group" aria-label="Choose the correct country or capital">
        {(question.direction === 'country-to-capital' ? capitalChoices.map((country) => ({ code: country.iso3, label: country.capital ?? 'Capital unavailable', detail: country.name })) : countryChoicesFromCapitals(capitals, question.country?.iso3 ?? '', seed, index)).map((choice) => <button className={`answer-choice${selected === choice.code ? (choice.code === question.country?.iso3 ? ' is-right' : ' is-wrong') : ''}`} type="button" key={choice.code} disabled={locked} onClick={() => submitCountry(choice.code)}><span>{choice.label}</span><small>{choice.detail}</small></button>)}
      </div> : null}
      {question.kind === 'capitals' && mode !== 'daily' && answerStyle === 'typed' && <AutocompleteInput id="capital-answer" label={question.direction === 'country-to-capital' ? 'Type the capital city' : 'Type the country'} placeholder={question.direction === 'country-to-capital' ? 'Capital city' : 'Country name'} value={input} onChange={setInput} suggestions={question.direction === 'country-to-capital' ? capitalSuggestions : countrySuggestions} onPick={(item) => { setInput(item.label) }} onSubmit={submitCapitalText} submitLabel="Answer" disabled={locked} />}
      {question.kind === 'identify' && question.city && <>
        <div className="game-map-stage city-map-stage"><GeoMap features={data.features} markers={[{ point: question.city, kind: 'answer', label: 'City location' }]} ariaLabel="Map with a marked city location" showHoverLabels={state.settings.mapLabels} /></div>
        <AutocompleteInput id="city-identify-answer" label="Name the marked city" placeholder="Type a city name" value={input} onChange={setInput} suggestions={identifySuggestions} onPick={(item) => setInput(item.label)} onSubmit={submitCityText} submitLabel="Identify" disabled={locked} />
      </>}
      {question.kind === 'locate' && question.city && <>
        <div className="game-map-stage city-map-stage"><GeoMap features={data.features} onPointSelect={recordLocation} markers={guess ? [{ point: guess, kind: 'guess', label: 'Your marker' }, { point: question.city, kind: 'answer', label: 'City location' }] : []} ariaLabel="World map. Click or tap to place a city marker." showHoverLabels={state.settings.mapLabels} /></div>
        <div className="coordinate-tools"><div className="coordinate-fields"><label>Latitude<input type="number" min="-90" max="90" step="0.01" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="e.g. 59.33" /></label><label>Longitude<input type="number" min="-180" max="180" step="0.01" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="e.g. 18.07" /></label></div><button className="button button-dark" type="button" disabled={locked || (!latitude && !longitude)} onClick={submitLocation}><MapPin size={15} /> Place marker</button><span className="coordinate-help">Click the map, or enter coordinates for a keyboard-accessible answer.</span></div>
      </>}
      {message && <div className={`answer-feedback${locked ? (questionCorrect ? ' is-correct' : ' is-incorrect') : ''}`} role="status"><span className="feedback-icon">{questionCorrect ? <Check size={17} /> : <MoveUpRight size={16} />}</span><span>{message}</span>{locked && <button className="button button-dark" type="button" onClick={() => void nextQuestion()}>{index === questions.length - 1 ? 'See result' : 'Next place'}</button>}</div>}
      {finished && <div className="result-panel"><span className="eyebrow">City round complete</span><h2>Places have a way of sticking.</h2><p>{correct} of {questions.length} answers correct or within 250 km.</p><div className="result-score">{score.toLocaleString()}<small>points</small></div><div className="result-actions"><a className="button button-dark" href="/statistics">See statistics</a>{mode === 'daily' ? <a className="button button-outline" href="/games/cities?mode=practice">Explore more cities</a> : <button className="button button-outline" type="button" onClick={onNextRound}>New city round</button>}</div>{saveError && <div className="form-message form-message-error" role="alert">{saveError}</div>}</div>}
      {mode === 'daily' && !finished && <div className="daily-mix-note"><ArrowRight size={14} /> Today includes capitals, city names and map placement.</div>}
    </div>
  )
}

function countryChoicesFromCapitals(capitals: GeographyData['countries'], answerCode: string, seed: string, index: number) {
  const correct = capitals.find((country) => country.iso3 === answerCode)
  const distractors = seededShuffle(capitals.filter((country) => country.iso3 !== answerCode), `${seed}:country-choice:${index}`).slice(0, 3)
  return seededShuffle([...(correct ? [correct] : []), ...distractors], `${seed}:country-choice-order:${index}`).map((country) => ({ code: country.iso3, label: country.name, detail: country.continent ?? '' }))
}
