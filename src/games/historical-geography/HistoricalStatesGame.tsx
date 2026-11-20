import { useEffect, useMemo, useState } from 'react'
import { Check, Globe2, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadHistoricalAtlasMaps } from '../../geography/historical/loader'
import type { HistoricalAtlasMap } from '../../geography/historical/types'
import type { GameMode } from '../../geography/types'
import { formatHistoricalDateRange, formatHistoricalYear } from '../../puzzles/historical-geography'
import { createHistoricalStateChoices, createHistoricalStatesDeck, historicalPolityName } from '../../puzzles/historical-states'
import { useGameSession } from '../session'
import './historical-geography.css'
import './historical-flags.css'

type QuestionCount = '10' | 'all'

interface SavedHistoricalStatesProgress {
  version?: unknown
  contentVersion?: unknown
  questionCount?: unknown
  round?: unknown
  index?: unknown
  questionIds?: unknown
  selectedId?: unknown
  score?: unknown
  correct?: unknown
  finished?: unknown
}

const questionCountOptions = [
  { value: '10', label: '10 maps' },
  { value: 'all', label: 'All 41 maps' },
]

export function HistoricalStatesGame({ mode, date, seed }: { mode: GameMode; date: string; seed: string }) {
  const session = useGameSession('historical-states', mode, date, seed)
  const { saveProgress } = session
  const saved = session.progress as SavedHistoricalStatesProgress | null
  const [maps, setMaps] = useState<HistoricalAtlasMap[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [questionCount, setQuestionCount] = useState<QuestionCount>(isQuestionCount(saved?.questionCount) ? saved.questionCount : '10')
  const [round, setRound] = useState(saved && Number.isInteger(saved.round) && Number(saved.round) >= 0 ? Number(saved.round) : 0)
  const [index, setIndex] = useState(saved && Number.isInteger(saved.index) && Number(saved.index) >= 0 ? Number(saved.index) : 0)
  const [selectedId, setSelectedId] = useState(typeof saved?.selectedId === 'string' ? saved.selectedId : '')
  const [score, setScore] = useState(typeof saved?.score === 'number' ? saved.score : 0)
  const [correct, setCorrect] = useState(typeof saved?.correct === 'number' ? saved.correct : 0)
  const [finished, setFinished] = useState(saved?.version === 1 && saved?.contentVersion === 'cliopatria-v0.2.1' && saved?.finished === true)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let active = true
    loadHistoricalAtlasMaps().then((loaded) => { if (active) setMaps(loaded) }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Historical atlas data could not be loaded.')
    })
    return () => { active = false }
  }, [])

  const maxQuestions = questionCount === 'all' ? 41 : 10
  const savedQuestionIdsKey = saved?.version === 1 && saved?.contentVersion === 'cliopatria-v0.2.1'
    && saved?.questionCount === questionCount && saved?.round === round
    && Array.isArray(saved?.questionIds) ? saved.questionIds.filter((id): id is string => typeof id === 'string').join('|') : ''
  const questions = useMemo(() => {
    if (!maps) return []
    const byId = new Map(maps.map((map) => [map.id, map]))
    const restored = savedQuestionIdsKey.split('|').filter(Boolean).map((id) => byId.get(id)).filter((map): map is HistoricalAtlasMap => Boolean(map))
    if (restored.length === maxQuestions) return restored
    return createHistoricalStatesDeck(maps, seed, round, questionCount)
  }, [maps, maxQuestions, savedQuestionIdsKey, seed, round, questionCount])
  const map = questions[index]
  const choices = useMemo(() => map && maps ? createHistoricalStateChoices(maps, map, `${seed}:${round}:${map.id}`) : [], [maps, map, seed, round])

  useEffect(() => {
    if (!maps || !map || selectedId || finished || mode !== 'freeplay') return
    void saveProgress({ version: 1, contentVersion: 'cliopatria-v0.2.1', questionCount, round, index, questionIds: questions.map((item) => item.id), selectedId, score, correct, finished: false })
  }, [maps, map, selectedId, finished, mode, questionCount, round, index, questions, score, correct, saveProgress])

  async function choose(choice: HistoricalAtlasMap) {
    if (!map || selectedId || finished) return
    setSelectedId(choice.id)
    const isCorrect = historicalPolityName(choice) === historicalPolityName(map)
    if (isCorrect) {
      setScore((value) => value + 100)
      setCorrect((value) => value + 1)
    }
    await saveProgress({ version: 1, contentVersion: 'cliopatria-v0.2.1', questionCount, round, index, questionIds: questions.map((item) => item.id), selectedId: choice.id, score: score + (isCorrect ? 100 : 0), correct: correct + (isCorrect ? 1 : 0), finished: false })
  }

  async function continueRound() {
    if (!map || !selectedId || finished) return
    if (index + 1 < questions.length) {
      setIndex((value) => value + 1)
      setSelectedId('')
      return
    }
    setFinished(true)
    await saveProgress({ version: 1, contentVersion: 'cliopatria-v0.2.1', questionCount, round, index, questionIds: questions.map((item) => item.id), selectedId, score, correct, finished: true })
    await session.save(score, correct, questions.length, {
      historicalPuzzleId: `historical-states:${seed}:${round}:v1`,
      contentVersion: 'cliopatria-v0.2.1',
      questionIds: questions.map((item) => item.id),
      correct,
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

  function changeQuestionCount(value: string) {
    if (!isQuestionCount(value)) return
    session.resetSession()
    setQuestionCount(value)
    setRound((current) => current + 1)
    setIndex(0)
    setSelectedId('')
    setScore(0)
    setCorrect(0)
    setFinished(false)
  }

  const settings = mode === 'freeplay' && !finished && <GameSettingsMenu label="Historical states settings"><div className="practice-config">
    <GameSettingSelect label="Set length" value={questionCount} options={questionCountOptions} onChange={changeQuestionCount} />
    <p className="historical-settings-note">The map shows one selected polity in a regional frame. It is not a complete partition of the world or a statement that unshown societies did not exist.</p>
  </div></GameSettingsMenu>

  if (!maps && !loadError) return <div className="game-body historical-geography-game">{settings}<LoadingState label="Opening the historical atlas…" /></div>
  if (loadError) return <div className="game-body historical-geography-game">{settings}<InlineNotice title="Historical states could not open" tone="warning">{loadError} Reconnect to load the atlas so it can be cached for offline play.</InlineNotice></div>
  if (!map || !maps) return <div className="game-body historical-geography-game">{settings}<InlineNotice title="This map set is incomplete" tone="warning">The saved question set could not be restored. Start a new set to continue.</InlineNotice><button className="button button-dark" type="button" onClick={startNewSet}>Start a new set</button></div>

  const answered = Boolean(selectedId)
  const isCorrect = selectedId !== '' && choices.some((choice) => choice.id === selectedId && historicalPolityName(choice) === historicalPolityName(map))
  const answer = historicalPolityName(map)
  const selected = choices.find((choice) => choice.id === selectedId)
  return <div className="game-body historical-geography-game historical-states-game">
    {settings}
    <section className="historical-round" aria-labelledby="historical-states-title">
      <header className="historical-round-heading"><div><span className="eyebrow">Historical states · map {index + 1} of {questions.length}</span><h2 id="historical-states-title">Which polity is shown?</h2><p>Use the regional outline, period and location clue to identify the selected state.</p></div><div className="historical-round-meta"><Globe2 size={15} aria-hidden="true" /><span>{score.toLocaleString('en-US')} points</span></div></header>
      <div className="historical-atlas-clue"><span className="eyebrow">{map.region.name}</span><p>{map.visibleClue}</p></div>
      <StateMapFrame map={map} revealed={answered} />
      {!answered
        ? <div className="historical-state-answers" role="group" aria-label="Polity choices">{choices.map((choice) => {
          const correctChoice = historicalPolityName(choice) === answer
          const selectedChoice = selectedId === choice.id
          return <button key={choice.id} type="button" className={`historical-state-answer${answered && correctChoice ? ' is-correct' : ''}${selectedChoice && !isCorrect ? ' is-wrong' : ''}`} disabled={answered} onClick={() => void choose(choice)}>{historicalPolityName(choice)}{selectedChoice && (isCorrect ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />)}</button>
        })}</div>
        : <>
          <section className={`historical-flag-reveal${isCorrect ? ' is-correct' : ' is-wrong'}`} aria-live="polite" aria-labelledby="historical-state-reveal-title">
            <span className="eyebrow">{isCorrect ? 'Correct · +100 points' : 'The polity is revealed'}</span>
            <h3 id="historical-state-reveal-title">{answer}</h3>
            <p><strong>Source period:</strong> {formatHistoricalDateRange(map.acceptedFromYear, map.acceptedToYear)} · sample frame {formatHistoricalYear(map.sampleYear)}</p>
            <p>{map.historicalContext}</p>
            <p className="historical-flag-reconstruction"><strong>Limits:</strong> {map.uncertainty}</p>
            {selected && !isCorrect && <p className="historical-state-guess"><strong>Your choice:</strong> {historicalPolityName(selected)}.</p>}
            <details className="historical-source-details"><summary>Source and attribution</summary><ul>{map.contextSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}<li><a href="https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.1" target="_blank" rel="noreferrer">Cliopatria v0.2.1 data and documentation</a></li></ul><p>Cliopatria v0.2.1 by the Seshat Global History Databank, CC BY 4.0. Maproom clipped, oriented, simplified and rendered this source polygon. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">License terms</a>.</p></details>
          </section>
          <button className="button button-dark historical-flag-continue" type="button" onClick={() => void continueRound()}>{index + 1 < questions.length ? 'Next map' : 'Finish set'} <Check size={16} aria-hidden="true" /></button>
        </>}
      <div className="historical-attribution historical-atlas-attribution"><span>One selected polity · no complete world partition</span><span>Cliopatria v0.2.1 · CC BY 4.0</span></div>
      <GameResultsDialog complete={finished} gameId="historical-states" mode={mode} score={score} correct={correct} total={questions.length} title="Map set complete" message={`${correct} of ${questions.length} correct · ${score.toLocaleString('en-US')} points.`} saveError={session.saveError || saveError} onReplay={mode === 'freeplay' ? startNewSet : undefined} replayLabel="Study another set" />
    </section>
  </div>
}

function StateMapFrame({ map, revealed }: { map: HistoricalAtlasMap; revealed: boolean }) {
  const [zoom, setZoom] = useState(1)
  const [imageError, setImageError] = useState(false)
  return <>
    <figure className={`historical-map-frame historical-atlas-frame${revealed ? ' is-revealed' : ''}`}>
      <div className="historical-atlas-map-stage" aria-label={`${map.region.name} map. Use the zoom controls to inspect the outline.`}>
        {imageError
          ? <div className="historical-map-fallback" role="img" aria-label="Historical map unavailable"><strong>The map could not be opened.</strong><span>Reconnect to load this map, then it will be available offline.</span></div>
          : <img className="historical-map-image historical-atlas-map-image" src={map.assetUrl} alt={`Unlabeled territorial outline in ${map.region.name}.`} loading="lazy" decoding="async" onError={() => setImageError(true)} style={{ width: `${zoom * 100}%` }} />}
      </div>
      <figcaption className="historical-map-caption"><span>{map.region.name}</span><span>Maproom regional reconstruction</span></figcaption>
    </figure>
    <div className="historical-atlas-zoom" role="group" aria-label="Map zoom controls">
      <button className="button button-outline" type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))}><Minus size={15} aria-hidden="true" /></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button className="button button-outline" type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.5))}><Plus size={15} aria-hidden="true" /></button>
      <button className="button button-outline" type="button" onClick={() => setZoom(1)} disabled={zoom === 1}><RotateCcw size={14} aria-hidden="true" /><span>Reset</span></button>
    </div>
  </>
}

function isQuestionCount(value: unknown): value is QuestionCount { return value === '10' || value === 'all' }
