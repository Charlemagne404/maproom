import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { geoEquirectangular, geoEqualEarth, geoGraticule, geoMercator, geoOrthographic, geoPath, geoRotation, type GeoProjection } from 'd3-geo'
import { GameResultsDialog } from '../../components/GameResults'
import { FreePlaySetupContext } from '../../components/FreePlaySetupContext'
import type { GeographyData, GameMode } from '../../geography/types'
import { createConstantHeadingCourse, createProjectionDeck, isProjectionId, PROJECTION_DETAILS, PROJECTION_IDS, PROJECTION_MAP_ROTATION, projectionAnswerIsCorrect, type ProjectionId } from '../../puzzles/projectionMatch'
import { useGameSession } from '../session'
import './projection-match.css'

const MAP_WIDTH = 320
const MAP_HEIGHT = 190
const QUESTIONS_PER_SET = PROJECTION_IDS.length
const POINTS_PER_ANSWER = 250

interface SavedProjectionProgress {
  setIndex?: unknown
  round?: unknown
  selected?: unknown
  answers?: unknown
  finished?: unknown
}

interface ProjectionMapPaths {
  land: string
  graticule: string
  sphere: string
  course: string
}

export function ProjectionMatchGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { setup } = useContext(FreePlaySetupContext)
  const session = useGameSession('projection-match', mode, date, seed)
  const { resetSession, save, saveError, saveProgress } = session
  const saved = session.progress as SavedProjectionProgress | null
  const restoredAnswers = restoreAnswers(saved?.answers)
  const [setIndex, setSetIndex] = useState(() => readIndex(saved?.setIndex))
  const [round, setRound] = useState(() => Math.min(readIndex(saved?.round), restoredAnswers.length))
  const [answers, setAnswers] = useState<ProjectionId[]>(restoredAnswers)
  const [selected, setSelected] = useState<ProjectionId | null>(() => isProjectionId(saved?.selected) ? saved.selected : null)
  const [finished, setFinished] = useState(saved?.finished === true)
  const taskHeadingRef = useRef<HTMLHeadingElement>(null)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const deck = useMemo(() => createProjectionDeck(seed, setIndex), [seed, setIndex])
  const geometry = useMemo<GeoJSON.FeatureCollection>(() => ({ type: 'FeatureCollection', features: data.features }), [data.features])
  const mapPaths = useMemo(() => makeMapPaths(geometry), [geometry])
  const question = deck[round]
  const currentAnswer = answers[round]
  const answeredCount = answers.length
  const correctCount = answers.reduce((count, answer, index) => count + Number(projectionAnswerIsCorrect(answer, deck[index]!)), 0)
  const score = correctCount * POINTS_PER_ANSWER

  useEffect(() => {
    if (finished) return
    void saveProgress({ version: 1, setIndex, round, selected, answers, finished: false })
  }, [answers, finished, round, saveProgress, selected, setIndex])

  useEffect(() => {
    if (setup) return
    if (currentAnswer) feedbackRef.current?.focus({ preventScroll: true })
    else if (round > 0 && question) taskHeadingRef.current?.focus({ preventScroll: true })
  }, [currentAnswer, question, round, setup])

  async function checkAnswer() {
    if (!question || !selected || currentAnswer || finished) return
    const nextAnswers = [...answers.slice(0, round), selected]
    const nextCorrectCount = nextAnswers.reduce((count, answer, index) => count + Number(projectionAnswerIsCorrect(answer, deck[index]!)), 0)
    setAnswers(nextAnswers)
    if (round === QUESTIONS_PER_SET - 1) {
      const resultDetails = deck.map((task, index) => ({ task: task.id, answer: nextAnswers[index], correct: projectionAnswerIsCorrect(nextAnswers[index]!, task) }))
      setFinished(true)
      setRound(QUESTIONS_PER_SET)
      await saveProgress({ version: 1, setIndex, round: QUESTIONS_PER_SET, answers: nextAnswers, finished: true })
      await save(nextCorrectCount * POINTS_PER_ANSWER, nextCorrectCount, QUESTIONS_PER_SET, { setIndex, answers: resultDetails })
    }
  }

  function nextQuestion() {
    if (!currentAnswer || round >= QUESTIONS_PER_SET - 1) return
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

  const chosenCorrectly = question && currentAnswer ? projectionAnswerIsCorrect(currentAnswer, question) : false

  return (
    <div className="game-body projection-match-game">
      <header className="projection-match-heading">
        <div>
          <span className="eyebrow">Map literacy · {finished ? QUESTIONS_PER_SET : Math.min(round + 1, QUESTIONS_PER_SET)} of {QUESTIONS_PER_SET}</span>
          <h2>Which map fits the job?</h2>
          <p>Choose a map, then check your answer. Each view makes different tradeoffs.</p>
        </div>
        <div className="projection-match-score" aria-label={`${correctCount} correct out of ${answeredCount} checked`}><strong>{correctCount}</strong><span> / {QUESTIONS_PER_SET}</span></div>
      </header>

      {question ? <>
        <section className="projection-match-task" aria-labelledby="projection-task-title">
          <span className="eyebrow">Mapping task</span>
          <h3 ref={taskHeadingRef} id="projection-task-title" tabIndex={-1}>{question.prompt}</h3>
          {question.id === 'mercator' && <p className="projection-match-task-note">The orange line shows the same constant-heading course on each map.</p>}
        </section>

        <div className="projection-map-grid" role="group" aria-label="Choose a map projection">
          {PROJECTION_IDS.map((projectionId, index) => {
            const checked = currentAnswer !== undefined
            const isSelected = (checked ? currentAnswer : selected) === projectionId
            const isCorrect = checked && question.id === projectionId
            const map = mapPaths[projectionId]
            return <button
              key={projectionId}
              className={`projection-map-option${isSelected ? ' is-selected' : ''}${checked && isCorrect ? ' is-correct' : ''}${checked && isSelected && !isCorrect ? ' is-incorrect' : ''}`}
              type="button"
              aria-label={`Map option ${String.fromCharCode(65 + index)}: ${PROJECTION_DETAILS[projectionId].visualDescription}${question.id === 'mercator' ? ` The orange course line is ${projectionId === 'mercator' ? 'straight' : 'curved'} in this view.` : ''}${checked ? ` ${PROJECTION_DETAILS[projectionId].name}.` : ''}`}
              aria-pressed={isSelected}
              disabled={checked}
              onClick={() => setSelected(projectionId)}
            >
              <span className="projection-option-label">Option {String.fromCharCode(65 + index)}</span>
              <svg className="projection-map-visual" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true" focusable="false">
                <rect className="projection-map-ocean" x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} />
                {projectionId === 'orthographic' && <path className="projection-map-globe" d={map.sphere} />}
                <path className="projection-map-land" d={map.land} />
                <path className="projection-map-graticule" d={map.graticule} />
                {question.id === 'mercator' && <g className="projection-course-illustration" aria-hidden="true">
                  <path className="projection-course-casing" d={map.course} />
                  <path className="projection-course" d={map.course} />
                </g>}
              </svg>
              {checked && <span className="projection-option-name">{PROJECTION_DETAILS[projectionId].name}</span>}
            </button>
          })}
        </div>

        <div className="projection-match-controls">
          {!currentAnswer
            ? <button className="button button-dark" type="button" disabled={!selected} onClick={() => { void checkAnswer() }}>Check map</button>
            : <>
              <p ref={feedbackRef} className={`projection-match-feedback${chosenCorrectly ? ' is-correct' : ' is-incorrect'}`} role="status" tabIndex={-1}>
                <strong>{chosenCorrectly ? 'Good match.' : `The best match is ${PROJECTION_DETAILS[question.id].name}.`}</strong> {question.explanation}
              </p>
              {round < QUESTIONS_PER_SET - 1 && <button className="button button-dark" type="button" onClick={nextQuestion}>Next mapping task</button>}
            </>}
        </div>
      </> : <p className="projection-match-complete">All four map tasks are complete. Your results are ready.</p>}

      {saveError && <p className="form-message form-message-error" role="alert">{saveError}</p>}
      <p className="projection-match-source">Map shapes use the bundled Natural Earth country boundaries. Projection behavior follows D3’s implementations.</p>
      <GameResultsDialog complete={finished} gameId="projection-match" mode={mode} score={score} correct={correctCount} total={QUESTIONS_PER_SET} title={correctCount === QUESTIONS_PER_SET ? 'Every map found its match.' : 'A world of different views.'} message="Area comparisons, constant-bearing routes and globe-like views each bring different tradeoffs." saveError={saveError} onReplay={mode === 'freeplay' ? playAnotherSet : undefined} replayLabel="Match another set" />
    </div>
  )
}

