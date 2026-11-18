import { useEffect, useMemo, useState } from 'react'
import { geoContains, geoCentroid } from 'd3-geo'
import { Check, CircleHelp, Waves } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { AdvancedGameSettings, GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadRivers } from '../../geography/data'
import type { GeographyData, GameMode, RiverFeature } from '../../geography/types'
import { normalizeAnswer, seededShuffle } from '../../puzzles/engine'
import { buildRiverQuestionPool, riverRankLimit, type RiverDifficulty, type RiverQuestion } from '../../puzzles/rivers'
import { useGameSession } from '../session'

const difficultyOptions = [
  { value: 'easy', label: 'Easy · major rivers' },
  { value: 'medium', label: 'Medium · world rivers' },
  { value: 'hard', label: 'Hard · more tributaries' },
]

export function RiverwaysGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [rivers, setRivers] = useState<RiverFeature[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const session = useGameSession('rivers', mode, date, seed)
  const restoredDifficulty = session.progress?.difficulty
  const [difficulty, setDifficulty] = useState<RiverDifficulty>(restoredDifficulty === 'easy' || restoredDifficulty === 'hard' ? restoredDifficulty : 'medium')
  const restoredRound = Number.isInteger(session.progress?.round) && Number(session.progress?.round) >= 0 ? Number(session.progress?.round) : 0
  const [round, setRound] = useState(restoredRound)

  useEffect(() => {
    let active = true
    loadRivers().then((items) => { if (active) setRivers(items) }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'River data could not be loaded.')
    })
    return () => { active = false }
  }, [])

  const pool = useMemo(() => buildRiverQuestionPool(rivers ?? []).filter((item) => item.scaleRank <= riverRankLimit(difficulty)), [difficulty, rivers])
  const cycle = pool.length ? Math.floor(round / pool.length) : 0
  const shuffled = useMemo(() => seededShuffle(pool, `${seed}:riverways:${difficulty}:${cycle}`), [cycle, difficulty, pool, seed])
  const question = shuffled.length ? shuffled[round % shuffled.length] : undefined
  if (loadError) return <div className="game-body"><InlineNotice title="The river atlas could not open" tone="warning">{loadError}</InlineNotice></div>
  if (!rivers) return <LoadingState label="Opening the river atlas…" />
  if (!pool.length) return <div className="game-body"><InlineNotice title="No river traces are available" tone="warning">Choose another difficulty to open a wider set of named rivers.</InlineNotice></div>
  if (!question) return <div className="game-body"><InlineNotice title="The river question could not be built" tone="warning">Try reopening Riverways from the game library.</InlineNotice></div>

  return (
    <RiverRound
      key={`${round}:${difficulty}:${question.id}`}
      data={data}
      difficulty={difficulty}
      mode={mode}
      pool={pool}
      question={question}
      round={round}
      session={session}
      onDifficulty={setDifficulty}
      onReplay={() => { session.resetSession(); setRound((value) => value + 1) }}
    />
  )
}

