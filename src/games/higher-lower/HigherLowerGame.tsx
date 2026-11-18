import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownUp } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { RoundProgress } from '../../components/RoundProgress'
import { AdvancedGameSettings, GameSettingSelect, GameSettingToggle, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice } from '../../components/Kit'
import type { Country, GameMode, GeographyData } from '../../geography/types'
import { hashSeed } from '../../puzzles/engine'
import { formatCountryMeasure, makeHigherLowerQuestions, type ComparisonDifficulty, type CountryMeasure, type HigherLowerQuestion } from '../../puzzles/higherLower'
import { useGameSession } from '../session'
import { eligibleCountries, initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'
import { useAppData } from '../../app/useAppData'

type CountOption = '10' | '20' | '50' | 'infinite'

export function HigherLowerGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const dailyMeasure: CountryMeasure = (['population', 'area', 'density'] as const)[hashSeed(seed) % 3] ?? 'population'
  const [measure, setMeasure] = useState<CountryMeasure>(mode === 'daily' ? dailyMeasure : 'population')
  const [difficulty, setDifficulty] = useState<ComparisonDifficulty>('standard')
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
  const [scope, setScope] = useState('World')
  const [count, setCount] = useState<CountOption>('10')
  const [timed, setTimed] = useState(false)
  const [round, setRound] = useState(0)
  const countries = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const scopes = useMemo(() => [...new Set(countries.map((country) => country.continent).filter((value): value is string => Boolean(value)))].sort(), [countries])
  return <HigherLowerRound key={`${round}:${measure}:${difficulty}:${scope}:${count}:${timed}:${eligibility}`} countries={countries} mode={mode} date={date} seed={`${seed}:${round}:${measure}:${difficulty}:${scope}:${count}:${timed}:${eligibility}`} measure={measure} difficulty={difficulty} scope={scope} eligibility={eligibility} count={count} timed={timed} scopes={scopes} onMeasure={setMeasure} onDifficulty={setDifficulty} onScope={setScope} onEligibility={setEligibility} onCount={setCount} onTimed={setTimed} onReplay={() => setRound((value) => value + 1)} />
}

