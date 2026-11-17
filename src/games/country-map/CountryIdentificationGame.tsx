import { useEffect, useMemo, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingsMenu } from '../../components/GameControls'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { useAppData } from '../../app/useAppData'
import type { Country, GeoFeature, GeographyData, GameMode, RegionCollection } from '../../geography/types'
import { loadRegions } from '../../geography/data'
import { pickCountries, seededShuffle } from '../../puzzles/engine'
import { missedCountryCodes } from '../../statistics/mistakes'
import { useGameSession } from '../session'

type Scope = 'world' | 'continent' | 'regions'
type QuestionCount = '10' | '20' | '50' | 'infinite'
interface Question { code: string; name: string; detail: string; feature?: GeoFeature }

export function CountryIdentificationGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [scope, setScope] = useState<Scope>('world')
  const [continent, setContinent] = useState('Europe')
  const [regionCountry, setRegionCountry] = useState('USA')
  const [round, setRound] = useState(0)
  const [questionCount, setQuestionCount] = useState<QuestionCount>('10')
  const [timed, setTimed] = useState(false)
  const [reviewMissed, setReviewMissed] = useState(false)
  const [deckCycle, setDeckCycle] = useState(0)
  const [loadedRegions, setLoadedRegions] = useState<{ iso3: string; collection: RegionCollection } | null>(null)
  const [failedRegionCountry, setFailedRegionCountry] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [answerLocked, setAnswerLocked] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [input, setInput] = useState('')
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [scopeError, setScopeError] = useState('')
  const [resolved, setResolved] = useState(0)
  const [seconds, setSeconds] = useState(60)
  const [missedQuestions, setMissedQuestions] = useState<string[]>([])
  const missedCodes = useMemo(() => missedCountryCodes(state.history, 'countries'), [state.history])
  const { save, saveError, resetSession } = useGameSession('countries', mode, date, `${seed}:${round}:${scope}:${continent}:${regionCountry}:${questionCount}:${timed}:${reviewMissed}`)
  const infinitePractice = mode === 'practice' && questionCount === 'infinite'
  const questionSeed = mode === 'daily' ? seed : `${seed}:${round}:${deckCycle}:${scope}:${continent}:${regionCountry}:${reviewMissed}`

  const countriesWithRegions = useMemo(() => data.countries.filter((country) => country.regionCount > 0).sort((a, b) => a.name.localeCompare(b.name)), [data.countries])
  const continents = useMemo(() => [...new Set(data.countries.filter((country) => country.hasGeometry && country.continent).map((country) => country.continent as string))].sort(), [data.countries])
  const regions = loadedRegions?.iso3 === regionCountry ? loadedRegions.collection : null
  const regionError = failedRegionCountry === regionCountry
    ? 'No subdivision map is available for this country. Choose another supported country.'
    : ''

  useEffect(() => {
    if (scope !== 'regions') return
    let active = true
    loadRegions(regionCountry).then((collection) => { if (active) setLoadedRegions({ iso3: regionCountry, collection }) }).catch(() => {
      if (active) setFailedRegionCountry(regionCountry)
    })
    return () => { active = false }
  }, [scope, regionCountry])

  const questions = useMemo<Question[]>(() => {
    const requestedCount = mode === 'daily' ? 8 : questionCount === 'infinite' ? 40 : Number(questionCount)
    if (scope === 'regions') {
      if (!regions) return []
      return seededShuffle(regions.features, `${questionSeed}:regions:${regionCountry}`)
        .slice(0, requestedCount)
        .map((feature) => ({
          code: String(feature.properties.id ?? feature.id ?? ''),
          name: String(feature.properties.name ?? 'Unnamed region'),
          detail: data.countriesByCode.get(regionCountry)?.name ?? regionCountry,
          feature,
        }))
    }
    const filter = scope === 'continent' ? (country: Country) => country.continent === continent : undefined
    const selectedCountries = pickCountries(data.countries, data.countries.length, `${questionSeed}:${scope}:${continent}`, filter)
    const orderedCountries = mode === 'daily' || !reviewMissed
      ? selectedCountries
      : [
        ...seededShuffle(selectedCountries.filter((country) => missedCodes.includes(country.iso3)), `${questionSeed}:missed`),
        ...seededShuffle(selectedCountries.filter((country) => !missedCodes.includes(country.iso3)), `${questionSeed}:fresh`),
      ]
    return orderedCountries.slice(0, requestedCount).map((country) => ({ code: country.iso3, name: country.name, detail: country.continent ?? 'World' }))
  }, [scope, regions, regionCountry, mode, questionSeed, data.countries, data.countriesByCode, continent, questionCount, reviewMissed, missedCodes])

  function resetRound() {
    setIndex(0)
    setSelected('')
    setAnswerLocked(false)
    setFeedback('')
    setInput('')
    setCorrect(0)
    setScore(0)
    setResolved(0)
    setSeconds(60)
    setDeckCycle(0)
    setMissedQuestions([])
    setFinished(false)
    setScopeError('')
  }

  const question = questions[index]
  const countLimit = questions.length
  const countryFeatures = useMemo(() => scope === 'regions'
    ? (regions?.features ?? [])
    : data.features, [scope, regions, data.features])
  const suggestions: Suggestion[] = useMemo(() => scope === 'regions'
    ? (regions?.features ?? []).map((feature) => ({ value: String(feature.properties.id), label: String(feature.properties.name), detail: data.countriesByCode.get(regionCountry)?.name }))
    : data.countries.filter((country) => country.hasGeometry).map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })),
  [scope, regions, data.countries, data.countriesByCode, regionCountry])

  useEffect(() => {
    if (mode !== 'practice' || !timed || finished || questions.length === 0) return
    const timer = window.setTimeout(() => {
      if (seconds <= 1) {
        setSeconds(0)
        setFinished(true)
        if (resolved > 0) void save(score, correct, resolved, { scope, continent, regionCountry, questionCodes: questions.map((item) => item.code), missedCountries: missedQuestions, questionCount, timed, reviewMissed })
      } else setSeconds((value) => value - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [mode, timed, finished, seconds, score, correct, resolved, scope, continent, regionCountry, questions, missedQuestions, questionCount, reviewMissed, save])

  if (scope === 'regions' && !regions && !regionError) return <LoadingState label="Opening subdivision map…" />
  if (regionError) return <div className="game-body"><InlineNotice title="Subdivision data unavailable" tone="warning">{regionError}</InlineNotice></div>
  if (questions.length === 0) return <LoadingState label="Choosing a country…" />
  const filteredFeatures = question.feature ? [question.feature] : countryFeatures
  const showOptions = mode === 'practice'

  function submit(code: string) {
    if (!question || answerLocked) return
    const suggestion = suggestions.find((item) => item.value === code)
    if (!suggestion) {
      setScopeError('Choose a place from the suggestions or the map.')
      return
    }
    const allowed = scope !== 'continent' || data.countriesByCode.get(code)?.continent === continent
    if (scope === 'regions' && !question.feature) return
    if (!allowed) {
      setScopeError(`Choose a country in ${continent}.`)
      return
    }
    const isCorrect = code === question.code
    setResolved((value) => value + 1)
    setSelected(code)
    setAnswerLocked(true)
    setScopeError('')
    setFeedback(isCorrect ? `That’s ${question.name}.` : `That was ${question.name}. ${suggestion.label} is ${isCorrect ? 'correct' : 'a different place'}.`)
    if (isCorrect) {
      setCorrect((value) => value + 1)
      setScore((value) => value + 100)
    } else if (scope !== 'regions') {
      setMissedQuestions((current) => current.includes(question.code) ? current : [...current, question.code])
    }
  }

  async function nextQuestion() {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1)
      setSelected('')
      setAnswerLocked(false)
      setFeedback('')
      setInput('')
      setScopeError('')
      return
    }
    if (infinitePractice) {
      setDeckCycle((value) => value + 1)
      setIndex(0)
      setSelected('')
      setAnswerLocked(false)
      setFeedback('')
      setInput('')
      setScopeError('')
      return
    }
    setFinished(true)
    await save(score, correct, resolved, { scope, continent, regionCountry, questionCodes: questions.map((item) => item.code), missedCountries: missedQuestions, questionCount, reviewMissed })
  }

  return (
    <div className="game-body map-game-body">
      <div className="question-toolbar">
        <div><span className="eyebrow">{question.detail}</span><h2><em>{question.name}</em></h2></div>
        <div className="question-toolbar-tools">
          {showOptions && <GameSettingsMenu><div className="practice-config">
            <label><span>Practice scope</span><select value={scope} onChange={(event) => { resetRound(); setScope(event.target.value as Scope) }}><option value="world">Worldwide</option><option value="continent">One continent</option><option value="regions">Subdivisions</option></select></label>
            {scope === 'continent' && <label><span>Continent</span><select value={continent} onChange={(event) => { resetRound(); setContinent(event.target.value) }}>{continents.map((item) => <option key={item}>{item}</option>)}</select></label>}
            <label><span>Questions</span><select value={questionCount} onChange={(event) => { resetRound(); setQuestionCount(event.target.value as QuestionCount) }}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="infinite">Infinite</option></select></label>
            <label className="flag-reveal-setting"><input type="checkbox" checked={timed} onChange={(event) => { resetRound(); setTimed(event.target.checked) }} /><span>60-second speed round</span></label>
            {missedCodes.length > 0 && scope !== 'regions' && <label className="flag-reveal-setting"><input type="checkbox" checked={reviewMissed} onChange={(event) => { resetRound(); setReviewMissed(event.target.checked) }} /><span>Review previously missed countries first</span></label>}
            {scope === 'regions' && <label><span>Country</span><select value={regionCountry} onChange={(event) => { resetRound(); setFailedRegionCountry(null); setRegionCountry(event.target.value) }}>{countriesWithRegions.map((country) => <option key={country.iso3} value={country.iso3}>{country.name} · {country.regionCount}</option>)}</select></label>}
          </div></GameSettingsMenu>}
          <div className="question-count"><strong>{infinitePractice ? resolved + 1 : index + 1}</strong><span>{infinitePractice ? 'country' : `of ${countLimit}`}</span></div>
        </div>
      </div>
      {showOptions && <div className="country-practice-status"><span><strong>{score.toLocaleString()}</strong> points · <strong>{correct}</strong> correct</span>{timed && <span>{seconds}s left</span>}{infinitePractice && resolved > 0 && <button className="button button-outline" type="button" disabled={answerLocked} onClick={() => { setFinished(true); void save(score, correct, resolved, { scope, continent, regionCountry, missedCountries: missedQuestions, questionCount, timed, reviewMissed }) }}>End session</button>}</div>}
      {scopeError && <div className="form-message form-message-error" role="alert">{scopeError}</div>}
      <div className="map-playfield">
        <div className="game-map-stage">
          <GeoMap
            features={filteredFeatures}
            onSelectCode={submit}
            activeCodes={selected ? [selected] : []}
            correctCode={answerLocked ? question.code : null}
            wrongCode={answerLocked && selected !== question.code ? selected : null}
            ariaLabel={scope === 'regions' ? `Map of ${question.detail}` : 'World map; choose a country'}
            showHoverLabels={state.settings.mapLabels}
          />
        </div>
        <div className="map-answer-dock">
        <AutocompleteInput
          id="country-answer"
          label="Search countries or regions"
          placeholder={scope === 'regions' ? 'Type a region name' : 'Type a country name'}
          value={input}
          onChange={(value) => { setInput(value); setScopeError('') }}
          suggestions={suggestions}
          onPick={(suggestion) => { setInput(suggestion.label); submit(suggestion.value) }}
          onSubmit={() => {
            const matched = suggestions.find((item) => [item.label, ...(item.aliases ?? [])].some((name) => name.toLocaleLowerCase() === input.trim().toLocaleLowerCase()))
            if (matched) submit(matched.value)
            else setScopeError('Choose an exact place name from the suggestions.')
          }}
          submitLabel="Answer"
          disabled={answerLocked}
        />
        </div>
      </div>
      {scope === 'regions' && data.countriesByCode.get(regionCountry)?.regionSource && <p className="map-source-note">Boundary source: {data.countriesByCode.get(regionCountry)?.regionSource?.source} · {data.countriesByCode.get(regionCountry)?.regionSource?.license}</p>}
      {answerLocked && <div className={`answer-feedback${selected === question.code ? ' is-correct' : ' is-incorrect'}`} role="status"><span className="feedback-icon">{selected === question.code ? <Check size={17} /> : <RotateCcw size={16} />}</span><span>{feedback}</span>{!finished && <button className="button button-dark" type="button" onClick={() => void nextQuestion()}>{index === questions.length - 1 ? 'See result' : 'Next place'}</button>}</div>}
      <GameResultsDialog complete={finished} gameId="countries" mode={mode} score={score} correct={correct} total={infinitePractice ? resolved : questions.length} title={timed && seconds === 0 ? 'Time is up.' : "Round complete."} message="Good work. You’ve covered some ground." saveError={saveError} onReplay={mode === 'practice' ? () => { resetRound(); resetSession(); setRound((value) => value + 1) } : undefined} />
    </div>
  )
}
