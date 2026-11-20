import { useEffect, useMemo, useState } from 'react'
import { Check, Flag, X } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { useAppData } from '../../app/useAppData'
import { loadHistoricalFlags } from '../../geography/historical/loader'
import type { HistoricalFlagEntry } from '../../geography/historical/types'
import type { GameMode } from '../../geography/types'
import { createHistoricalFlagChoices, createHistoricalFlagDeck } from '../../puzzles/historical-flags'
import { useGameSession } from '../session'
import './historical-geography.css'
import './historical-flags.css'

type Format = 'flag-to-polity' | 'polity-to-flag'
type QuestionCount = '10' | 'all'

interface SavedHistoricalFlagsProgress {
  version?: unknown
  contentVersion?: unknown
  format?: unknown
  questionCount?: unknown
  round?: unknown
  index?: unknown
  questionIds?: unknown
  selectedId?: unknown
  score?: unknown
  correct?: unknown
  finished?: unknown
}

const formatOptions = [
  { value: 'flag-to-polity', label: 'Identify the polity' },
  { value: 'polity-to-flag', label: 'Find the flag' },
]
const countOptions = [
  { value: '10', label: '10 questions' },
  { value: 'all', label: 'All 20 flags' },
]

export function HistoricalFlagsGame({ mode, date, seed }: { mode: GameMode; date: string; seed: string }) {
  const { ready } = useAppData()
  const session = useGameSession('historical-flags', mode, date, seed)
  const { saveProgress } = session
  const saved = session.progress as SavedHistoricalFlagsProgress | null
  const [items, setItems] = useState<HistoricalFlagEntry[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [format, setFormat] = useState<Format>(isFormat(saved?.format) ? saved.format : 'flag-to-polity')
  const [questionCount, setQuestionCount] = useState<QuestionCount>(isQuestionCount(saved?.questionCount) ? saved.questionCount : '10')
  const [round, setRound] = useState(saved && Number.isInteger(saved.round) && Number(saved.round) >= 0 ? Number(saved.round) : 0)
  const [index, setIndex] = useState(saved && Number.isInteger(saved.index) && Number(saved.index) >= 0 ? Number(saved.index) : 0)
  const [selectedId, setSelectedId] = useState(typeof saved?.selectedId === 'string' ? saved.selectedId : '')
  const [score, setScore] = useState(typeof saved?.score === 'number' ? saved.score : 0)
  const [correct, setCorrect] = useState(typeof saved?.correct === 'number' ? saved.correct : 0)
  const [finished, setFinished] = useState(saved?.version === 1 && saved?.contentVersion === 'historical-flags-v1' && saved?.finished === true)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let active = true
    loadHistoricalFlags().then((loaded) => { if (active) setItems(loaded) }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Historical flag data could not be loaded.')
    })
    return () => { active = false }
  }, [])

  const maxQuestions = questionCount === 'all' ? 20 : 10
  const savedQuestionIdsKey = saved?.version === 1 && saved?.contentVersion === 'historical-flags-v1'
    && saved?.format === format && saved?.questionCount === questionCount && saved?.round === round
    && Array.isArray(saved?.questionIds) ? saved.questionIds.filter((id): id is string => typeof id === 'string').join('|') : ''
  const questions = useMemo(() => {
    if (!items) return []
    const byId = new Map(items.map((item) => [item.id, item]))
    const restored = savedQuestionIdsKey.split('|').filter(Boolean).map((id) => byId.get(id)).filter((item): item is HistoricalFlagEntry => Boolean(item))
    if (restored.length === maxQuestions) return restored
    return createHistoricalFlagDeck(items, `${seed}:${format}`, round, questionCount)
  }, [items, maxQuestions, savedQuestionIdsKey, seed, round, format, questionCount])
  const question = questions[index]
  const choices = useMemo(() => question && items ? createHistoricalFlagChoices(items, question, `${seed}:${round}:${question.id}:${format}`) : [], [items, question, seed, round, format])

  useEffect(() => {
    if (!ready || !items || !question || selectedId || finished || mode !== 'freeplay') return
    void saveProgress({ version: 1, contentVersion: 'historical-flags-v1', format, questionCount, round, index, questionIds: questions.map((item) => item.id), selectedId, score, correct, finished: false })
  }, [ready, items, question, selectedId, finished, mode, format, questionCount, round, index, questions, score, correct, saveProgress])

  async function choose(choice: HistoricalFlagEntry) {
    if (!question || selectedId || finished) return
    setSelectedId(choice.id)
    const isCorrect = choice.entity === question.entity
    if (isCorrect) {
      setScore((value) => value + 100)
      setCorrect((value) => value + 1)
    }
    await saveProgress({ version: 1, contentVersion: 'historical-flags-v1', format, questionCount, round, index, questionIds: questions.map((item) => item.id), selectedId: choice.id, score: score + (isCorrect ? 100 : 0), correct: correct + (isCorrect ? 1 : 0), finished: false })
  }

  async function continueRound() {
    if (!question || !selectedId || finished) return
    if (index + 1 < questions.length) {
      setIndex((value) => value + 1)
      setSelectedId('')
      return
    }
    setFinished(true)
    const finalScore = score
    const finalCorrect = correct
    await saveProgress({ version: 1, contentVersion: 'historical-flags-v1', format, questionCount, round, index, questionIds: questions.map((item) => item.id), selectedId, score: finalScore, correct: finalCorrect, finished: true })
    await session.save(finalScore, finalCorrect, questions.length, {
      historicalPuzzleId: `historical-flags:${seed}:${round}:v1`,
      contentVersion: 'historical-flags-v1',
      format,
      questionIds: questions.map((item) => item.id),
      correct: finalCorrect,
      total: questions.length,
    })
    setSaveError(session.saveError)
  }

  function startNewSet() {
    session.resetSession()
    setRound((value) => value + 1)
    setIndex(0)
    setSelectedId('')
    setScore(0)
    setCorrect(0)
    setFinished(false)
  }

  function changeFormat(value: string) {
    if (!isFormat(value)) return
    session.resetSession()
    setFormat(value)
    resetLocalSet()
  }

  function changeQuestionCount(value: string) {
    if (!isQuestionCount(value)) return
    session.resetSession()
    setQuestionCount(value)
    resetLocalSet()
  }

  function resetLocalSet() {
    setRound((value) => value + 1)
    setIndex(0)
    setSelectedId('')
    setScore(0)
    setCorrect(0)
    setFinished(false)
  }

  const settings = mode === 'freeplay' && !finished && <GameSettingsMenu label="Historical flag settings"><div className="practice-config">
    <GameSettingSelect label="Format" value={format} options={formatOptions} onChange={changeFormat} />
    <GameSettingSelect label="Questions" value={questionCount} options={countOptions} onChange={changeQuestionCount} />
    <p className="historical-settings-note">Every flag has an individual historical source and date range. Reconstructed details are labeled in the reveal.</p>
  </div></GameSettingsMenu>

  if (!ready || (!items && !loadError)) return <div className="game-body historical-geography-game">{settings}<LoadingState label="Opening the historical flag collection…" /></div>
  if (loadError) return <div className="game-body historical-geography-game">{settings}<InlineNotice title="The historical flags could not open" tone="warning">{loadError}</InlineNotice></div>
  if (!question || !items) return <div className="game-body historical-geography-game">{settings}<InlineNotice title="This flag set is incomplete" tone="warning">The saved question set could not be restored. Choose a new set to continue.</InlineNotice><button className="button button-dark" type="button" onClick={startNewSet}>Start a new set</button></div>

  const answered = Boolean(selectedId)
  const isCorrect = selectedId !== '' && choices.some((item) => item.id === selectedId && item.entity === question.entity)
  return <div className="game-body historical-geography-game historical-flags-game">
    {settings}
    <section className="historical-round" aria-labelledby="historical-flags-title">
      <header className="historical-round-heading"><div><span className="eyebrow">Historical flags · question {index + 1} of {questions.length}</span><h2 id="historical-flags-title">{format === 'flag-to-polity' ? 'Who used this flag?' : 'Find the period flag'}</h2><p>Match a sourced flag to the polity and period it represents.</p></div><div className="historical-round-meta"><Flag size={15} aria-hidden="true" /><span>{score.toLocaleString('en-US')} points</span></div></header>
      {format === 'flag-to-polity' ? <figure className="historical-flag-prompt"><img src={question.assetUrl} alt={`Historical flag: ${question.flagName}, used ${question.periodLabel}.`} /><figcaption>{question.periodLabel} · {question.region}</figcaption></figure>
        : <div className="historical-flag-polity-prompt"><span className="eyebrow">{question.region} · {question.periodLabel}</span><h3>{question.entity}</h3><p>Choose the documented flag or standard associated with this political entity.</p></div>}
      {format === 'flag-to-polity'
        ? <div className="historical-flag-answers" role="group" aria-label="Polity answer choices">{choices.map((choice) => {
          const correctChoice = choice.entity === question.entity
          const selectedChoice = selectedId === choice.id
          return <button key={choice.id} type="button" className={`historical-flag-answer${answered && correctChoice ? ' is-correct' : ''}${selectedChoice && !isCorrect ? ' is-wrong' : ''}`} disabled={answered} onClick={() => void choose(choice)}>{choice.entity}{selectedChoice && (isCorrect ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />)}</button>
        })}</div>
        : <div className="historical-flag-image-answers" role="group" aria-label="Flag answer choices">{choices.map((choice, choiceIndex) => {
          const correctChoice = choice.entity === question.entity
          const selectedChoice = selectedId === choice.id
          return <button key={choice.id} type="button" className={`historical-flag-image-answer${answered && correctChoice ? ' is-correct' : ''}${selectedChoice && !isCorrect ? ' is-wrong' : ''}`} aria-label={`Flag option ${choiceIndex + 1}`} disabled={answered} onClick={() => void choose(choice)}><img src={choice.assetUrl} alt={`Flag option ${choiceIndex + 1}`} loading="lazy" decoding="async" /><span>Option {choiceIndex + 1}</span></button>
        })}</div>}
      {answered && <>
        <section className={`historical-flag-reveal${isCorrect ? ' is-correct' : ' is-wrong'}`} aria-live="polite" aria-labelledby="historical-flag-reveal-title">
          <span className="eyebrow">{isCorrect ? 'Correct · +100 points' : 'The answer is revealed'}</span>
          <h3 id="historical-flag-reveal-title">{question.entity}</h3>
          <p><strong>{question.flagName}</strong> · {question.periodLabel} · {question.entityType}</p>
          <p>{question.explanation}</p>
          <p className="historical-flag-clue"><strong>Visible clue:</strong> {question.visibleClue}</p>
          {question.designStatus === 'reconstructed' && <p className="historical-flag-reconstruction"><strong>Reconstruction note:</strong> {question.artworkNote}</p>}
          <details className="historical-source-details"><summary>Sources and artwork attribution</summary><ul>{[question.source, ...(question.additionalSources ?? [])].map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul><p>{question.artworkAttribution} <a href={question.artworkLicenseUrl} target="_blank" rel="noreferrer">Artwork license</a>.</p></details>
        </section>
        <button className="button button-dark historical-flag-continue" type="button" onClick={() => void continueRound()}>{index + 1 < questions.length ? 'Next flag' : 'Finish set'} <Check size={16} aria-hidden="true" /></button>
      </>}
      <div className="historical-attribution historical-atlas-attribution"><span>Maproom historical flag learning set · {items.length} entries</span><span>Redrawn vector artwork · CC BY 4.0</span></div>
      <GameResultsDialog complete={finished} gameId="historical-flags" mode={mode} score={score} correct={correct} total={questions.length} title="Flag set complete" message={`${correct} of ${questions.length} correct · ${score.toLocaleString('en-US')} points.`} saveError={session.saveError || saveError} onReplay={mode === 'freeplay' ? startNewSet : undefined} replayLabel="Study another set" />
    </section>
  </div>
}

function isFormat(value: unknown): value is Format { return value === 'flag-to-polity' || value === 'polity-to-flag' }
function isQuestionCount(value: unknown): value is QuestionCount { return value === '10' || value === 'all' }
