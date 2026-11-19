import { useEffect, useMemo, useRef, useState } from 'react'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { GameResultsDialog } from '../../components/GameResults'
import { InlineNotice, LoadingState } from '../../components/Kit'
import type { GeographyData, GameMode } from '../../geography/types'
import { useGameSession } from '../session'
import { loadWatershedMatchData, type WatershedMatchData, type WatershedUnitProperties } from './data'
import { createWatershedMatchDeck, scoreWatershedMatchAnswer, WATERSHED_POINTS_PER_QUESTION, WATERSHED_MATCH_ROUNDS, type WatershedQuestion } from './puzzle'
import './watershed-match.css'

const MAP_WIDTH = 760
const MAP_HEIGHT = 400

interface SavedWatershedProgress {
  setIndex?: unknown
  round?: unknown
  selected?: unknown
  answers?: unknown
  finished?: unknown
}

interface WatershedMapShape {
  id: string
  name: string
  path: string
  x: number
  y: number
  optionIndex: number
}

export function WatershedMatchGame({ mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [data, setData] = useState<WatershedMatchData | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    loadWatershedMatchData().then((loaded) => {
      if (active) setData(loaded)
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'The watershed sample could not be loaded.')
    })
    return () => { active = false }
  }, [])

  if (loadError) return <div className="game-body"><InlineNotice title="The watershed map could not open" tone="warning">{loadError}</InlineNotice></div>
  if (!data) return <LoadingState label="Opening the watershed map…" />
  return <WatershedMatchRound data={data} mode={mode} date={date} seed={seed} />
}

