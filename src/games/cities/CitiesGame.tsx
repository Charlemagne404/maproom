import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, MapPin, MoveUpRight } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingsMenu } from '../../components/GameControls'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadCities } from '../../geography/data'
import type { City, Coordinates, GeographyData, GameMode } from '../../geography/types'
import { distanceScore, directionFromTo, greatCircleKm, normalizeAnswer, resolveCountryAnswer, seededShuffle } from '../../puzzles/engine'
import { useAppData } from '../../app/useAppData'
import { useGameSession } from '../session'
import { eligibleCountries, type GeographyEligibility } from '../../geography/eligibility'

type CityTask = 'capitals' | 'locate' | 'identify'
type PracticeCount = '10' | '20' | '50' | 'infinite'
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
  const [eligibility, setEligibility] = useState<GeographyEligibility>('standard')
  const [continent, setContinent] = useState('All regions')
  const [direction, setDirection] = useState<CapitalDirection>('country-to-capital')
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>('typed')
  const [minimumPopulation, setMinimumPopulation] = useState(50_000)
  const [questionCount, setQuestionCount] = useState<PracticeCount>('10')
  const [timed, setTimed] = useState(false)
  const [round, setRound] = useState(0)

  useEffect(() => {
    let active = true
    loadCities().then((loaded) => { if (active) setCityData(loaded) }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'City data could not be loaded.')
    })
    return () => { active = false }
  }, [])

  const continents = useMemo(() => [...new Set(eligibleCountries(data.countries, eligibility).map((country) => country.continent).filter((value): value is string => Boolean(value)))].sort(), [data.countries, eligibility])
  if (loadError) return <InlineNotice title="The city gazetteer could not open" tone="warning">{loadError}</InlineNotice>
  if (!cityData) return <LoadingState label="Opening the city gazetteer…" />
  return <CitiesRound
    key={`${round}:${task}:${continent}:${direction}:${answerStyle}:${minimumPopulation}:${questionCount}:${timed}`}
    data={data}
    cities={cityData.cities}
    mode={mode}
    date={date}
    seed={mode === 'daily' ? `${seed}:${round}:${task}:${continent}:${direction}:${answerStyle}` : `${seed}:${round}:${task}:${continent}:${direction}:${answerStyle}:${minimumPopulation}:${questionCount}:${timed}`}
    task={task}
    eligibility={eligibility}
    continent={continent}
    direction={direction}
    answerStyle={answerStyle}
    minimumPopulation={minimumPopulation}
    questionCount={questionCount}
    timed={timed}
    continents={continents}
    onTask={setTask}
    onEligibility={setEligibility}
    onContinent={setContinent}
    onDirection={setDirection}
    onAnswerStyle={setAnswerStyle}
    onMinimumPopulation={setMinimumPopulation}
    onQuestionCount={setQuestionCount}
    onTimed={setTimed}
    onNextRound={() => setRound((value) => value + 1)}
  />
}

