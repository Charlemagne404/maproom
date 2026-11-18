import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { InlineNotice } from '../../components/Kit'
import { GameResultsDialog } from '../../components/GameResults'
import { RoundProgress } from '../../components/RoundProgress'
import { AdvancedGameSettings, GameSettingSelect, GameSettingToggle, GameSettingsMenu } from '../../components/GameControls'
import { useFreePlayFormat } from '../../components/FreePlaySetupContext'
import type { Country, GeographyData, GameMode } from '../../geography/types'
import { seededShuffle } from '../../puzzles/engine'
import { useAppData } from '../../app/useAppData'
import { missedCountryCodes } from '../../statistics/mistakes'
import { useGameSession } from '../session'
import { adaptiveFlagQuestionSequence, flagAnswerChoices, flagCountryPool, type PracticeQuestionCount } from './questionPool'
import { initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'
import './FlagGame.css'

type Direction = 'flag-to-country' | 'country-to-flag'
type AnswerStyle = 'choices' | 'typed'

export function FlagGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const selectedFormat = useFreePlayFormat()
  const [round, setRound] = useState(0)
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
  const [continent, setContinent] = useState('All regions')
  const direction: Direction = mode === 'daily' || selectedFormat !== 'country-to-flag' ? 'flag-to-country' : 'country-to-flag'
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>('choices')
  const [questionCount, setQuestionCount] = useState<PracticeQuestionCount>('10')
  const [progressive, setProgressive] = useState(false)
  const [reviewMissed, setReviewMissed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const missedCodes = useMemo(() => missedCountryCodes(state.history, 'flags'), [state.history])
  const continents = useMemo(() => [...new Set(flagCountryPool(data.countries, 'All regions', eligibility).map((country) => country.continent).filter((value): value is string => Boolean(value)))].sort(), [data.countries, eligibility])
  const scopeOptions = ['All regions', ...continents]
  // The daily seed string remains unchanged; practice settings get their own session identity.
  const roundSeed = mode === 'daily'
    ? `${seed}:${round}:${continent}:${direction}:${answerStyle}:${progressive}:${eligibility}`
    : `${seed}:${round}:${continent}:${direction}:${answerStyle}:${progressive}:${reviewMissed}:${eligibility}`
  const sessionSeed = mode === 'daily' ? roundSeed : `${roundSeed}:${questionCount}`

  function restartRound() {
    setRound((value) => value + 1)
  }

  const settingsControl = mode === 'freeplay' ? <GameSettingsMenu open={settingsOpen} onOpenChange={setSettingsOpen}><div className="practice-config flag-settings-config">
    <GameSettingSelect label="Region" value={continent} control="select" options={scopeOptions.map((item) => ({ value: item, label: item }))} onChange={setContinent} />
    {direction === 'flag-to-country' && <GameSettingSelect label="Answer style" value={answerStyle} options={[{ value: 'choices', label: 'Multiple choice' }, { value: 'typed', label: 'Type a name' }]} onChange={(value) => setAnswerStyle(value as AnswerStyle)} />}
    <GameSettingSelect label="Questions" value={questionCount} options={[{ value: '10', label: '10' }, { value: '20', label: '20' }, { value: '50', label: '50' }, { value: 'infinite', label: 'Infinite' }]} onChange={(value) => setQuestionCount(value as PracticeQuestionCount)} />
    <GameSettingToggle label="Reveal after wrong guesses" checked={progressive} onChange={setProgressive} />
    <AdvancedGameSettings>
      <GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => setEligibility(value as GeographyEligibility)} />
      {missedCodes.length > 0 && <GameSettingToggle label="Review previously missed flags first" checked={reviewMissed} onChange={setReviewMissed} />}
    </AdvancedGameSettings>
  </div></GameSettingsMenu> : null

  return (
    <div className="game-body flag-game-body flag-study-game-body">
      <FlagRound
        key={`${round}:${continent}:${direction}:${answerStyle}:${progressive}:${reviewMissed}:${questionCount}:${eligibility}`}
        data={data}
        mode={mode}
        date={date}
        seed={sessionSeed}
        dailySeed={roundSeed}
        continent={continent}
        eligibility={eligibility}
        direction={direction}
        answerStyle={answerStyle}
        questionCount={questionCount}
        progressive={progressive}
        reviewMissed={reviewMissed}
        missedCodes={missedCodes}
        settingsControl={settingsControl}
        onPlayAgain={restartRound}
      />
    </div>
  )
}