function WatershedMatchRound({ data, mode, date, seed }: { data: WatershedMatchData; mode: GameMode; date: string; seed: string }) {
  const session = useGameSession('watershed-match', mode, date, seed)
  const { resetSession, save, saveError, saveProgress } = session
  const saved = session.progress as SavedWatershedProgress | null
  const [setIndex, setSetIndex] = useState(() => readIndex(saved?.setIndex))
  const deck = useMemo(() => createWatershedMatchDeck(data.questions, seed, setIndex), [data.questions, seed, setIndex])
  const restoredAnswers = useMemo(() => restoreAnswers(saved?.answers, deck), [deck, saved?.answers])
  const [answers, setAnswers] = useState<string[]>(restoredAnswers)
  const [round, setRound] = useState(() => Math.min(readIndex(saved?.round), restoredAnswers.length, WATERSHED_MATCH_ROUNDS - 1))
  const [selected, setSelected] = useState<string | null>(() => restoreSelected(saved?.selected, deck, restoredAnswers))
  const [finished, setFinished] = useState(() => saved?.finished === true && restoredAnswers.length === WATERSHED_MATCH_ROUNDS)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const question = deck[round]
  const currentAnswer = answers[round]
  const correctCount = answers.reduce((count, answer, index) => count + Number(deck[index] && scoreWatershedMatchAnswer(deck[index]!, answer) > 0), 0)
  const score = correctCount * WATERSHED_POINTS_PER_QUESTION
  const shapes = useMemo(() => question ? makeMapShapes(data, question) : [], [data, question])

  useEffect(() => {
    if (finished) return
    void saveProgress({ version: 1, setIndex, round, selected, answers, finished: false })
  }, [answers, finished, round, saveProgress, selected, setIndex])

  useEffect(() => {
    if (currentAnswer) feedbackRef.current?.focus({ preventScroll: true })
  }, [currentAnswer])

  async function checkAnswer() {
    if (!question || !selected || currentAnswer || finished) return
    const nextAnswers = [...answers.slice(0, round), selected]
    setAnswers(nextAnswers)
    if (round === WATERSHED_MATCH_ROUNDS - 1) {
      const finalCorrect = nextAnswers.reduce((count, answer, index) => count + Number(scoreWatershedMatchAnswer(deck[index]!, answer) > 0), 0)
      const detail = deck.map((item, index) => ({ sourceId: item.sourceId, downstreamId: item.answerId, selectedId: nextAnswers[index], correct: nextAnswers[index] === item.answerId }))
      setFinished(true)
      await saveProgress({ version: 1, setIndex, round, selected, answers: nextAnswers, finished: true })
      await save(finalCorrect * WATERSHED_POINTS_PER_QUESTION, finalCorrect, WATERSHED_MATCH_ROUNDS, { setIndex, answers: detail })
    }
  }

  function nextQuestion() {
    if (!currentAnswer || round >= WATERSHED_MATCH_ROUNDS - 1) return
    setRound((value) => value + 1)
    setSelected(null)
  }

  function playAnotherSet() {
    resetSession()
    setFinished(false)
    setAnswers([])
    setSelected(null)
    setRound(0)
    setSetIndex((value) => value + 1)
  }

  if (!question) return <div className="game-body"><InlineNotice title="A watershed question could not be built" tone="warning">The bundled HUC12 sample needs at least five questions across three regions. Reopen the game from the Free Play library.</InlineNotice></div>

  const source = data.unitsById.get(question.sourceId)!
  const downstream = data.unitsById.get(question.answerId)!
  const chosenId = currentAnswer ?? selected
  const checked = currentAnswer !== undefined

  return (
    <div className="game-body watershed-match-game">
      <header className="watershed-match-heading">
        <div>
          <span className="eyebrow">U.S. watershed sample · {question.region} · {Math.min(round + 1, WATERSHED_MATCH_ROUNDS)} of {WATERSHED_MATCH_ROUNDS}</span>
          <h2>Follow the flow</h2>
          <p>Choose the neighboring subwatershed that receives the greatest share of this area’s mapped flow.</p>
        </div>
        <div className="watershed-match-score" aria-label={`${correctCount} correct out of ${answers.length} answered`}><strong>{score}</strong><span> / 500</span></div>
      </header>

      <section className="watershed-match-task" aria-labelledby="watershed-task-title">
        <span className="eyebrow">Starting subwatershed</span>
        <h3 id="watershed-task-title">{source.properties.name}</h3>
        <p>HUC12 {question.sourceId}</p>
      </section>

      <figure className="watershed-map-figure" aria-labelledby="watershed-map-caption">
        <svg className="watershed-map" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label={`Map of ${source.properties.name} and three adjacent candidate subwatersheds`}>
          <rect className="watershed-map-water" width={MAP_WIDTH} height={MAP_HEIGHT} />
          <defs><marker id="watershed-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L7,3 z" /></marker></defs>
          {shapes.filter((shape) => shape.optionIndex < 0).map((shape) => <path key={shape.id} className="watershed-shape is-source" d={shape.path} />)}
          {shapes.filter((shape) => shape.optionIndex >= 0).map((shape) => <path
            key={shape.id}
            className={`watershed-shape${checked && shape.id === question.answerId ? ' is-correct' : checked && chosenId === shape.id ? ' is-incorrect' : ''}`}
            d={shape.path}
          />)}
          {checked && shapes.find((shape) => shape.optionIndex < 0) && shapes.find((shape) => shape.id === question.answerId) && <line
            className="watershed-flow-arrow"
            x1={shapes.find((shape) => shape.optionIndex < 0)!.x}
            y1={shapes.find((shape) => shape.optionIndex < 0)!.y}
            x2={shapes.find((shape) => shape.id === question.answerId)!.x}
            y2={shapes.find((shape) => shape.id === question.answerId)!.y}
            markerEnd="url(#watershed-arrowhead)"
          />}
          {shapes.filter((shape) => shape.optionIndex >= 0).map((shape) => {
            const isSelected = checked && chosenId === shape.id
            const isCorrect = checked && shape.id === question.answerId
            const isIncorrect = isSelected && !isCorrect
            const optionClass = isCorrect ? 'is-correct' : isIncorrect ? 'is-incorrect' : ''
            return <g key={shape.id}>
              <g className={`watershed-map-marker ${optionClass}`} transform={`translate(${shape.x} ${shape.y})`} aria-hidden="true">
                <circle r="16" />
                <text y="5">{String.fromCharCode(65 + shape.optionIndex)}</text>
              </g>
            </g>
          })}
          {shapes.filter((shape) => shape.optionIndex < 0).map((shape) => <text key={`${shape.id}-label`} className="watershed-source-label" x={shape.x} y={shape.y}>SOURCE</text>)}
        </svg>
        <figcaption id="watershed-map-caption">The source area is shown in blue. After checking, the arrow marks the recorded link; it is not a river trace.</figcaption>
        <div className="watershed-map-legend"><span><i className="is-source" />Starting subwatershed</span><span><i />Candidate downstream area</span></div>
      </figure>

      <div className="watershed-choice-list" role="group" aria-label="Choose the downstream subwatershed">
        {question.choices.map((id, index) => {
          const unit = data.unitsById.get(id)!
          const isSelected = chosenId === id
          const isCorrect = checked && id === question.answerId
          const isIncorrect = checked && isSelected && !isCorrect
          return <button
            key={id}
            className={`watershed-choice${isSelected ? ' is-selected' : ''}${isCorrect ? ' is-correct' : ''}${isIncorrect ? ' is-incorrect' : ''}`}
            type="button"
            aria-pressed={isSelected}
            disabled={checked}
            onClick={() => setSelected(id)}
          >
            <span className="watershed-choice-letter">{String.fromCharCode(65 + index)}</span>
            <span className="watershed-choice-copy"><strong>{unit.properties.name}</strong>{checked && <small>HUC12 {id}</small>}</span>
            {isCorrect && <span className="watershed-choice-result">Downstream destination</span>}
            {isIncorrect && <span className="watershed-choice-result">Not the recorded destination</span>}
          </button>
        })}
      </div>

      <div className="watershed-match-controls">
        {!checked
          ? <button className="button button-dark" type="button" disabled={!selected} onClick={() => { void checkAnswer() }}>Check destination</button>
          : <>
            <p ref={feedbackRef} className={`watershed-match-feedback${currentAnswer === question.answerId ? ' is-correct' : ' is-incorrect'}`} role="status" tabIndex={-1}>
              <strong>{currentAnswer === question.answerId ? 'That is the recorded downstream area.' : `The recorded destination is ${downstream.properties.name}.`}</strong> The WBD defines ToHUC as the neighboring HUC12 that naturally receives most of this unit’s flow.
            </p>
            {round < WATERSHED_MATCH_ROUNDS - 1 && <button className="button button-dark" type="button" onClick={nextQuestion}>Next watershed</button>}
          </>}
      </div>

      {saveError && <p className="form-message form-message-error" role="alert">{saveError}</p>}
      <p className="watershed-match-source">Sample areas: the Potomac, Columbia and Susquehanna systems. This pilot does not cover the whole United States. Source: U.S. Geological Survey and Natural Resources Conservation Service, <a href="https://api.water.usgs.gov/fabric/pygeoapi/collections/wbd12_20250107?f=html" target="_blank" rel="noreferrer">2025 Watershed Boundary Dataset HUC12 collection</a>.</p>

      <GameResultsDialog
        key={setIndex}
        complete={finished}
        gameId="watershed-match"
        mode={mode}
        score={score}
        correct={correctCount}
        total={WATERSHED_MATCH_ROUNDS}
        title={correctCount === WATERSHED_MATCH_ROUNDS ? 'Every watershed link matched.' : 'The flow network gets clearer.'}
        message={`${score.toLocaleString()} of 500 points. You followed downstream links across the Potomac, Columbia and Susquehanna sample areas.`}
        saveError={saveError}
        onReplay={mode === 'freeplay' ? playAnotherSet : undefined}
        replayLabel="Follow another set"
      />
    </div>
  )
}

