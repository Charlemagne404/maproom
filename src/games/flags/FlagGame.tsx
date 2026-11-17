import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type SyntheticEvent } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, Settings2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { InlineNotice } from '../../components/Kit'
import type { Country, GeographyData, GameMode } from '../../geography/types'
import { seededShuffle } from '../../puzzles/engine'
import { useGameSession } from '../session'
import { flagAnswerChoices, flagCountryPool, practiceQuestionSequence, shuffleFlagPool, type PracticeQuestionCount } from './questionPool'

type Direction = 'flag-to-country' | 'country-to-flag'
type AnswerStyle = 'choices' | 'typed'

export function FlagGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [round, setRound] = useState(0)
  const [continent, setContinent] = useState('All regions')
  const [direction, setDirection] = useState<Direction>('flag-to-country')
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>('choices')
  const [questionCount, setQuestionCount] = useState<PracticeQuestionCount>('10')
  const [progressive, setProgressive] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsControl = useRef<HTMLDivElement>(null)
  const settingsButton = useRef<HTMLButtonElement>(null)
  const continents = useMemo(() => [...new Set(data.countries.filter((country) => country.flagCode).map((country) => country.continent).filter(Boolean) as string[])].sort(), [data.countries])
  const scopeOptions = ['All regions', ...continents]
  // The daily seed string remains unchanged; practice settings get their own session identity.
  const roundSeed = `${seed}:${round}:${continent}:${direction}:${answerStyle}:${progressive}`
  const sessionSeed = mode === 'daily' ? roundSeed : `${roundSeed}:${questionCount}`

  useEffect(() => {
    if (!settingsOpen) return
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !settingsControl.current?.contains(event.target)) setSettingsOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setSettingsOpen(false)
      settingsButton.current?.focus()
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [settingsOpen])

  function restartRound() {
    setRound((value) => value + 1)
  }

  return (
    <div className="game-body flag-game-body">
      <header className="flag-game-bar">
        <div className="flag-game-bar-left">
          <Link className="flag-game-wordmark" to="/" aria-label="maproom. home">maproom<span>.</span></Link>
          <Link className="flag-all-games" to="/explore"><ArrowLeft size={15} aria-hidden="true" /><span>All games</span></Link>
        </div>
        <div className="flag-game-bar-right">
          <div className="flag-mode-switch" role="group" aria-label="Flag game mode">
            <Link to="/games/flags?mode=daily" className={mode === 'daily' ? 'is-selected' : ''} aria-current={mode === 'daily' ? 'page' : undefined}>Daily</Link>
            <Link to="/games/flags?mode=practice" className={mode === 'practice' ? 'is-selected' : ''} aria-current={mode === 'practice' ? 'page' : undefined}>Practice</Link>
          </div>
          {mode === 'practice' && <div className="flag-settings-control" ref={settingsControl}>
            <button ref={settingsButton} className="flag-settings-button" type="button" aria-label="Practice settings" aria-controls="flag-settings-panel" aria-expanded={settingsOpen} title="Practice settings" onClick={() => setSettingsOpen((open) => !open)}>
              <Settings2 size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {settingsOpen && <div className="flag-settings-panel" id="flag-settings-panel" role="region" aria-label="Practice settings">
              <label><span>Region</span><select value={continent} onChange={(event) => setContinent(event.target.value)}>{scopeOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Direction</span><select value={direction} onChange={(event) => setDirection(event.target.value as Direction)}><option value="flag-to-country">Flag → country</option><option value="country-to-flag">Country → flag</option></select></label>
              {direction === 'flag-to-country' && <label><span>Answer style</span><select value={answerStyle} onChange={(event) => setAnswerStyle(event.target.value as AnswerStyle)}><option value="choices">Multiple choice</option><option value="typed">Type a name</option></select></label>}
              <label><span>Questions</span><select value={questionCount} onChange={(event) => setQuestionCount(event.target.value as PracticeQuestionCount)}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="infinite">Infinite</option></select></label>
              <label className="flag-reveal-setting"><input type="checkbox" checked={progressive} onChange={(event) => setProgressive(event.target.checked)} /><span>Reveal after wrong guesses</span></label>
            </div>}
          </div>}
        </div>
      </header>
      <FlagRound
        key={`${round}:${continent}:${direction}:${answerStyle}:${progressive}:${questionCount}`}
        data={data}
        mode={mode}
        date={date}
        seed={sessionSeed}
        dailySeed={roundSeed}
        continent={continent}
        direction={direction}
        answerStyle={answerStyle}
        questionCount={questionCount}
        progressive={progressive}
        onPlayAgain={restartRound}
      />
    </div>
  )
}

