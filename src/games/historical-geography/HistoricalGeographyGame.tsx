import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, CircleHelp, Clock3 } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadHistoricalMaps } from '../../geography/historical/loader'
import type { HistoricalMap } from '../../geography/historical/types'
import type { GameMode } from '../../geography/types'
import { createHistoricalDeck, evaluateHistoricalGuess, formatHistoricalYearRange, type HistoricalDifficulty, type HistoricalGuessResult } from '../../puzzles/historical-geography'
import { useGameSession } from '../session'
import './historical-geography.css'

const difficultyOptions = [
  { value: 'easy', label: 'Easy · within 100 years' },
  { value: 'medium', label: 'Medium · within 50 years' },
  { value: 'hard', label: 'Hard · within 25 years' },
]

interface SavedHistoricalProgress {
  round?: unknown
  mapId?: unknown
  difficulty?: unknown
  guess?: unknown
  result?: unknown
  finished?: unknown
}

export function HistoricalGeographyGame({ mode, date, seed }: { mode: GameMode; date: string; seed: string }) {
  const session = useGameSession('historical-geography', mode, date, seed)
  const saved = session.progress as SavedHistoricalProgress | null
  const savedDifficulty = isHistoricalDifficulty(saved?.difficulty) ? saved.difficulty : 'medium'
  const restoredRound = Number.isInteger(saved?.round) && Number(saved?.round) >= 0 ? Number(saved?.round) : 0
  const [difficulty, setDifficulty] = useState<HistoricalDifficulty>(savedDifficulty)
  const [round, setRound] = useState(restoredRound)
  const [roundFinished, setRoundFinished] = useState(saved?.finished === true)
  const [maps, setMaps] = useState<HistoricalMap[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const deck = useMemo(() => maps ? createHistoricalDeck(maps, seed) : [], [maps, seed])
  const map = deck.length ? deck[round % deck.length] : undefined

  useEffect(() => {
    let active = true
    loadHistoricalMaps().then((loaded) => { if (active) setMaps(loaded) }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Historical map data could not be loaded.')
    })
    return () => { active = false }
  }, [])

  function replay() {
    session.resetSession()
    setRoundFinished(false)
    setRound((value) => value + 1)
  }

  const settings = mode === 'freeplay' && !roundFinished && <GameSettingsMenu label="Historical game settings">
    <div className="practice-config">
      <GameSettingSelect label="Difficulty" value={difficulty} options={difficultyOptions} onChange={(value) => setDifficulty(value as HistoricalDifficulty)} />
      <p className="historical-settings-note">Tolerance is inclusive. The accepted year range appears with each result.</p>
    </div>
  </GameSettingsMenu>

  if (loadError) return <div className="game-body historical-geography-game">{settings}<InlineNotice title="The historical atlas could not open" tone="warning">{loadError} Reconnect and reopen Explore so the map catalogue can be cached for offline play.</InlineNotice></div>
  if (!maps || !map) return <div className="game-body historical-geography-game">{settings}<LoadingState label="Opening the historical atlas…" /></div>

  const savedForRound = saved?.round === round && saved.mapId === map.id && isHistoricalDifficulty(saved.difficulty) ? saved : null

  return (
    <div className="game-body historical-geography-game">
      {settings}
      <HistoricalMapRound
        key={`${round}:${map.id}`}
        map={map}
        mapsCount={deck.length}
        mode={mode}
        round={round}
        difficulty={difficulty}
        saved={savedForRound}
        saveProgress={session.saveProgress}
        save={session.save}
        saveError={session.saveError}
        onFinish={() => setRoundFinished(true)}
        onReplay={mode === 'freeplay' ? replay : undefined}
      />
    </div>
  )
}