function makeMapPaths(geometry: GeoJSON.FeatureCollection): Record<ProjectionId, ProjectionMapPaths> {
  const graticule = geoGraticule().step([30, 30])()
  const rotation = geoRotation(PROJECTION_MAP_ROTATION)
  const course: GeoJSON.LineString = {
    type: 'LineString',
    coordinates: createConstantHeadingCourse().map((coordinate) => rotation.invert(coordinate)),
  }
  return Object.fromEntries(PROJECTION_IDS.map((projectionId) => {
    const projection = makeProjection(projectionId).fitExtent([[12, 12], [MAP_WIDTH - 12, MAP_HEIGHT - 12]], geometry)
    const path = geoPath(projection)
    const courseProjection = makeProjection(projectionId)
      .fitExtent([[12, 12], [MAP_WIDTH - 12, MAP_HEIGHT - 12]], geometry)
      .precision(0)
    const coursePath = geoPath(courseProjection)
    return [projectionId, {
      land: path(geometry) ?? '',
      graticule: path(graticule) ?? '',
      sphere: path({ type: 'Sphere' }) ?? '',
      course: coursePath(course) ?? '',
    }]
  })) as Record<ProjectionId, ProjectionMapPaths>
}

function makeProjection(projectionId: ProjectionId): GeoProjection {
  switch (projectionId) {
    case 'equal-earth': return geoEqualEarth().rotate(PROJECTION_MAP_ROTATION)
    case 'mercator': return geoMercator().rotate(PROJECTION_MAP_ROTATION)
    case 'equirectangular': return geoEquirectangular().rotate(PROJECTION_MAP_ROTATION)
    case 'orthographic': return geoOrthographic().rotate(PROJECTION_MAP_ROTATION).clipAngle(90)
  }
}

function restoreAnswers(value: unknown): ProjectionId[] {
  return Array.isArray(value) ? value.filter(isProjectionId).slice(0, QUESTIONS_PER_SET) : []
}

function readIndex(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0
}