function CitiesRound({ data, cities, mode, date, seed, task, eligibility, continent, direction, answerStyle, minimumPopulation, questionCount, timed, continents, onTask, onEligibility, onContinent, onDirection, onAnswerStyle, onMinimumPopulation, onQuestionCount, onTimed, onNextRound }: {
  data: GeographyData
  cities: City[]
  mode: GameMode
  date: string
  seed: string
  task: CityTask
  eligibility: GeographyEligibility
  continent: string
  direction: CapitalDirection
  answerStyle: AnswerStyle
  minimumPopulation: number
  questionCount: PracticeCount
  timed: boolean
  continents: string[]
  onTask: (task: CityTask) => void
  onEligibility: (eligibility: GeographyEligibility) => void
  onContinent: (continent: string) => void
  onDirection: (direction: CapitalDirection) => void
  onAnswerStyle: (style: AnswerStyle) => void
  onMinimumPopulation: (value: number) => void
  onQuestionCount: (value: PracticeCount) => void
  onTimed: (value: boolean) => void
  onNextRound: () => void
}) {
  const { state } = useAppData()
  const session = useGameSession('cities', mode, date, seed)
  const progress = mode === 'daily' ? session.progress : null
  const readNumber = (key: string, fallback: number) => typeof progress?.[key] === 'number' ? progress[key] as number : fallback
  const readString = (key: string, fallback: string) => typeof progress?.[key] === 'string' ? progress[key] as string : fallback
  const readBoolean = (key: string, fallback: boolean) => typeof progress?.[key] === 'boolean' ? progress[key] as boolean : fallback
  const [index, setIndex] = useState(() => readNumber('index', 0))
  const [cycle, setCycle] = useState(() => readNumber('cycle', 0))
  const [locked, setLocked] = useState(() => readBoolean('locked', false))
  const [finished, setFinished] = useState(() => readBoolean('finished', false))
  const [correct, setCorrect] = useState(() => readNumber('correct', 0))
  const [score, setScore] = useState(() => readNumber('score', 0))
  const [resolved, setResolved] = useState(() => readNumber('resolved', 0))
  const [seconds, setSeconds] = useState(() => readNumber('seconds', 60))
  const [message, setMessage] = useState(() => readString('message', ''))
  const [input, setInput] = useState(() => readString('input', ''))
  const [selected, setSelected] = useState(() => readString('selected', ''))
  const [questionCorrect, setQuestionCorrect] = useState(() => readBoolean('questionCorrect', false))
  const [guess, setGuess] = useState<Coordinates | null>(() => progress?.guess && typeof progress.guess === 'object' && typeof (progress.guess as Coordinates).lat === 'number' && typeof (progress.guess as Coordinates).lon === 'number' ? progress.guess as Coordinates : null)
  const [latitude, setLatitude] = useState(() => readString('latitude', ''))
  const [longitude, setLongitude] = useState(() => readString('longitude', ''))
  const infinitePractice = mode === 'practice' && questionCount === 'infinite'
  const requestedCount = mode === 'daily' ? 6 : questionCount === 'infinite' ? 40 : Number(questionCount)
  const { save, saveError, saveProgress } = session
  const eligible = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const eligibleCodes = useMemo(() => new Set(eligible.map((country) => country.iso3)), [eligible])

  const filteredCities = useMemo(() => cities.filter((city) => {
    const country = data.countriesByCode.get(city.countryIso3)
    return country && eligibleCodes.has(country.iso3) && (continent === 'All regions' || country.continent === continent)
  }), [cities, continent, data.countriesByCode, eligibleCodes])
  const capitals = useMemo(() => eligible.filter((country) => country.capital && country.capitalCoordinates && (continent === 'All regions' || country.continent === continent)), [eligible, continent])
  const questions = useMemo<Question[]>(() => {
    if (mode === 'daily') {
      const capitalPool = eligible.filter((country) => country.capital && country.capitalCoordinates)
      const majorCities = cities.filter((city) => eligibleCodes.has(city.countryIso3) && city.population >= 100_000)
      const capitalQuestions = seededShuffle(capitalPool, `${seed}:capitals`).slice(0, 2).map((country) => ({ kind: 'capitals' as const, country, direction: 'country-to-capital' as const }))
      const locationQuestions = seededShuffle(majorCities, `${seed}:locations`).slice(0, 2).map((city) => ({ kind: 'locate' as const, city }))
      const identificationQuestions = seededShuffle(majorCities, `${seed}:identifications`).slice(2, 4).map((city) => ({ kind: 'identify' as const, city }))
      const generated = seededShuffle([...capitalQuestions, ...locationQuestions, ...identificationQuestions], `${seed}:daily-order`)
      return restoreCityQuestionOrder(generated, progress?.questions, data, cities)
    }
    if (task === 'capitals') {
      return seededShuffle(capitals, `${seed}:capital-practice:${cycle}`).slice(0, requestedCount).map((country) => ({ kind: 'capitals', country, direction }))
    }
    const pool = filteredCities.filter((city) => city.population >= minimumPopulation || city.capital)
    return seededShuffle(pool, `${seed}:${task}:${cycle}`).slice(0, requestedCount).map((city) => ({ kind: task, city }))
  }, [mode, eligible, eligibleCodes, cities, seed, capitals, task, direction, filteredCities, minimumPopulation, requestedCount, cycle, progress, data])

  const question = questions[index]
  const countrySuggestions: Suggestion[] = useMemo(() => eligible.map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [eligible])
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

  useEffect(() => {
    if (mode !== 'daily' || finished) return
    void saveProgress({ index, cycle, locked, finished, correct, score, resolved, seconds, message, input, selected, questionCorrect, guess, latitude, longitude, questions: questions.map((item) => ({ kind: item.kind, country: item.country?.iso3, city: item.city?.id })) })
  }, [mode, finished, index, cycle, locked, correct, score, resolved, seconds, message, input, selected, questionCorrect, guess, latitude, longitude, questions, saveProgress])
  function setCorrectAnswer(points: number, text: string) {
    setCorrect((value) => value + 1)
    setResolved((value) => value + 1)
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
        setResolved((value) => value + 1)
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
        setResolved((value) => value + 1)
        setLocked(true)
        setMessage(`The listed capital is ${question.country.capital}.`)
      }
    } else {
      const country = resolveCountryAnswer(value, data.countries)
      if (country?.iso3 === question.country.iso3) setCorrectAnswer(100, `Correct. ${question.country.capital} is the capital of ${country.name}.`)
      else {
        setQuestionCorrect(false)
        setResolved((value) => value + 1)
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
      setResolved((value) => value + 1)
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
    setResolved((value) => value + 1)
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
    if (infinitePractice) {
      setCycle((value) => value + 1)
      setIndex(0)
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
    await save(score, correct, resolved, { task, continent, direction, answerStyle, minimumPopulation, questionCount, questions: questions.map((item) => ({ kind: item.kind, country: item.country?.iso3, city: item.city?.id })) })
  }

  useEffect(() => {
    if (mode !== 'practice' || !timed || finished) return
    const timer = window.setTimeout(() => {
      if (seconds <= 1) {
        setSeconds(0)
        setFinished(true)
        if (resolved > 0) void save(score, correct, resolved, { task, continent, direction, answerStyle, minimumPopulation, questionCount, timed })
      } else setSeconds((value) => value - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [mode, timed, finished, seconds, resolved, score, correct, save, task, continent, direction, answerStyle, minimumPopulation, questionCount])

  if (!question) return <div className="game-body"><InlineNotice title="No city questions are available" tone="warning">Choose another region, a lower population threshold or a different task.</InlineNotice></div>

  const modeLabel = mode === 'daily' ? 'A little of everything' : task === 'capitals' ? 'Capitals' : task === 'locate' ? 'City location' : 'City identification'
  const prompt = question.kind === 'capitals'
    ? question.direction === 'country-to-capital' ? `What is the capital of ${question.country?.name}?` : `${question.country?.capital} is the capital of which country?`
    : question.kind === 'locate'
      ? `Place ${question.city?.name}, ${data.countriesByCode.get(question.city?.countryIso3 ?? '')?.name ?? ''} on the map.`
      : `Which city is marked in ${data.countriesByCode.get(question.city?.countryIso3 ?? '')?.name ?? 'this country'}?`

  return (
    <div className="game-body cities-game-body">
      <div className="question-toolbar">
        <div><span className="eyebrow">{modeLabel}</span><h2>{prompt}</h2><p>{infinitePractice ? `Question ${resolved + 1}` : `Question ${index + 1} of ${questions.length}`}{question.city?.population ? ` · population ${question.city.population.toLocaleString()}` : ''}</p></div>
        <div className="question-toolbar-tools">
          {mode === 'practice' && <GameSettingsMenu><div className="practice-config cities-config">
            <label><span>Practice task</span><select value={task} onChange={(event) => onTask(event.target.value as CityTask)}><option value="capitals">Capitals</option><option value="locate">City location</option><option value="identify">City identification</option></select></label>
            <label><span>Country pool</span><select value={eligibility} onChange={(event) => onEligibility(event.target.value as GeographyEligibility)}><option value="standard">Standard · 195 states</option><option value="extended">Extended · territories included</option></select></label>
            <label><span>Region</span><select value={continent} onChange={(event) => onContinent(event.target.value)}><option>All regions</option>{continents.map((item) => <option key={item}>{item}</option>)}</select></label>
            {task === 'capitals' && <><label><span>Direction</span><select value={direction} onChange={(event) => onDirection(event.target.value as CapitalDirection)}><option value="country-to-capital">Country → capital</option><option value="capital-to-country">Capital → country</option></select></label><label><span>Answer style</span><select value={answerStyle} onChange={(event) => onAnswerStyle(event.target.value as AnswerStyle)}><option value="typed">Type a name</option><option value="choices">Multiple choice</option></select></label></>}
            {task !== 'capitals' && <label><span>City population from</span><select value={minimumPopulation} onChange={(event) => onMinimumPopulation(Number(event.target.value))}><option value={50000}>50,000</option><option value={100000}>100,000</option><option value={250000}>250,000</option><option value={1000000}>1 million</option></select></label>}
            <label><span>Questions</span><select value={questionCount} onChange={(event) => onQuestionCount(event.target.value as PracticeCount)}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="infinite">Infinite</option></select></label>
            <label className="flag-reveal-setting"><input type="checkbox" checked={timed} onChange={(event) => onTimed(event.target.checked)} /><span>60-second round</span></label>
          </div></GameSettingsMenu>}
          <div className="question-count"><strong>{infinitePractice ? resolved + 1 : index + 1}</strong><span>{infinitePractice ? 'question' : `of ${questions.length}`}</span></div>
        </div>
      </div>
      {mode === 'practice' && <div className="city-practice-status"><span><strong>{score.toLocaleString()}</strong> points · <strong>{correct}</strong> accurate answers</span><span>{timed ? `${seconds}s left` : task === 'locate' ? 'Closer markers earn more points' : '100 points per correct answer'}</span>{infinitePractice && resolved > 0 && <button className="button button-outline" type="button" disabled={locked} onClick={() => { setFinished(true); void save(score, correct, resolved, { task, continent, direction, answerStyle, minimumPopulation, questionCount, timed }) }}>End session</button>}</div>}
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
      {message && <div className={`answer-feedback${locked ? (questionCorrect ? ' is-correct' : ' is-incorrect') : ''}`} role="status"><span className="feedback-icon">{questionCorrect ? <Check size={17} /> : <MoveUpRight size={16} />}</span><span>{message}</span>{locked && !finished && <button className="button button-dark" type="button" onClick={() => void nextQuestion()}>{index === questions.length - 1 ? 'See result' : 'Next place'}</button>}</div>}
      {mode === 'daily' && !finished && <div className="daily-mix-note"><ArrowRight size={14} /> Today includes capitals, city names and map placement.</div>}
      <GameResultsDialog complete={finished} gameId="cities" mode={mode} score={score} correct={correct} total={infinitePractice ? resolved : questions.length} title={timed && seconds === 0 ? 'Time is up.' : 'City round complete.'} message="Places have a way of sticking." saveError={saveError} onReplay={mode === 'practice' ? onNextRound : undefined} replayLabel="New city round" />
    </div>
  )
}

function restoreCityQuestionOrder(generated: Question[], saved: unknown, data: GeographyData, cities: City[]): Question[] {
  if (!Array.isArray(saved)) return generated
  const countries = data.countriesByCode
  const citiesById = new Map(cities.map((city) => [city.id, city]))
  const restored: Question[] = []
  for (const raw of saved) {
    if (!raw || typeof raw !== 'object') return generated
    const item = raw as { kind?: unknown; country?: unknown; city?: unknown }
    if (item.kind === 'capitals' && typeof item.country === 'string') {
      const country = countries.get(item.country)
      if (!country) return generated
      restored.push({ kind: 'capitals', country, direction: 'country-to-capital' })
    } else if ((item.kind === 'locate' || item.kind === 'identify') && typeof item.city === 'string') {
      const city = citiesById.get(item.city)
      if (!city) return generated
      restored.push({ kind: item.kind, city })
    } else return generated
  }
  return restored.length === generated.length ? restored : generated
}

function countryChoicesFromCapitals(capitals: GeographyData['countries'], answerCode: string, seed: string, index: number) {
  const correct = capitals.find((country) => country.iso3 === answerCode)
  const distractors = seededShuffle(capitals.filter((country) => country.iso3 !== answerCode), `${seed}:country-choice:${index}`).slice(0, 3)
  return seededShuffle([...(correct ? [correct] : []), ...distractors], `${seed}:country-choice-order:${index}`).map((country) => ({ code: country.iso3, label: country.name, detail: country.continent ?? '' }))
}
