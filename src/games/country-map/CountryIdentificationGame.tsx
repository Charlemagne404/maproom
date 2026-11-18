import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { RoundProgress } from '../../components/RoundProgress'
import { GameResultsDialog } from '../../components/GameResults'
import { AdvancedGameSettings, GameSettingSelect, GameSettingToggle, GameSettingsMenu } from '../../components/GameControls'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { useAppData } from '../../app/useAppData'
import type { Country, GeoFeature, GeographyData, GameMode, RegionCollection } from '../../geography/types'
import { loadRegions } from '../../geography/data'
import { pickCountries, seededShuffle } from '../../puzzles/engine'
import { missedCountryCodes } from '../../statistics/mistakes'
import { useGameSession } from '../session'
import { eligibleCountries, initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'

type Scope = 'world' | 'continent' | 'regions'
type QuestionCount = '10' | '20' | '50' | 'infinite'
interface Question { code: string; name: string; detail: string; feature?: GeoFeature }

export function CountryIdentificationGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const session = useGameSession('countries', mode, date, seed)
  const progress = mode === 'daily' ? session.progress : null
  const restoredNumber = (key: string, fallback: number) => typeof progress?.[key] === 'number' ? progress[key] as number : fallback
  const restoredString = (key: string, fallback: string) => typeof progress?.[key] === 'string' ? progress[key] as string : fallback
  const restoredBoolean = (key: string, fallback: boolean) => typeof progress?.[key] === 'boolean' ? progress[key] as boolean : fallback
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
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
  const [index, setIndex] = useState(() => restoredNumber('index', 0))
  const [selected, setSelected] = useState(() => restoredString('selected', ''))
  const [answerLocked, setAnswerLocked] = useState(() => restoredBoolean('answerLocked', false))
  const [feedback, setFeedback] = useState(() => restoredString('feedback', ''))
  const [input, setInput] = useState(() => restoredString('input', ''))
  const [correct, setCorrect] = useState(() => restoredNumber('correct', 0))
  const [score, setScore] = useState(() => restoredNumber('score', 0))
  const [finished, setFinished] = useState(() => restoredBoolean('finished', false))
  const [resolved, setResolved] = useState(() => restoredNumber('resolved', 0))
  const [seconds, setSeconds] = useState(() => restoredNumber('seconds', 60))
  const [missedQuestions, setMissedQuestions] = useState<string[]>(() => Array.isArray(progress?.missedQuestions) ? progress.missedQuestions.filter((item): item is string => typeof item === 'string') : [])
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const advanceQuestion = useRef<() => void>(() => {})
  const focusPromptOnAdvance = useRef(false)
  const missedCodes = useMemo(() => missedCountryCodes(state.history, 'countries'), [state.history])
  const { save, saveError, saveProgress, resetSession } = session
  const infinitePractice = mode === 'freeplay' && questionCount === 'infinite'
  const questionSeed = mode === 'daily' ? seed : `${seed}:${round}:${deckCycle}:${scope}:${continent}:${regionCountry}:${reviewMissed}`

  useLayoutEffect(() => {
    if (!answerLocked && focusPromptOnAdvance.current) {
      focusPromptOnAdvance.current = false
      questionHeading.current?.focus({ preventScroll: true })
    }
  }, [answerLocked, finished, index])

  const eligible = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const countriesWithRegions = useMemo(() => eligible.filter((country) => country.regionCount > 0).sort((a, b) => a.name.localeCompare(b.name)), [eligible])
  const continents = useMemo(() => [...new Set(eligible.map((country) => country.continent).filter((continent): continent is string => Boolean(continent)))].sort(), [eligible])
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
      const generated = seededShuffle(regions.features, `${questionSeed}:regions:${regionCountry}`)
        .slice(0, requestedCount)
        .map((feature) => ({
          code: String(feature.properties.id ?? feature.id ?? ''),
          name: String(feature.properties.name ?? 'Unnamed region'),
          detail: data.countriesByCode.get(regionCountry)?.name ?? regionCountry,
          feature,
        }))
      return restoreQuestionOrder(generated, progress?.questionCodes)
    }
    const filter = scope === 'continent' ? (country: Country) => country.continent === continent : undefined
    const selectedCountries = pickCountries(eligible, eligible.length, `${questionSeed}:${scope}:${continent}`, filter)
    const orderedCountries = mode === 'daily' || !reviewMissed
      ? selectedCountries
      : [
        ...seededShuffle(selectedCountries.filter((country) => missedCodes.includes(country.iso3)), `${questionSeed}:missed`),
        ...seededShuffle(selectedCountries.filter((country) => !missedCodes.includes(country.iso3)), `${questionSeed}:fresh`),
      ]
    return restoreQuestionOrder(
      orderedCountries.slice(0, requestedCount).map((country) => ({ code: country.iso3, name: country.name, detail: country.continent ?? 'World' })),
      progress?.questionCodes,
      (code) => {
        const country = data.countriesByCode.get(code)
        return country ? { code, name: country.name, detail: country.continent ?? 'World' } : undefined
      },
    )
  }, [scope, regions, regionCountry, mode, questionSeed, eligible, data.countriesByCode, continent, questionCount, reviewMissed, missedCodes, progress])

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
  }

  const question = questions[index]
  const countLimit = questions.length
  const countryFeatures = useMemo(() => scope === 'regions'
    ? (regions?.features ?? [])
    : data.features, [scope, regions, data.features])
  const selectableCodes = useMemo(() => scope === 'regions'
    ? undefined
    : eligible.filter((country) => scope !== 'continent' || country.continent === continent).map((country) => country.iso3), [scope, eligible, continent])

  useEffect(() => {
    if (mode !== 'daily' || finished) return
    void saveProgress({ index, selected, answerLocked, feedback, input, correct, score, resolved, seconds, missedQuestions, deckCycle, questionCodes: questions.map((item) => item.code) })
  }, [mode, finished, index, selected, answerLocked, feedback, input, correct, score, resolved, seconds, missedQuestions, deckCycle, questions, saveProgress])

  useEffect(() => {
    if (mode !== 'freeplay' || !timed || finished || questions.length === 0) return
    const timer = window.setTimeout(() => {
      if (seconds <= 1) {
        setSeconds(0)
        setFinished(true)
        if (resolved > 0) void save(score, correct, resolved, { scope, continent, regionCountry, questionCodes: questions.map((item) => item.code), missedCountries: missedQuestions, questionCount, timed, reviewMissed })
      } else setSeconds((value) => value - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [mode, timed, finished, seconds, score, correct, resolved, scope, continent, regionCountry, questions, missedQuestions, questionCount, reviewMissed, save])

  function submit(code: string) {
    if (!question || answerLocked) return
    if (scope === 'regions') {
      const regionCode = (feature: GeoFeature) => String(feature.properties.id ?? feature.id ?? '')
      if (!question.feature || !regions?.features.some((feature) => regionCode(feature) === code)) return
    } else {
      const country = data.countriesByCode.get(code)
      if (!country || (scope === 'continent' && country.continent !== continent)) return
    }
    const isCorrect = code === question.code
    setResolved((value) => value + 1)
    setSelected(code)
    setAnswerLocked(true)
    setFeedback(isCorrect ? 'Correct.' : 'The country was:')
    if (isCorrect) {
      setCorrect((value) => value + 1)
      setScore((value) => value + 100)
    } else if (scope !== 'regions') {
      setMissedQuestions((current) => current.includes(question.code) ? current : [...current, question.code])
    }
  }

  async function nextQuestion() {
    if (index < questions.length - 1) {
      focusPromptOnAdvance.current = true
      setIndex((value) => value + 1)
      setSelected('')
      setAnswerLocked(false)
      setFeedback('')
      setInput('')
      return
    }
    if (infinitePractice) {
      focusPromptOnAdvance.current = true
      setDeckCycle((value) => value + 1)
      setIndex(0)
      setSelected('')
      setAnswerLocked(false)
      setFeedback('')
      setInput('')
      return
    }
    setFinished(true)
    await save(score, correct, resolved, { scope, continent, regionCountry, questionCodes: questions.map((item) => item.code), missedCountries: missedQuestions, questionCount, reviewMissed })
  }

  useLayoutEffect(() => {
    advanceQuestion.current = () => { void nextQuestion() }
  })

  useEffect(() => {
    if (!answerLocked || finished) return
    const timer = window.setTimeout(() => advanceQuestion.current(), 1_850)
    return () => window.clearTimeout(timer)
  }, [answerLocked, finished, index, score, correct, resolved])

  if (scope === 'regions' && !regions && !regionError) return <LoadingState label="Opening subdivision map…" />
  if (regionError) return <div className="game-body"><InlineNotice title="Subdivision data unavailable" tone="warning">{regionError}</InlineNotice></div>
  if (questions.length === 0) return <LoadingState label="Choosing a country…" />
  const filteredFeatures = question.feature ? [question.feature] : countryFeatures
  const showOptions = mode === 'freeplay'

  return (
    <div className="game-body map-game-body">
      <div className="question-toolbar">
        <div><span className="eyebrow">{scope === 'regions' ? question.detail : 'Find the country'}</span><h2 ref={questionHeading} tabIndex={-1}><em>{question.name}</em></h2></div>
        <div className="question-toolbar-tools">
          {showOptions && <GameSettingsMenu><div className="practice-config">
            <GameSettingSelect label="Scope" value={scope} options={[{ value: 'world', label: 'Worldwide' }, { value: 'continent', label: 'One continent' }, { value: 'regions', label: 'Subdivisions' }]} onChange={(value) => { resetRound(); setScope(value as Scope) }} />
            {scope === 'continent' && <GameSettingSelect label="Continent" value={continent} control="select" options={continents.map((item) => ({ value: item, label: item }))} onChange={(value) => { resetRound(); setContinent(value) }} />}
            <GameSettingSelect label="Questions" value={questionCount} options={[{ value: '10', label: '10' }, { value: '20', label: '20' }, { value: '50', label: '50' }, { value: 'infinite', label: 'Infinite' }]} onChange={(value) => { resetRound(); setQuestionCount(value as QuestionCount) }} />
            <GameSettingToggle label="60-second speed round" checked={timed} onChange={(value) => { resetRound(); setTimed(value) }} />
            <AdvancedGameSettings>
              <GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => { resetRound(); setEligibility(value as GeographyEligibility) }} />
              {missedCodes.length > 0 && scope !== 'regions' && <GameSettingToggle label="Review previously missed countries first" checked={reviewMissed} onChange={(value) => { resetRound(); setReviewMissed(value) }} />}
              {scope === 'regions' && <GameSettingSelect label="Country" value={regionCountry} control="select" options={countriesWithRegions.map((country) => ({ value: country.iso3, label: `${country.name} · ${country.regionCount}` }))} onChange={(value) => { resetRound(); setFailedRegionCountry(null); setRegionCountry(value) }} />}
            </AdvancedGameSettings>
          </div></GameSettingsMenu>}
          {!infinitePractice && <RoundProgress current={index + 1} total={countLimit} label="countries" />}
          {infinitePractice && <span className="sr-only" role="status" aria-live="polite">Country {resolved + 1}</span>}
        </div>
      </div>
      {showOptions && <div className="country-practice-status"><span><strong>{score.toLocaleString()}</strong> points · <strong>{correct}</strong> correct</span>{timed && <span>{seconds}s left</span>}{infinitePractice && resolved > 0 && <button className="button button-outline" type="button" disabled={answerLocked} onClick={() => { setFinished(true); void save(score, correct, resolved, { scope, continent, regionCountry, missedCountries: missedQuestions, questionCount, timed, reviewMissed }) }}>End session</button>}</div>}
      <div className="map-playfield">
        <div className="game-map-stage">
          <GeoMap
            features={filteredFeatures}
            onSelectCode={submit}
            selectableCodes={selectableCodes}
            smallHitTargetCodes={selectableCodes}
            activeCodes={selected ? [selected] : []}
            correctCode={answerLocked ? question.code : null}
            wrongCode={answerLocked && selected !== question.code ? selected : null}
            ariaLabel={scope === 'regions' ? `Map of ${question.detail}` : 'World map; choose a country'}
            showHoverLabels={state.settings.mapLabels}
          />
        </div>
      </div>
      {scope === 'regions' && data.countriesByCode.get(regionCountry)?.regionSource && <p className="map-source-note">Boundary source: {data.countriesByCode.get(regionCountry)?.regionSource?.source} · {data.countriesByCode.get(regionCountry)?.regionSource?.license}</p>}
      {answerLocked && <div className={`answer-feedback country-answer-feedback${selected === question.code ? ' is-correct' : ' is-incorrect'}`} role="status"><span className="feedback-icon">{selected === question.code ? <Check size={17} /> : <RotateCcw size={16} />}</span><span>{feedback}<strong className="country-answer-reveal"><span className={`fi fi-${data.countriesByCode.get(question.code)?.flagCode ?? 'xx'}`} role="img" aria-label={`Flag of ${question.name}`} />{question.name}</strong></span></div>}
      <GameResultsDialog complete={finished} gameId="countries" mode={mode} score={score} correct={correct} total={infinitePractice ? resolved : questions.length} title={timed && seconds === 0 ? 'Time is up.' : "Round complete."} message="Good work. You’ve covered some ground." saveError={saveError} onReplay={mode === 'freeplay' ? () => { resetRound(); resetSession(); setRound((value) => value + 1) } : undefined} />
    </div>
  )
}

function restoreQuestionOrder<T extends { code: string }>(generated: T[], saved: unknown, fallback?: (code: string) => T | undefined): T[] {
  if (!Array.isArray(saved)) return generated
  const byCode = new Map(generated.map((question) => [question.code, question]))
  const restored = saved.flatMap((code) => {
    if (typeof code !== 'string') return []
    const question = byCode.get(code) ?? fallback?.(code)
    return question ? [question] : []
  })
  return restored.length === generated.length ? restored : generated
}
