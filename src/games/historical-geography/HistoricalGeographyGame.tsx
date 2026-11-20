import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, CircleHelp, Clock3 } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadHistoricalMaps } from '../../geography/historical/loader'
import type { HistoricalMap } from '../../geography/historical/types'
import type { GameMode } from '../../geography/types'
import { createHistoricalDeck, createHistoricalSequenceDeck, createHistoricalSequenceOrder, evaluateHistoricalGuess, evaluateHistoricalSequenceOrder, formatHistoricalYearRange, type HistoricalDifficulty, type HistoricalGuessResult, type HistoricalSequence, type HistoricalSequenceResult } from '../../puzzles/historical-geography'
import { useGameSession } from '../session'
import { useReorderFocus } from '../useReorderFocus'
import './historical-geography.css'

const difficultyOptions = [
  { value: 'easy', label: 'Easy · within 20 years' },
  { value: 'medium', label: 'Medium · within 8 years' },
  { value: 'hard', label: 'Hard · within 2 years' },
]

interface SavedHistoricalProgress {
  round?: unknown
  mapId?: unknown
  format?: unknown
  difficulty?: unknown
  guess?: unknown
  sequenceId?: unknown
  order?: unknown
  result?: unknown
  finished?: unknown
}

type HistoricalFormat = 'year' | 'sequence'

const historicalFormatOptions = [
  { value: 'year', label: 'Guess the year' },
  { value: 'sequence', label: 'Order three maps' },
]