function HistoricalMapRound({ map, mapsCount, mode, round, difficulty, saved, saveProgress, save, saveError, onFinish, onReplay }: {
  map: HistoricalMap
  mapsCount: number
  mode: GameMode
  round: number
  difficulty: HistoricalDifficulty
  saved: SavedHistoricalProgress | null
  saveProgress: (payload: Record<string, unknown>) => Promise<void>
  save: ReturnType<typeof useGameSession>['save']
  saveError: string
  onFinish: () => void
  onReplay?: () => void
}) {
  const restoredGuess = typeof saved?.guess === 'string' ? saved.guess : ''
  const restoredResult = isHistoricalGuessResult(saved?.result) ? saved.result : null
  const [guessInput, setGuessInput] = useState(restoredGuess)
  const [result, setResult] = useState<HistoricalGuessResult | null>(restoredResult)
  const [inputError, setInputError] = useState('')
  const [imageError, setImageError] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const serializedSources = map.contextSources.map((source) => source.title).join(', ')
  const format = (year: number) => year.toLocaleString('en-US')

  useEffect(() => {
    if (!result) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const timer = window.setTimeout(() => setShowResults(true), reducedMotion ? 0 : 700)
    return () => window.clearTimeout(timer)
  }, [result])

  useEffect(() => {
    if (result) return
    void saveProgress({
      version: 1,
      round,
      mapId: map.id,
      difficulty,
      guess: guessInput,
      finished: false,
    })
  }, [difficulty, guessInput, map.id, round, result, saveProgress])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (result) return
    const guess = Number(guessInput.trim())
    if (!/^\d{1,4}$/.test(guessInput.trim()) || !Number.isInteger(guess) || guess < 1 || guess > 9999) {
      setInputError('Enter a whole year from 1 to 9999.')
      return
    }
    const nextResult = evaluateHistoricalGuess(map.depictedYear, guess, difficulty)
    setInputError('')
    setResult(nextResult)
    onFinish()
    await saveProgress({ version: 1, round, mapId: map.id, difficulty, guess: String(guess), result: nextResult, finished: true })
    await save(nextResult.score, nextResult.withinTolerance ? 1 : 0, 1, {
      historicalPuzzleId: `historical-geography:${map.id}:v1`,
      mapId: map.id,
      depictedYear: map.depictedYear,
      guess,
      distance: nextResult.distance,
      difficulty,
      acceptedMinimum: nextResult.acceptedMinimum,
      acceptedMaximum: nextResult.acceptedMaximum,
      contextSources: serializedSources,
    })
  }

  return (
    <section className="historical-round" aria-labelledby="historical-round-title">
      <header className="historical-round-heading">
        <div>
          <span className="eyebrow">Historical geography · map {round % mapsCount + 1} of {mapsCount}</span>
          <h2 id="historical-round-title">When was this map?</h2>
          <p>Study this Maproom-generated snapshot of global political boundaries on 31 December, then enter the depicted year.</p>
        </div>
        <div className="historical-round-meta" aria-label={`${difficulty} difficulty`}><Clock3 size={15} aria-hidden="true" /><span>{difficultyOptions.find((option) => option.value === difficulty)?.label}</span></div>
      </header>

      <figure className={`historical-map-frame${result ? ' is-revealed' : ''}`}>
        {imageError
          ? <div className="historical-map-fallback" role="img" aria-label="Historical map unavailable"><strong>The map could not be opened.</strong><span>Reconnect to load this map, then it will be available offline.</span></div>
          : <img className="historical-map-image" src={map.assetUrl} alt="Unlabeled world political map showing historical country and territory boundaries." loading="lazy" decoding="async" onError={() => setImageError(true)} />}
        <figcaption className="historical-map-caption"><span>Global political boundaries</span><span>Equal Earth projection</span></figcaption>
      </figure>

      <div className="historical-attribution">
        <span>CShapes 2.1 · Maproom-generated · ETH Zürich · CC BY-NC-SA 4.0 · non-commercial</span>
        <a href={map.source.originalUrl} target="_blank" rel="noreferrer">Source and reuse terms</a>
      </div>

      {!result ? (
        <form className="historical-guess-form" onSubmit={(event) => void submit(event)} noValidate>
          <label htmlFor="historical-year-guess">Your year guess</label>
          <div className="historical-year-entry">
            <input id="historical-year-guess" type="number" inputMode="numeric" min="1" max="9999" step="1" value={guessInput} onChange={(event) => { setGuessInput(event.target.value); setInputError('') }} placeholder="e.g. 1918" aria-describedby={inputError ? 'historical-year-error' : 'historical-year-hint'} />
            <button className="button button-dark" type="submit">Reveal year <Check size={16} aria-hidden="true" /></button>
          </div>
          <p id={inputError ? 'historical-year-error' : 'historical-year-hint'} className={inputError ? 'historical-input-error' : 'historical-input-hint'} role={inputError ? 'alert' : undefined}>{inputError || 'One guess per map. Your score rewards closer years.'}</p>
        </form>
      ) : (
        <HistoricalReveal map={map} result={result} difficulty={difficulty} />
      )}

      <GameResultsDialog
        complete={showResults}
        gameId="historical-geography"
        mode={mode}
        score={result?.score ?? 0}
        correct={result?.withinTolerance ? 1 : 0}
        total={1}
        title={result?.withinTolerance ? 'You found the era.' : 'The map’s year is revealed.'}
        message={result ? `${format(map.depictedYear)} · ${result.distance} ${result.distance === 1 ? 'year' : 'years'} away.` : ''}
        saveError={saveError}
        onReplay={onReplay}
        replayLabel="Study another map"
      />
    </section>
  )
}