function makeMapShapes(data: WatershedMatchData, question: WatershedQuestion): WatershedMapShape[] {
  const source = data.unitsById.get(question.sourceId)
  const choices = question.choices.map((id) => data.unitsById.get(id))
  if (!source || choices.some((feature) => !feature)) return []
  const features = [source, ...choices] as GeoJSON.Feature<GeoJSON.Geometry, WatershedUnitProperties>[]
  const collection: GeoJSON.FeatureCollection<GeoJSON.Geometry, WatershedUnitProperties> = { type: 'FeatureCollection', features }
  const projection = geoAlbersUsa().fitExtent([[24, 22], [MAP_WIDTH - 24, MAP_HEIGHT - 22]], collection)
  const path = geoPath(projection)
  return features.map((feature, index) => {
    const [x, y] = path.centroid(feature)
    return {
      id: feature.properties.huc12,
      name: feature.properties.name,
      path: path(feature) ?? '',
      x: Number.isFinite(x) ? x : MAP_WIDTH / 2,
      y: Number.isFinite(y) ? y : MAP_HEIGHT / 2,
      optionIndex: index - 1,
    }
  })
}

function restoreAnswers(value: unknown, deck: readonly WatershedQuestion[]): string[] {
  if (!Array.isArray(value)) return []
  const answers: string[] = []
  for (let index = 0; index < Math.min(value.length, deck.length); index += 1) {
    const answer = value[index]
    if (typeof answer !== 'string' || !deck[index]?.choices.includes(answer)) break
    answers.push(answer)
  }
  return answers
}

function restoreSelected(value: unknown, deck: readonly WatershedQuestion[], answers: readonly string[]): string | null {
  const question = deck[Math.min(answers.length, deck.length - 1)]
  return typeof value === 'string' && question?.choices.includes(value) && answers.length < deck.length ? value : null
}

function readIndex(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0
}