function FlagRound({ data, mode, date, seed, dailySeed, continent, direction, answerStyle, questionCount, progressive, onPlayAgain }: {
  data: GeographyData
  mode: GameMode
  date: string
  seed: string
  dailySeed: string
  continent: string
  direction: Direction
  answerStyle: AnswerStyle
  questionCount: PracticeQuestionCount
  progressive: boolean
  onPlayAgain: () => void
}) {
  const pool = useMemo(() => flagCountryPool(data.countries, continent), [data.countries, continent])
  const dailyQuestions = useMemo(() => seededShuffle(pool, `${dailySeed}:question-order`).slice(0, 8), [pool, dailySeed])
  const [practiceQuestions, setPracticeQuestions] = useState<Country[]>(() => {
    if (mode !== 'practice') return []
    return questionCount === 'infinite'
      ? shuffleFlagPool(pool)
      : practiceQuestionSequence(pool, Number(questionCount))
  })
  const questions = mode === 'daily' ? dailyQuestions : practiceQuestions
  const infinitePractice = mode === 'practice' && questionCount === 'infinite'
  const [index, setIndex] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [locked, setLocked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [resolvedCount, setResolvedCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [reveal, setReveal] = useState(0)
  const [input, setInput] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const playAgainButton = useRef<HTMLButtonElement>(null)
  const viewResultsButton = useRef<HTMLButtonElement>(null)
  const restoreResultsFocus = useRef(false)
  const mounted = useRef(false)
  const advanceTimer = useRef<number | null>(null)
  const advanceQuestion = useRef<(() => void) | null>(null)
  const completionStarted = useRef(false)
  const { save, saveError } = useGameSession('flags', mode, date, seed)
  const question = questions[index]
  const choiceCount = 4
  const choices = useMemo(() => {
    if (!question) return []
    if (mode === 'daily') {
      const distractors = seededShuffle(pool.filter((country) => country.iso3 !== question.iso3), `${dailySeed}:choice:${index}`).slice(0, choiceCount - 1)
      return seededShuffle([question, ...distractors], `${dailySeed}:order:${index}`)
    }
    return flagAnswerChoices(pool, question)
  }, [question, pool, mode, dailySeed, index])
  const suggestions: Suggestion[] = useMemo(() => pool.map((country) => ({ value: country.iso3, label: country.name, aliases: country.aliases })), [pool])
  const accuracy = resolvedCount ? Math.round(correct / resolvedCount * 100) : 0

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
  }, [])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (resultsOpen && !element.open) {
      element.showModal()
      requestAnimationFrame(() => playAgainButton.current?.focus({ preventScroll: true }))
    } else if (!resultsOpen && element.open) {
      element.close()
      if (restoreResultsFocus.current) {
        restoreResultsFocus.current = false
        requestAnimationFrame(() => viewResultsButton.current?.focus({ preventScroll: true }))
      }
    }
  }, [resultsOpen, finished])

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
    setResultsOpen(true)
    const detail = { continent, direction, answerStyle, progressive, ...(mode === 'practice' ? { questionCount } : {}) }
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
        setPracticeQuestions(shuffleFlagPool(pool, Math.random, question))
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
    const delay = answer === question.iso3 ? 900 : 1_400
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
      setMessage('Choose a country from this practice set.')
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
    setResolvedCount((value) => value + 1)
    setLocked(true)
    setMessage(`The answer is ${question.name}.`)
  }

  function dismissResults(event?: SyntheticEvent<HTMLDialogElement>) {
    event?.preventDefault()
    restoreResultsFocus.current = true
    setResultsOpen(false)
  }

  function keepResultsKeyboardFocus(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')]
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (pool.length < choiceCount) return <InlineNotice title="This practice set is too small" tone="warning">Choose a broader region to play a four-choice flag round.</InlineNotice>
  if (!question) return <InlineNotice title="No flags in this set" tone="warning">Choose a different region and try again.</InlineNotice>

  const prompt = direction === 'flag-to-country' ? 'Which country does this flag belong to?' : `Which flag belongs to ${question.name}?`
  const questionLabel = infinitePractice ? `Question ${questionNumber}` : `${String(index + 1).padStart(2, '0')} / ${String(questions.length).padStart(2, '0')}`
  const resultsTitle = mode === 'daily' ? 'Daily flags complete.' : infinitePractice ? 'Practice session complete.' : 'Practice round complete.'

  return (
    <>
      <section className={`flag-round ${direction === 'flag-to-country' ? 'is-flag-to-country' : 'is-country-to-flag'}`} aria-labelledby="flag-question">
        <div className="flag-question-row">
          <h1 id="flag-question">{prompt}</h1>
          <div className="flag-round-utility">
            {!finished
              ? <span className="flag-progress" aria-label={questionLabel} aria-live="polite">{questionLabel}</span>
              : !resultsOpen && <button ref={viewResultsButton} className="flag-view-results" type="button" onClick={() => setResultsOpen(true)}>View results</button>}
          </div>
        </div>
        {infinitePractice && <div className="flag-live-status" aria-live="polite" aria-atomic="true">
          <span><strong>{score.toLocaleString()}</strong> pts</span>
          <span><strong>{correct}</strong> correct</span>
          <span><strong>{accuracy}%</strong> accuracy</span>
          {resolvedCount > 0 && <button className="flag-end-session" type="button" onClick={endInfinitePractice} disabled={locked || finished}>End session</button>}
        </div>}
        {direction === 'flag-to-country' && <div className={`flag-display${reveal ? ' has-reveal' : ''}`}>
          <FlagIcon country={question} size="large" />
          {progressive && reveal > 0 && <div className="flag-cover" aria-hidden="true" style={{ clipPath: `inset(0 0 0 ${Math.min(100, reveal * 34)}%)` }} />}
        </div>}
        {direction === 'country-to-flag' || answerStyle === 'choices' ? (
          <div className={`flag-choice-grid${direction === 'country-to-flag' ? ' image-choice-grid' : ''}`} role="group" aria-label="Choose an answer">
            {choices.map((choice) => <button key={choice.iso3} type="button" className={`flag-choice${answer === choice.iso3 ? (choice.iso3 === question.iso3 ? ' is-right' : ' is-wrong') : ''}`} onClick={() => attempt(choice.iso3)} disabled={locked || finished} aria-pressed={answer === choice.iso3} aria-label={direction === 'country-to-flag' ? `Flag of ${choice.name}` : undefined}>
              {direction === 'country-to-flag' ? <FlagIcon country={choice} /> : <span className="flag-choice-name">{choice.name}</span>}
            </button>)}
          </div>
        ) : <AutocompleteInput id="flag-answer" label="Country name for the flag" placeholder="Type a country name" value={input} onChange={setInput} suggestions={suggestions} onPick={(suggestion) => { setInput(suggestion.label); attempt(suggestion.value) }} onSubmit={() => {
          const match = suggestions.find((item) => [item.label, ...(item.aliases ?? [])].some((name) => name.toLowerCase() === input.trim().toLowerCase()))
          if (match) attempt(match.value)
          else setMessage('Choose an exact country name from the suggestions.')
        }} submitLabel="Answer" disabled={locked || finished} />}
        {message && <div className={`answer-feedback${answer === question.iso3 ? ' is-correct' : locked ? ' is-incorrect' : ''}`} role="status" aria-live="polite" aria-atomic="true">
          <span className="feedback-icon">{answer === question.iso3 ? <Check size={17} /> : reveal > 0 ? <Eye size={16} /> : <EyeOff size={16} />}</span>
          <span>{message}</span>
        </div>}
      </section>
      {finished && <dialog ref={dialog} className="flag-results-dialog" aria-labelledby="flag-results-title" onCancel={dismissResults} onKeyDown={keepResultsKeyboardFocus}>
        <div className="flag-results-topline">
          <span className="eyebrow">{mode === 'daily' ? 'Daily puzzle' : 'Practice'}</span>
          <button className="flag-results-close" type="button" aria-label="Close results" onClick={() => dismissResults()}><X size={18} aria-hidden="true" /></button>
        </div>
        <h2 id="flag-results-title">{resultsTitle}</h2>
        <div className="flag-results-score">{score.toLocaleString()}<span>points</span></div>
        <p className="flag-results-summary">{correct} / {resolvedCount || questions.length} correct · {resolvedCount || questions.length ? Math.round(correct / (resolvedCount || questions.length) * 100) : 0}% accuracy</p>
        <div className="flag-results-actions">
          {mode === 'daily'
            ? <Link className="button button-dark" to="/games/flags?mode=practice">Play practice</Link>
            : <button ref={playAgainButton} className="button button-dark" type="button" onClick={onPlayAgain}>Play again</button>}
          <Link className="button button-outline" to="/statistics">Statistics</Link>
        </div>
        <button className="flag-results-return" type="button" onClick={() => dismissResults()}>Return to the puzzle</button>
        {saveError && <div className="form-message form-message-error" role="alert">{saveError}</div>}
      </dialog>}
    </>
  )
}

function FlagIcon({ country, size }: { country: Country; size?: 'large' }) {
  return <span className={`flag-frame${size === 'large' ? ' flag-frame-large' : ''}`}><span className={`fi fi-${country.flagCode}`} role="img" aria-label={`Flag of ${country.name}`} /></span>
}