function HigherLowerRound({ countries, mode, date, seed, measure, difficulty, scope, eligibility, count, timed, scopes, onMeasure, onDifficulty, onScope, onEligibility, onCount, onTimed, onReplay }: {
  countries: GeographyData['countries']
  mode: GameMode
  date: string
  seed: string
  measure: CountryMeasure
  difficulty: ComparisonDifficulty
  scope: string
  eligibility: GeographyEligibility
  count: CountOption
  timed: boolean
  scopes: string[]
  onMeasure: (value: CountryMeasure) => void
  onDifficulty: (value: ComparisonDifficulty) => void
  onScope: (value: string) => void
  onEligibility: (value: GeographyEligibility) => void
  onCount: (value: CountOption) => void
  onTimed: (value: boolean) => void
  onReplay: () => void
}) {
  const pool = useMemo(() => countries.filter((country) => scope === 'World' || country.continent === scope), [countries, scope])
  const questionCount = mode === 'daily' ? 10 : count === 'infinite' ? 40 : Number(count)
  const [cycle, setCycle] = useState(0)
  const [deck, setDeck] = useState<HigherLowerQuestion[]>(() => makeHigherLowerQuestions(pool, measure, `${seed}:deck:0`, questionCount, difficulty))
  const [index, setIndex] = useState(0)
  const [resolved, setResolved] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [choice, setChoice] = useState<'left' | 'right' | ''>('')
  const [feedback, setFeedback] = useState('')
  const [seconds, setSeconds] = useState(60)
  const [finished, setFinished] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusPromptOnAdvance = useRef(false)
  const infinite = mode === 'freeplay' && count === 'infinite'
  const question = deck[index]
  const { save, saveError } = useGameSession('higher-lower', mode, date, seed)
  const metricLabel = measure === 'population' ? 'population' : measure === 'area' ? 'land area' : 'population density'

  useLayoutEffect(() => {
    if (!focusPromptOnAdvance.current) return
    focusPromptOnAdvance.current = false
    heading.current?.focus({ preventScroll: true })
  }, [index])

  const finishRound = useCallback(async (finalScore = score, finalCorrect = correct, finalTotal = resolved) => {
    if (finished || finalTotal === 0) return
    setFinished(true)
    await save(finalScore, finalCorrect, finalTotal, { measure, difficulty, scope, bestStreak })
  }, [bestStreak, correct, difficulty, finished, measure, resolved, save, scope, score])

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
      if (event.key === 'ArrowLeft') answer('left')
      if (event.key === 'ArrowRight') answer('right')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function answer(side: 'left' | 'right') {
    if (!question || choice || finished) return
    const isCorrect = question.answer === side
    const nextStreak = isCorrect ? streak + 1 : 0
    const earned = isCorrect ? 100 + Math.min(50, streak * 10) : 0
    const nextScore = score + earned
    const nextCorrect = correct + Number(isCorrect)
    const nextResolved = resolved + 1
    setChoice(side)
    setResolved(nextResolved)
    setCorrect(nextCorrect)
    setScore(nextScore)
    setStreak(nextStreak)
    setBestStreak((value) => Math.max(value, nextStreak))
    setFeedback(isCorrect ? `Correct · ${earned} points${nextStreak > 1 ? ` · ${nextStreak} in a row` : ''}.` : `Not quite. ${question.answer === 'left' ? question.left.name : question.right.name} has the higher ${metricLabel}.`)
  }

  const nextQuestion = useCallback(async () => {
    if (index < deck.length - 1) {
      setIndex((value) => value + 1)
      focusPromptOnAdvance.current = true
    }
    else if (infinite) {
      const nextCycle = cycle + 1
      const nextDeck = makeHigherLowerQuestions(pool, measure, `${seed}:deck:${nextCycle}`, 40, difficulty)
      setCycle(nextCycle)
      setDeck(nextDeck)
      setIndex(0)
      focusPromptOnAdvance.current = true
    } else {
      await finishRound()
      return
    }
    setChoice('')
    setFeedback('')
  }, [cycle, deck.length, difficulty, finishRound, index, infinite, measure, pool, seed])

  useEffect(() => {
    if (!choice || finished) return
    const timer = window.setTimeout(() => { void nextQuestion() }, 1_750)
    return () => window.clearTimeout(timer)
  }, [choice, finished, nextQuestion])

  if (!question) return <div className="game-body"><InlineNotice title="No comparisons are available" tone="warning"><span>This measure does not have enough reliable values in the selected scope.</span>{mode === 'freeplay' && <div className="empty-game-actions"><button className="button button-outline" type="button" onClick={() => { onScope('World'); onMeasure('population'); onDifficulty('standard') }}>Use standard world comparisons</button></div>}</InlineNotice></div>
  const setting = mode === 'freeplay' && !finished ? <GameSettingsMenu><div className="practice-config">
    <GameSettingSelect label="Compare" value={measure} options={[{ value: 'population', label: 'Population' }, { value: 'area', label: 'Land area' }, { value: 'density', label: 'Density' }]} onChange={(value) => onMeasure(value as CountryMeasure)} />
    <GameSettingSelect label="Difficulty" value={difficulty} options={[{ value: 'standard', label: 'Standard' }, { value: 'close', label: 'Close calls' }]} onChange={(value) => onDifficulty(value as ComparisonDifficulty)} />
    <GameSettingSelect label="Questions" value={count} options={[{ value: '10', label: '10' }, { value: '20', label: '20' }, { value: '50', label: '50' }, { value: 'infinite', label: 'Infinite' }]} onChange={(value) => onCount(value as CountOption)} />
    <AdvancedGameSettings>
      <GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => onEligibility(value as GeographyEligibility)} />
      <GameSettingSelect label="Scope" value={scope} control="select" options={['World', ...scopes].map((item) => ({ value: item, label: item }))} onChange={onScope} />
      <GameSettingToggle label="60-second round" checked={timed} onChange={onTimed} />
    </AdvancedGameSettings>
  </div></GameSettingsMenu> : null
  const showValues = Boolean(choice)

  return <div className="game-body higher-lower-game-body">
    <div className="question-toolbar"><div><h2 ref={heading} className="higher-lower-prompt" tabIndex={-1}>Which country has the higher {metricLabel}?</h2>{choice && <p className={`higher-lower-response${choice === question.answer ? ' is-correct' : ' is-incorrect'}`} role="status">{feedback}</p>}</div><div className="question-toolbar-tools">{setting}{!infinite && <RoundProgress current={index + 1} total={deck.length} label="comparisons" />}{infinite && <span className="sr-only" role="status" aria-live="polite">Comparison {resolved + 1}</span>}</div></div>
    <div className="higher-lower-live" aria-label={`${score.toLocaleString()} points, current streak ${streak}, best streak ${bestStreak}`}><span>{score.toLocaleString()} pts</span><span>{streak} streak <small>best {bestStreak}</small></span><span>{timed ? `${seconds}s left` : `${correct} correct`}</span>{infinite && resolved > 0 && !finished && <button className="button button-outline" type="button" onClick={() => void finishRound()}>End session</button>}</div>
    <div className="higher-lower-duel" role="group" aria-label={`Compare ${question.left.name} and ${question.right.name}`}>
      <CountryChoice country={question.left} side="left" value={question.leftValue} measure={measure} showValue={showValues} selected={choice === 'left'} correct={question.answer === 'left'} disabled={Boolean(choice) || finished} onChoose={answer} />
      <div className="higher-lower-versus"><ArrowDownUp size={21} /><span>VS</span></div>
      <CountryChoice country={question.right} side="right" value={question.rightValue} measure={measure} showValue={showValues} selected={choice === 'right'} correct={question.answer === 'right'} disabled={Boolean(choice) || finished} onChoose={answer} />
    </div>
    <GameResultsDialog complete={finished} gameId="higher-lower" mode={mode} score={score} correct={correct} total={resolved} title={timed && seconds === 0 ? 'Time is up.' : 'Comparison round complete.'} message={`Best streak: ${bestStreak}. Values use the 2023 country data.`} saveError={saveError} onReplay={mode === 'freeplay' ? onReplay : undefined} replayLabel="Compare more countries" />
  </div>
}

function CountryChoice({ country, side, value, measure, showValue, selected, correct, disabled, onChoose }: {
  country: Country
  side: 'left' | 'right'
  value: number
  measure: CountryMeasure
  showValue: boolean
  selected: boolean
  correct: boolean
  disabled: boolean
  onChoose: (side: 'left' | 'right') => void
}) {
  const valueText = useMemo(() => formatCountryMeasure(value, measure), [value, measure])
  const formatNumber = useMemo(() => valueText, [valueText])
  return <button type="button" className={`higher-lower-country${showValue ? ' is-revealed' : ''}${showValue && correct ? ' is-answer' : ''}${selected && !correct ? ' is-wrong' : ''}`} onClick={() => onChoose(side)} aria-disabled={disabled} aria-label={`Choose ${country.name}${showValue ? `, ${formatNumber}${correct ? ', higher' : ', lower'}` : ''}`}>
    <span className="higher-lower-flag"><span className={`fi fi-${country.flagCode}`} role="img" aria-label={`Flag of ${country.name}`} /></span>
    <strong>{country.name}</strong>
    {showValue && <><span className="higher-lower-value">{formatNumber}</span><small className="higher-lower-outcome">{correct ? 'Higher value' : 'Lower value'}</small></>}
  </button>
}