function FlagRound({ data, mode, date, seed, dailySeed, continent, eligibility, direction, answerStyle, questionCount, progressive, reviewMissed, missedCodes, settingsControl, onPlayAgain }: {
  data: GeographyData
  mode: GameMode
  date: string
  seed: string
  dailySeed: string
  continent: string
  eligibility: GeographyEligibility
  direction: Direction
  answerStyle: AnswerStyle
  questionCount: PracticeQuestionCount
  progressive: boolean
  reviewMissed: boolean
  missedCodes: string[]
  settingsControl: ReactNode
  onPlayAgain: () => void
}) {
  const session = useGameSession('flags', mode, date, seed)
  const progress = mode === 'daily' ? session.progress : null
  const readNumber = (key: string, fallback: number) => typeof progress?.[key] === 'number' ? progress[key] as number : fallback
  const readString = (key: string, fallback: string) => typeof progress?.[key] === 'string' ? progress[key] as string : fallback
  const readBoolean = (key: string, fallback: boolean) => typeof progress?.[key] === 'boolean' ? progress[key] as boolean : fallback
  const pool = useMemo(() => flagCountryPool(data.countries, continent, eligibility), [data.countries, continent, eligibility])
  const dailyQuestions = useMemo(() => {
    const generated = seededShuffle(pool, `${dailySeed}:question-order`).slice(0, 8)
    if (!Array.isArray(progress?.questionCodes)) return generated
    const byCode = new Map(data.countries.map((country) => [country.iso3, country]))
    const restored = progress.questionCodes.flatMap((code) => typeof code === 'string' && byCode.has(code) ? [byCode.get(code)!] : [])
    return restored.length === generated.length ? restored : generated
  }, [pool, dailySeed, progress, data.countries])
  const dailyChoiceCodes = useMemo(() => {
    if (Array.isArray(progress?.choiceCodes)) {
      const known = new Set(data.countries.map((country) => country.iso3))
      const restored = progress.choiceCodes.map((values) => Array.isArray(values) ? values.filter((code): code is string => typeof code === 'string' && known.has(code)) : [])
      if (restored.length === dailyQuestions.length && restored.every((codes, index) => codes.length === 4 && codes.includes(dailyQuestions[index]!.iso3))) return restored
    }
    return dailyQuestions.map((question, questionIndex) => {
    const distractors = seededShuffle(pool.filter((country) => country.iso3 !== question.iso3), `${dailySeed}:choice:${questionIndex}`).slice(0, 3)
    return seededShuffle([question, ...distractors], `${dailySeed}:order:${questionIndex}`).map((country) => country.iso3)
    })
  }, [dailyQuestions, pool, dailySeed, progress, data.countries])
  const [practiceQuestions, setPracticeQuestions] = useState<Country[]>(() => {
    if (mode !== 'freeplay') return []
    return adaptiveFlagQuestionSequence(pool, reviewMissed ? missedCodes : [], questionCount === 'infinite' ? 40 : Number(questionCount))
  })
  const questions = mode === 'daily' ? dailyQuestions : practiceQuestions
  const infinitePractice = mode === 'freeplay' && questionCount === 'infinite'
  const [index, setIndex] = useState(() => readNumber('index', 0))
  const [questionNumber, setQuestionNumber] = useState(() => readNumber('questionNumber', 1))
  const [locked, setLocked] = useState(() => readBoolean('locked', false))
  const [finished, setFinished] = useState(() => readBoolean('finished', false))
  const [answer, setAnswer] = useState(() => readString('answer', ''))
  const [message, setMessage] = useState(() => readString('message', ''))
  const [correct, setCorrect] = useState(() => readNumber('correct', 0))
  const [score, setScore] = useState(() => readNumber('score', 0))
  const [resolvedCount, setResolvedCount] = useState(() => readNumber('resolvedCount', 0))
  const [wrongCount, setWrongCount] = useState(() => readNumber('wrongCount', 0))
  const [missedQuestions, setMissedQuestions] = useState<string[]>(() => Array.isArray(progress?.missedQuestions) ? progress.missedQuestions.filter((item): item is string => typeof item === 'string') : [])
  const [reveal, setReveal] = useState(() => readNumber('reveal', 0))
  const [input, setInput] = useState(() => readString('input', ''))
  const mounted = useRef(false)
  const advanceTimer = useRef<number | null>(null)
  const advanceQuestion = useRef<(() => void) | null>(null)
  const completionStarted = useRef(false)
  const { save, saveError, saveProgress } = session
  const question = questions[index]
  const choiceCount = 4
  const choices = useMemo(() => {
    if (!question) return []
    if (mode === 'daily') {
      const savedChoiceCodes = progress?.choiceCodes
      if (Array.isArray(savedChoiceCodes) && Array.isArray(savedChoiceCodes[index])) {
        const byCode = new Map(data.countries.map((country) => [country.iso3, country]))
        const restored = (savedChoiceCodes[index] as unknown[]).flatMap((code) => typeof code === 'string' && byCode.has(code) ? [byCode.get(code)!] : [])
        if (restored.length === choiceCount && restored.some((country) => country.iso3 === question.iso3)) return restored
      }
      const distractors = seededShuffle(pool.filter((country) => country.iso3 !== question.iso3), `${dailySeed}:choice:${index}`).slice(0, choiceCount - 1)
      return seededShuffle([question, ...distractors], `${dailySeed}:order:${index}`)
    }
    return flagAnswerChoices(pool, question)
  }, [question, pool, mode, dailySeed, index, progress, data.countries])
  const suggestions: Suggestion[] = useMemo(() => pool.map((country) => ({ value: country.iso3, label: country.name, aliases: country.aliases })), [pool])
  const accuracy = resolvedCount ? Math.round(correct / resolvedCount * 100) : 0

  useEffect(() => {
    if (mode !== 'daily' || finished) return
    void saveProgress({ index, questionNumber, locked, finished, answer, message, correct, score, resolvedCount, wrongCount, missedQuestions, reveal, input, questionCodes: dailyQuestions.map((item) => item.iso3), choiceCodes: dailyChoiceCodes })
  }, [mode, finished, index, questionNumber, locked, answer, message, correct, score, resolvedCount, wrongCount, missedQuestions, reveal, input, dailyQuestions, dailyChoiceCodes, saveProgress])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
  }, [])

  function clearAnswerState() {
    setLocked(false)
    setAnswer('')
    setMessage('')
    setWrongCount(0)
    setReveal(0)
    setInput('')
  }

  function finishRound(total: number) {
    if (completionStarted.current) return
    completionStarted.current = true
    setFinished(true)
    const detail = { continent, direction, answerStyle, progressive, missedCountries: missedQuestions, ...(mode === 'freeplay' ? { questionCount, reviewMissed } : {}) }
    void save(score, correct, total, detail)
  }

  function endInfinitePractice() {
    if (!infinitePractice || finished || locked || resolvedCount === 0) return
    finishRound(resolvedCount)
  }

  function nextQuestion() {
    if (infinitePractice) {
      if (index < questions.length - 1) {
        setIndex((value) => value + 1)
      } else {
        setPracticeQuestions(adaptiveFlagQuestionSequence(pool, reviewMissed ? missedCodes : [], 40, Math.random, question))
        setIndex(0)
      }
      setQuestionNumber((value) => value + 1)
      clearAnswerState()
      return
    }
    if (index < questions.length - 1) {
      setIndex((value) => value + 1)
      clearAnswerState()
      return
    }
    finishRound(questions.length)
  }
  useEffect(() => {
    advanceQuestion.current = nextQuestion
  })

  useEffect(() => {
    if (!locked || !answer || finished || !question) return
    const delay = answer === question.iso3 ? 1_250 : 1_750
    const timer = window.setTimeout(() => {
      advanceTimer.current = null
      if (mounted.current) advanceQuestion.current?.()
    }, delay)
    advanceTimer.current = timer
    return () => {
      window.clearTimeout(timer)
      if (advanceTimer.current === timer) advanceTimer.current = null
    }
  }, [answer, finished, index, locked, question])

  function attempt(code: string) {
    if (locked || finished || !question) return
    if (!pool.some((country) => country.iso3 === code)) {
      setMessage('Choose a country from this flag set.')
      return
    }
    setAnswer(code)
    setInput('')
    if (code === question.iso3) {
      setCorrect((value) => value + 1)
      setScore((value) => value + 100)
      setResolvedCount((value) => value + 1)
      setLocked(true)
      setMessage(`Correct. That flag belongs to ${question.name}.`)
      return
    }
    const errors = wrongCount + 1
    setWrongCount(errors)
    if (progressive && errors < 3) {
      setReveal(errors)
      setMessage('Not quite. A little more of the flag is revealed; try once more.')
      return
    }
    setMissedQuestions((current) => current.includes(question.iso3) ? current : [...current, question.iso3])
    setResolvedCount((value) => value + 1)
    setLocked(true)
    setMessage(`The answer is ${question.name}.`)
  }

  if (pool.length < choiceCount) return <InlineNotice title="This flag set is too small" tone="warning">Choose a broader region to play a four-choice flag round.</InlineNotice>
  if (!question) return <InlineNotice title="No flags in this set" tone="warning">Choose a different region and try again.</InlineNotice>

  const prompt = direction === 'flag-to-country' ? 'Which country does this flag belong to?' : `Which flag belongs to ${question.name}?`
  const resultsTitle = mode === 'daily' ? 'Daily flags complete.' : infinitePractice ? 'Free play session complete.' : 'Free play round complete.'

  return (
    <>
      <section className={`flag-round ${direction === 'flag-to-country' ? 'is-flag-to-country' : 'is-country-to-flag'}`} aria-labelledby="flag-question">
        <div className="flag-question-row">
          <h1 id="flag-question">{prompt}</h1>
          <div className="flag-round-utility">
            {!infinitePractice && <RoundProgress current={index + 1} total={questions.length} label="flags" />}
            {infinitePractice && <span className="sr-only" role="status" aria-live="polite">Flag {questionNumber}</span>}
            {!finished && settingsControl}
          </div>
        </div>
        {infinitePractice && <div className="flag-live-status" aria-live="polite" aria-atomic="true">
          <span><strong>{score.toLocaleString()}</strong> pts</span>
          <span><strong>{correct}</strong> correct</span>
          <span><strong>{accuracy}%</strong> accuracy</span>
          {resolvedCount > 0 && <button className="flag-end-session" type="button" onClick={endInfinitePractice} disabled={locked || finished}>End session</button>}
        </div>}
        {direction === 'flag-to-country' && <div className={`flag-display${reveal ? ' has-reveal' : ''}`}>
          <FlagIcon country={question} size="large" accessibleLabel={locked ? `Flag of ${question.name}` : 'National flag to identify'} />
          {progressive && reveal > 0 && <div className="flag-cover" aria-hidden="true" style={{ clipPath: `inset(0 0 0 ${Math.min(100, reveal * 34)}%)` }} />}
        </div>}
        {direction === 'country-to-flag' || answerStyle === 'choices' ? (
          <div className={`flag-choice-grid${direction === 'country-to-flag' ? ' image-choice-grid' : ''}`} role="group" aria-label="Choose an answer">
            {choices.map((choice, choiceIndex) => {
              const selectedWrong = answer === choice.iso3 && choice.iso3 !== question.iso3
              const correctReveal = locked && choice.iso3 === question.iso3
              const stateClass = correctReveal ? ' is-right' : selectedWrong ? ' is-wrong' : ''
              const stateLabel = locked
                ? choice.iso3 === question.iso3 ? ', correct answer' : selectedWrong ? ', incorrect selection' : ''
                : ''
              return <button key={choiceIndex} type="button" className={`flag-choice${stateClass}`} onClick={() => attempt(choice.iso3)} aria-disabled={locked || finished} aria-pressed={answer === choice.iso3} aria-label={direction === 'country-to-flag' ? `Flag choice ${choiceIndex + 1}${stateLabel}` : `${choice.name}${stateLabel}`}>
                {direction === 'country-to-flag' ? <FlagIcon country={choice} accessibleLabel={locked ? `Flag of ${choice.name}` : `Unidentified flag choice ${choiceIndex + 1}`} /> : <span className="flag-choice-name">{choice.name}</span>}
                {(correctReveal || selectedWrong) && <span className="flag-answer-mark" aria-hidden="true">{correctReveal ? <Check size={18} /> : <X size={18} />}</span>}
              </button>
            })}
          </div>
        ) : <AutocompleteInput id="flag-answer" label="Country name for the flag" placeholder="Type a country name" value={input} onChange={setInput} suggestions={suggestions} onPick={(suggestion) => { setInput(suggestion.label); attempt(suggestion.value) }} onSubmit={() => {
          const match = suggestions.find((item) => [item.label, ...(item.aliases ?? [])].some((name) => name.toLowerCase() === input.trim().toLowerCase()))
          if (match) attempt(match.value)
          else setMessage('Choose an exact country name from the suggestions.')
        }} submitLabel="Answer" disabled={locked || finished} retainFocusWhenDisabled />}
        {locked && direction === 'flag-to-country' && answerStyle === 'typed' && <div className={`flag-typed-feedback${answer === question.iso3 ? ' is-right' : ' is-wrong'}`} aria-hidden="true">{answer === question.iso3 ? <Check size={17} /> : <X size={17} />}<strong>{answer === question.iso3 ? 'Correct' : `Answer: ${question.name}`}</strong></div>}
        {message && <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</span>}
      </section>
      <GameResultsDialog complete={finished} gameId="flags" mode={mode} score={score} correct={correct} total={infinitePractice ? resolvedCount : questions.length} title={resultsTitle} message="A good eye for the flag." saveError={saveError} onReplay={mode === 'freeplay' ? onPlayAgain : undefined} />
    </>
  )
}

function FlagIcon({ country, size, accessibleLabel }: { country: Country; size?: 'large'; accessibleLabel: string }) {
  return <span className={`flag-frame${size === 'large' ? ' flag-frame-large' : ''}`}><span className={`fi fi-${country.flagCode}`} role="img" aria-label={accessibleLabel} /></span>
}