function HistoricalReveal({ map, result, difficulty }: { map: HistoricalMap; result: HistoricalGuessResult; difficulty: HistoricalDifficulty }) {
  const acceptedRange = formatHistoricalYearRange(result.acceptedMinimum, result.acceptedMaximum)
  return (
    <section className={`historical-reveal${result.withinTolerance ? ' is-within-range' : ' is-outside-range'}`} aria-live="polite" aria-labelledby="historical-reveal-title">
      <div className="historical-reveal-result">
        <span className="historical-reveal-icon" aria-hidden="true">{result.withinTolerance ? <Check size={18} /> : <CircleHelp size={18} />}</span>
        <div><span className="eyebrow">{result.withinTolerance ? 'Within range' : 'Outside range'}</span><h3 id="historical-reveal-title">{map.depictedYear.toLocaleString('en-US')}</h3></div>
        <p className="historical-distance">{result.distance.toLocaleString('en-US')}<span>years away</span></p>
      </div>
      <p className="historical-range-note">{difficulty[0]!.toUpperCase() + difficulty.slice(1)} accepted <strong>{acceptedRange}</strong>, inclusive. Your guess was <strong>{result.guess.toLocaleString('en-US')}</strong>.</p>
      <p className="historical-context">{map.historicalContext}</p>
      <details className="historical-source-details">
        <summary>Map date, context and sources</summary>
        <p>This is a Maproom-generated CShapes 2.1 snapshot dated <strong>{map.depictedDate}</strong>. The year identifies the depicted political geography and is separate from any archival map publication date.</p>
        <p>{map.datingUncertainty}</p>
        <ul>{map.contextSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
        <p>Attribution: {map.source.attribution} <a href={map.source.licenseUrl} target="_blank" rel="noreferrer">License terms</a>.</p>
      </details>
    </section>
  )
}

function isHistoricalDifficulty(value: unknown): value is HistoricalDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

function isHistoricalGuessResult(value: unknown): value is HistoricalGuessResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<HistoricalGuessResult>
  return Number.isInteger(result.guess) && Number.isInteger(result.answer) && Number.isInteger(result.distance)
    && Number.isInteger(result.tolerance) && Number.isInteger(result.acceptedMinimum) && Number.isInteger(result.acceptedMaximum)
    && typeof result.withinTolerance === 'boolean' && Number.isInteger(result.score)
}