function RiverRound({ data, difficulty, mode, pool, question, round, session, onDifficulty, onReplay }: {
  data: GeographyData
  difficulty: RiverDifficulty
  mode: GameMode
  pool: RiverQuestion[]
  question: RiverQuestion
  round: number
  session: ReturnType<typeof useGameSession>
  onDifficulty: (value: RiverDifficulty) => void
  onReplay: () => void
}) {
  const saved = session.progress?.round === round && session.progress?.targetId === question.id ? session.progress : null
  const [input, setInput] = useState(() => typeof saved?.input === 'string' ? saved.input : '')
  const [attempts, setAttempts] = useState<string[]>(() => Array.isArray(saved?.attempts) ? saved.attempts.filter((item): item is string => typeof item === 'string') : [])
  const [message, setMessage] = useState(() => typeof saved?.message === 'string' ? saved.message : '')
  const [finished, setFinished] = useState(() => saved?.finished === true)
  const [solved, setSolved] = useState(() => saved?.solved === true)
  const [score, setScore] = useState(() => typeof saved?.score === 'number' ? saved.score : 0)
  const suggestions: Suggestion[] = useMemo(() => pool.map((river) => ({ value: river.id, label: river.name, aliases: river.aliases })), [pool])
  const center = useMemo(() => traceContinent(question, data), [data, question])
  const { save, saveError, saveProgress } = session
  const guessLimit = 6

  useEffect(() => {
    if (finished) return
    void saveProgress({ round, targetId: question.id, difficulty, input, attempts, message, finished, solved, score })
  }, [attempts, difficulty, finished, input, message, question.id, round, saveProgress, score, solved])

  async function guess() {
    if (finished) return
    const answer = normalizeAnswer(input)
    const river = pool.find((candidate) => candidate.aliases.some((name) => normalizeAnswer(name) === answer))
    if (!river) {
      setMessage('Choose a river from the suggestions.')
      return
    }
    if (attempts.includes(river.id)) {
      setMessage(`You already tried ${river.name}.`)
      return
    }
    const nextAttempts = [...attempts, river.id]
    setAttempts(nextAttempts)
    setInput('')
    if (river.id === question.id) {
      const points = Math.max(200, 1000 - (nextAttempts.length - 1) * 160)
      setSolved(true)
      setFinished(true)
      setScore(points)
      setMessage(`That’s the ${question.name}. You traced it in ${nextAttempts.length} ${nextAttempts.length === 1 ? 'guess' : 'guesses'}.`)
      await save(points, 1, 1, { river: question.id, attempts: nextAttempts.length, scaleRank: question.scaleRank })
      return
    }
    if (nextAttempts.length >= guessLimit) {
      setFinished(true)
      setSolved(false)
      setMessage(`The highlighted river was the ${question.name}.`)
      await save(0, 0, 1, { river: question.id, attempts: nextAttempts.length, scaleRank: question.scaleRank })
      return
    }
    setMessage(`${river.name} is not this river.${nextAttempts.length >= 2 && center ? ` The trace’s centre lies in ${center}.` : ''}`)
  }

  return (
    <div className="game-body riverways-game-body">
      <div className="riverways-prompt">
        <div><span className="eyebrow">{pool.length} named rivers · round {round + 1}</span><h2>Follow the river</h2><p>Trace the orange watercourse across the map, then name it. You have six guesses.</p></div>
        {mode === 'freeplay' && <GameSettingsMenu><div className="practice-config">
          <GameSettingSelect label="River pool" value={difficulty} options={difficultyOptions} onChange={(value) => onDifficulty(value as RiverDifficulty)} />
          <AdvancedGameSettings><span className="practice-config-note">The pool expands from the largest rivers to more regional waterways. Lines are generalized for a world map.</span></AdvancedGameSettings>
        </div></GameSettingsMenu>}
        <div className="riverways-attempts" aria-label={`${attempts.length} of ${guessLimit} guesses used`}>{Array.from({ length: guessLimit }, (_, index) => <span key={index} className={index < attempts.length ? (solved && index === attempts.length - 1 ? 'is-right' : 'is-used') : ''} />)}</div>
      </div>
      <div className="riverways-map-stage"><GeoMap features={data.features} lineFeatures={[question.feature]} hideFeatureNames showHoverLabels={false} ariaLabel="World map with one highlighted river trace" /></div>
      {!finished && <AutocompleteInput
        id="riverways-answer"
        label="Name the highlighted river"
        placeholder="Type a river name"
        value={input}
        onChange={(value) => { setInput(value); setMessage('') }}
        suggestions={suggestions}
        onPick={(suggestion) => setInput(suggestion.label)}
        onSubmit={() => void guess()}
        submitLabel="Guess"
      />}
      {message && <div className={`answer-feedback${solved ? ' is-correct' : finished ? ' is-incorrect' : ''}`} role="status"><span className="feedback-icon">{solved ? <Check size={17} /> : <CircleHelp size={16} />}</span><span>{message}</span></div>}
      {attempts.length > 0 && !finished && <div className="guess-list" aria-label="Previous river guesses">{attempts.map((id) => <span key={id}>{pool.find((river) => river.id === id)?.name ?? id}</span>)}</div>}
      <p className="map-source-note riverways-source-note"><Waves size={13} aria-hidden="true" /> Natural Earth 1:50m river centerlines · public domain</p>
      <GameResultsDialog complete={finished} gameId="rivers" mode={mode} score={score} correct={solved ? 1 : 0} total={1} title={solved ? 'River traced.' : 'The river has been revealed.'} message={`${attempts.length} of ${guessLimit} guesses used.`} saveError={saveError} onReplay={mode === 'freeplay' ? onReplay : undefined} replayLabel="Trace another river" />
    </div>
  )
}

function traceContinent(question: RiverQuestion, data: GeographyData): string | null {
  const point = geoCentroid(question.feature as unknown as GeoJSON.Feature)
  if (!point.every(Number.isFinite)) return null
  for (const feature of data.features) {
    if (!geoContains(feature as unknown as GeoJSON.Feature, point)) continue
    const code = feature.properties.iso3
    const continent = code ? data.countriesByCode.get(code)?.continent : null
    if (continent) return continent
  }
  return null
}