export function HistoricalGeographyLegacyGame({ mode, seed, session }: { mode: GameMode; seed: string; session: ReturnType<typeof useGameSession> }) {
  const saved = session.progress as SavedHistoricalProgress | null
  const savedFormat: HistoricalFormat = isHistoricalFormat(saved?.format) ? saved.format : 'year'
  const savedDifficulty = isHistoricalDifficulty(saved?.difficulty) ? saved.difficulty : 'medium'
  const restoredRound = Number.isInteger(saved?.round) && Number(saved?.round) >= 0 ? Number(saved?.round) : 0
  const [format, setFormat] = useState<HistoricalFormat>(savedFormat)
  const [difficulty, setDifficulty] = useState<HistoricalDifficulty>(savedDifficulty)
  const [round, setRound] = useState(restoredRound)
  const [roundFinished, setRoundFinished] = useState(saved?.finished === true && savedFormat === format)
  const [maps, setMaps] = useState<HistoricalMap[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const deck = useMemo(() => maps ? createHistoricalDeck(maps, seed) : [], [maps, seed])
  const sequenceDeck = useMemo(() => maps ? createHistoricalSequenceDeck(maps, seed) : [], [maps, seed])
  const map = deck.length ? deck[round % deck.length] : undefined
  const sequence = sequenceDeck.length ? sequenceDeck[round % sequenceDeck.length] : undefined

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

  function changeFormat(value: string) {
    if (!isHistoricalFormat(value)) return
    setFormat(value)
    setRound(0)
    setRoundFinished(false)
  }

  const settings = mode === 'freeplay' && !roundFinished && <GameSettingsMenu label="Historical game settings">
    <div className="practice-config">
      <GameSettingSelect label="Format" value={format} options={historicalFormatOptions} onChange={changeFormat} />
      {format === 'year'
        ? <>
          <GameSettingSelect label="Difficulty" value={difficulty} options={difficultyOptions} onChange={(value) => setDifficulty(value as HistoricalDifficulty)} />
          <p className="historical-settings-note">The accepted year range is inclusive and appears with each result. Difficulty is tuned to the 1886–2011 snapshot collection.</p>
        </>
        : <p className="historical-settings-note">Reorder three unlabeled snapshots from oldest to newest. Each result reveals the dates and historical context.</p>}
    </div>
  </GameSettingsMenu>

  if (loadError) return <div className="game-body historical-geography-game">{settings}<InlineNotice title="The historical atlas could not open" tone="warning">{loadError} Reconnect and reopen Explore so the map catalogue can be cached for offline play.</InlineNotice></div>
  if (!maps || (format === 'year' ? !map : !sequence)) return <div className="game-body historical-geography-game">{settings}<LoadingState label="Opening the historical atlas…" /></div>

  const savedFormatMatches = historicalProgressFormatMatches(saved?.format, format)
  const savedForRound = savedFormatMatches && saved?.round === round ? saved : null

  return (
    <div className="game-body historical-geography-game">
      {settings}
      {format === 'year' && map
        ? <HistoricalMapRound
          key={`${round}:${map.id}`}
          map={map}
          mapsCount={deck.length}
          mode={mode}
          round={round}
          difficulty={difficulty}
          saved={savedForRound?.mapId === map.id && isHistoricalDifficulty(savedForRound.difficulty) ? savedForRound : null}
          saveProgress={session.saveProgress}
          save={session.save}
          saveError={session.saveError}
          onFinish={() => setRoundFinished(true)}
          onReplay={mode === 'freeplay' ? replay : undefined}
        />
        : sequence && <HistoricalSequenceRound
          key={`${round}:${sequence.id}`}
          sequence={sequence}
          sequenceCount={sequenceDeck.length}
          mode={mode}
          round={round}
          seed={seed}
          saved={savedForRound?.sequenceId === sequence.id && savedForRound.format === 'sequence' ? savedForRound : null}
          saveProgress={session.saveProgress}
          save={session.save}
          saveError={session.saveError}
          onFinish={() => setRoundFinished(true)}
          onReplay={mode === 'freeplay' ? replay : undefined}
        />}
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
      format: 'year',
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
    await saveProgress({ version: 1, format: 'year', round, mapId: map.id, difficulty, guess: String(guess), result: nextResult, finished: true })
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

function HistoricalSequenceRound({ sequence, sequenceCount, mode, round, seed, saved, saveProgress, save, saveError, onFinish, onReplay }: {
  sequence: HistoricalSequence
  sequenceCount: number
  mode: GameMode
  round: number
  seed: string
  saved: SavedHistoricalProgress | null
  saveProgress: (payload: Record<string, unknown>) => Promise<void>
  save: ReturnType<typeof useGameSession>['save']
  saveError: string
  onFinish: () => void
  onReplay?: () => void
}) {
  const canonicalOrder = sequence.maps
  const initialOrder = useMemo(() => createHistoricalSequenceOrder(sequence, `${seed}:round:${round}`), [round, seed, sequence])
  const mapById = useMemo(() => new Map(sequence.maps.map((map) => [map.id, map])), [sequence.maps])
  const restoredOrder = Array.isArray(saved?.order) && saved.order.length === 3
    && saved.order.every((id) => typeof id === 'string' && mapById.has(id))
    && new Set(saved.order).size === 3
    ? saved.order.map((id) => mapById.get(String(id))!)
    : initialOrder
  const [order, setOrder] = useState(restoredOrder)
  const [result, setResult] = useState<HistoricalSequenceResult | null>(isHistoricalSequenceResult(saved?.result) ? saved.result : null)
  const [showResults, setShowResults] = useState(false)
  const [orderAnnouncement, setOrderAnnouncement] = useState('')
  const orderIds = useMemo(() => order.map((map) => map.id), [order])
  const { buttonRef, rememberMove } = useReorderFocus(orderIds)
  const labels = useMemo(() => new Map(initialOrder.map((map, index) => [map.id, String.fromCharCode(65 + index)])), [initialOrder])

  useEffect(() => {
    if (!result) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const timer = window.setTimeout(() => setShowResults(true), reducedMotion ? 0 : 700)
    return () => window.clearTimeout(timer)
  }, [result])

  useEffect(() => {
    if (result) return
    void saveProgress({ version: 1, format: 'sequence', round, sequenceId: sequence.id, order: order.map((map) => map.id), finished: false })
  }, [order, result, round, saveProgress, sequence.id])

  function moveMap(index: number, direction: -1 | 1) {
    const destination = index + direction
    if (destination < 0 || destination >= order.length) return
    rememberMove(order[index]!.id, direction)
    const nextOrder = [...order]
    ;[nextOrder[index], nextOrder[destination]] = [nextOrder[destination]!, nextOrder[index]!]
    setOrder(nextOrder)
    setOrderAnnouncement(`Map ${labels.get(order[index]!.id)} moved to position ${destination + 1}.`)
  }

  async function submitSequence() {
    if (result) return
    const nextResult = evaluateHistoricalSequenceOrder(canonicalOrder.map((map) => map.id), order.map((map) => map.id))
    setResult(nextResult)
    onFinish()
    await saveProgress({ version: 1, format: 'sequence', round, sequenceId: sequence.id, order: order.map((map) => map.id), result: nextResult, finished: true })
    await save(nextResult.score, nextResult.correctPairs, nextResult.totalPairs, {
      historicalPuzzleId: `historical-geography:sequence:${sequence.id}:v1`,
      format: 'sequence',
      sequenceId: sequence.id,
      guessedMapIds: order.map((map) => map.id),
      answerMapIds: canonicalOrder.map((map) => map.id),
      answerYears: canonicalOrder.map((map) => map.depictedYear),
      correctPairs: nextResult.correctPairs,
      totalPairs: nextResult.totalPairs,
    })
  }

  return (
    <section className="historical-round historical-sequence-round" aria-labelledby="historical-round-title">
      <header className="historical-round-heading">
        <div>
          <span className="eyebrow">Historical geography · sequence {round % sequenceCount + 1} of {sequenceCount}</span>
          <h2 id="historical-round-title">Put the maps in order</h2>
          <p>Compare the boundary changes, then arrange these snapshots from oldest to newest.</p>
        </div>
        <div className="historical-round-meta" aria-label="Three-map chronological sequence"><Clock3 size={15} aria-hidden="true" /><span>Oldest → newest</span></div>
      </header>

      <ol className="historical-sequence-list" aria-label="Your current map order">
        {order.map((map, index) => {
          const label = labels.get(map.id) ?? 'Map'
          return (
            <li className="historical-sequence-item" key={map.id}>
              <figure className="historical-sequence-map">
                <img className="historical-map-image" src={map.assetUrl} alt={`Unlabeled world political-boundary snapshot, map ${label}.`} loading="lazy" decoding="async" />
                <figcaption><strong>Map {label}</strong><span>Position {index + 1}</span></figcaption>
              </figure>
              {!result && <div className="historical-sequence-controls" role="group" aria-label={`Reorder map ${label}`}>
                <button ref={buttonRef(map.id, -1)} type="button" className="button button-outline" aria-label={`Move map ${label} earlier`} disabled={index === 0} onClick={() => moveMap(index, -1)}><ArrowUp size={15} aria-hidden="true" /><span>Earlier</span></button>
                <button ref={buttonRef(map.id, 1)} type="button" className="button button-outline" aria-label={`Move map ${label} later`} disabled={index === order.length - 1} onClick={() => moveMap(index, 1)}><ArrowDown size={15} aria-hidden="true" /><span>Later</span></button>
              </div>}
            </li>
          )
        })}
      </ol>

      {!result
        ? <>
          <p className="historical-sequence-status" role="status">{orderAnnouncement || 'Use the Earlier and Later buttons to arrange the three maps.'}</p>
          <button type="button" className="button button-dark historical-sequence-submit" onClick={() => void submitSequence()}>Check sequence <Check size={16} aria-hidden="true" /></button>
        </>
        : <section className="historical-sequence-reveal" aria-live="polite" aria-labelledby="historical-sequence-reveal-title">
          <span className="eyebrow">{result.exact ? 'All pairings in order' : `${result.correctPairs} of ${result.totalPairs} map pairs in order`}</span>
          <h3 id="historical-sequence-reveal-title">The timeline, oldest to newest</h3>
          <ol className="historical-sequence-answer">
            {canonicalOrder.map((map, index) => <li key={map.id}>
              <strong><span>{index + 1}</span>{map.depictedYear.toLocaleString('en-US')}</strong>
              <p>{map.historicalContext}</p>
              <details className="historical-source-details">
                <summary>Map date and context sources</summary>
                <p>This is a Maproom-generated CShapes 2.1 snapshot dated <strong>{map.depictedDate}</strong>, not an archival map published in that year.</p>
                <p>{map.datingUncertainty}</p>
                <ul>{map.contextSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
              </details>
            </li>)}
          </ol>
          <p className="historical-sequence-attribution">CShapes 2.1 · Maproom-generated · ETH Zürich · CC BY-NC-SA 4.0 · non-commercial. <a href={canonicalOrder[0]!.source.licenseUrl} target="_blank" rel="noreferrer">License terms</a>.</p>
        </section>}

      <div className="historical-attribution">
        <span>CShapes 2.1 · Maproom-generated · ETH Zürich · CC BY-NC-SA 4.0 · non-commercial</span>
        <a href={canonicalOrder[0]!.source.originalUrl} target="_blank" rel="noreferrer">Source and reuse terms</a>
      </div>
      <GameResultsDialog
        complete={showResults}
        gameId="historical-geography"
        mode={mode}
        score={result?.score ?? 0}
        correct={result?.correctPairs ?? 0}
        total={result?.totalPairs ?? 3}
        title={result?.exact ? 'The maps are in order.' : `${result?.correctPairs ?? 0} of 3 map pairs are in order.`}
        message={result ? `Oldest to newest: ${canonicalOrder.map((map) => map.depictedYear.toLocaleString('en-US')).join(' → ')}.` : ''}
        saveError={saveError}
        onReplay={onReplay}
        replayLabel="Order another set"
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

function isHistoricalFormat(value: unknown): value is HistoricalFormat {
  return value === 'year' || value === 'sequence'
}

function historicalProgressFormatMatches(value: unknown, format: HistoricalFormat): boolean {
  return format === 'year' ? value === undefined || value === 'year' : value === 'sequence'
}

function isHistoricalGuessResult(value: unknown): value is HistoricalGuessResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<HistoricalGuessResult>
  return Number.isInteger(result.guess) && Number.isInteger(result.answer) && Number.isInteger(result.distance)
    && Number.isInteger(result.tolerance) && Number.isInteger(result.acceptedMinimum) && Number.isInteger(result.acceptedMaximum)
    && typeof result.withinTolerance === 'boolean' && Number.isInteger(result.score)
}

function isHistoricalSequenceResult(value: unknown): value is HistoricalSequenceResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<HistoricalSequenceResult>
  return Number.isInteger(result.correctPairs) && Number(result.correctPairs) >= 0 && Number(result.correctPairs) <= 3
    && result.totalPairs === 3 && Number.isInteger(result.score) && Number(result.score) >= 0 && Number(result.score) <= 1000
    && typeof result.exact === 'boolean'
}
