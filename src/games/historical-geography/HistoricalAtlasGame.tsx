import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, Clock3, Minus, Plus, RotateCcw } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadHistoricalAtlasMaps } from '../../geography/historical/loader'
import type { HistoricalAtlasMap } from '../../geography/historical/types'
import type { GameMode } from '../../geography/types'
import {
  createHistoricalAtlasDeck,
  createHistoricalAtlasSequenceDeck,
  createHistoricalAtlasSequenceOrder,
  evaluateHistoricalAtlasGuess,
  evaluateHistoricalSequenceOrder,
  formatHistoricalDateRange,
  formatHistoricalYear,
  parseHistoricalYearInput,
  type HistoricalAtlasGuessResult,
  type HistoricalAtlasSequence,
  type HistoricalDifficulty,
  type HistoricalEra,
  type HistoricalSequenceResult,
  type HistoricalYearEra,
} from '../../puzzles/historical-geography'
import { type useGameSession } from '../session'
import { useReorderFocus } from '../useReorderFocus'
import './historical-geography.css'

type Session = ReturnType<typeof useGameSession>
type HistoricalFormat = 'year' | 'sequence'

interface SavedAtlasProgress {
  version?: unknown
  round?: unknown
  format?: unknown
  era?: unknown
  difficulty?: unknown
  mapId?: unknown
  sequenceId?: unknown
  guess?: unknown
  guessEra?: unknown
  result?: unknown
  order?: unknown
  finished?: unknown
}

const difficultyOptions = [
  { value: 'easy', label: 'Guided · broader scoring window' },
  { value: 'medium', label: 'Standard · balanced scoring' },
  { value: 'hard', label: 'Challenge · tighter scoring' },
]

const formatOptions = [
  { value: 'year', label: 'Guess the date' },
  { value: 'sequence', label: 'Order similar maps' },
]

const eraOptions = [
  { value: 'all', label: 'All history' },
  { value: 'ancient', label: 'Ancient · before 500 BCE' },
  { value: 'classical', label: 'Classical · 500 BCE–499 CE' },
  { value: 'medieval', label: 'Medieval · 500–1499 CE' },
  { value: 'early-modern', label: 'Early modern · 1500–1799 CE' },
  { value: 'modern', label: 'Modern · 1800 CE onward' },
]

export function HistoricalAtlasGame({ mode, seed, session }: { mode: GameMode; seed: string; session: Session }) {
  const saved = session.progress as SavedAtlasProgress | null
  const [format, setFormat] = useState<HistoricalFormat>(isHistoricalFormat(saved?.format) ? saved.format : 'year')
  const [era, setEra] = useState<HistoricalEra>(isHistoricalEra(saved?.era) ? saved.era : 'all')
  const [difficulty, setDifficulty] = useState<HistoricalDifficulty>(isHistoricalDifficulty(saved?.difficulty) ? saved.difficulty : 'medium')
  const [round, setRound] = useState(saved && Number.isInteger(saved.round) && Number(saved.round) >= 0 ? Number(saved.round) : 0)
  const [roundFinished, setRoundFinished] = useState(saved?.version === 2 && saved?.finished === true)
  const [maps, setMaps] = useState<HistoricalAtlasMap[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const deck = useMemo(() => maps ? createHistoricalAtlasDeck(maps, seed, era) : [], [maps, seed, era])
  const sequenceDeck = useMemo(() => maps ? createHistoricalAtlasSequenceDeck(maps, seed) : [], [maps, seed])
  const expectedMapId = saved?.version === 2 && saved?.round === round && saved?.format === format && typeof saved?.mapId === 'string' ? saved.mapId : null
  const map = deck.find((candidate) => candidate.id === expectedMapId) ?? (deck.length ? deck[round % deck.length] : undefined)
  const expectedSequenceId = saved?.version === 2 && saved?.round === round && saved?.format === format && typeof saved?.sequenceId === 'string' ? saved.sequenceId : null
  const sequence = sequenceDeck.find((candidate) => candidate.id === expectedSequenceId) ?? (sequenceDeck.length ? sequenceDeck[round % sequenceDeck.length] : undefined)

  useEffect(() => {
    let active = true
    loadHistoricalAtlasMaps().then((loaded) => { if (active) setMaps(loaded) }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Historical atlas data could not be loaded.')
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
    session.resetSession()
    setFormat(value)
    setRound(0)
    setRoundFinished(false)
  }

  function changeEra(value: string) {
    if (!isHistoricalEra(value)) return
    session.resetSession()
    setEra(value)
    setRound(0)
    setRoundFinished(false)
  }

  function changeDifficulty(value: string) {
    if (!isHistoricalDifficulty(value)) return
    session.resetSession()
    setDifficulty(value)
    setRound(0)
    setRoundFinished(false)
  }

  const settings = mode === 'freeplay' && !roundFinished && <GameSettingsMenu label="Historical geography settings">
    <div className="practice-config">
      <GameSettingSelect label="Format" value={format} options={formatOptions} onChange={changeFormat} />
      {format === 'year'
        ? <>
          <GameSettingSelect label="Period" value={era} options={eraOptions} onChange={changeEra} />
          <GameSettingSelect label="Difficulty" value={difficulty} options={difficultyOptions} onChange={changeDifficulty} />
          <p className="historical-settings-note">Each result uses the source’s inclusive date range. BCE and CE dates have no year zero.</p>
        </>
        : <p className="historical-settings-note">Order three maps of the same polity and region. The sequence set uses non-overlapping source periods.</p>}
    </div>
  </GameSettingsMenu>

  if (loadError) return <div className="game-body historical-geography-game">{settings}<InlineNotice title="The historical atlas could not open" tone="warning">{loadError} Reconnect and reopen the game so the maps can be cached for offline play.</InlineNotice></div>
  if (!maps || (format === 'year' ? !map : !sequence)) return <div className="game-body historical-geography-game">{settings}<LoadingState label="Opening the historical atlas…" /></div>

  const savedForRound = saved?.version === 2 && saved.format === format && saved.round === round ? saved : null
  return <div className="game-body historical-geography-game">
    {settings}
    {format === 'year' && map
      ? <HistoricalAtlasYearRound
        key={`${round}:${map.id}`}
        map={map}
        mapNumber={deck.findIndex((item) => item.id === map.id) + 1}
        mapsCount={deck.length}
        mode={mode}
        round={round}
        era={era}
        difficulty={difficulty}
        saved={savedForRound?.mapId === map.id ? savedForRound : null}
        saveProgress={session.saveProgress}
        save={session.save}
        saveError={session.saveError}
        onFinish={() => setRoundFinished(true)}
        onReplay={mode === 'freeplay' ? replay : undefined}
      />
      : sequence && <HistoricalAtlasSequenceRound
        key={`${round}:${sequence.id}`}
        sequence={sequence}
        sequenceNumber={sequenceDeck.findIndex((item) => item.id === sequence.id) + 1}
        sequenceCount={sequenceDeck.length}
        mode={mode}
        round={round}
        seed={seed}
        saved={savedForRound?.sequenceId === sequence.id ? savedForRound : null}
        saveProgress={session.saveProgress}
        save={session.save}
        saveError={session.saveError}
        onFinish={() => setRoundFinished(true)}
        onReplay={mode === 'freeplay' ? replay : undefined}
      />}
  </div>
}

function HistoricalAtlasYearRound({ map, mapNumber, mapsCount, mode, round, era, difficulty, saved, saveProgress, save, saveError, onFinish, onReplay }: {
  map: HistoricalAtlasMap
  mapNumber: number
  mapsCount: number
  mode: GameMode
  round: number
  era: HistoricalEra
  difficulty: HistoricalDifficulty
  saved: SavedAtlasProgress | null
  saveProgress: (payload: Record<string, unknown>) => Promise<void>
  save: Session['save']
  saveError: string
  onFinish: () => void
  onReplay?: () => void
}) {
  const restoredGuess = typeof saved?.guess === 'string' ? saved.guess : ''
  const restoredEra: HistoricalYearEra = saved?.guessEra === 'BCE' || saved?.guessEra === 'CE' ? saved.guessEra : map.sampleYear < 0 ? 'BCE' : 'CE'
  const [guessInput, setGuessInput] = useState(restoredGuess)
  const [guessEra, setGuessEra] = useState<HistoricalYearEra>(restoredEra)
  const [result, setResult] = useState<HistoricalAtlasGuessResult | null>(isAtlasGuessResult(saved?.result) ? saved.result : null)
  const [inputError, setInputError] = useState('')
  const [imageError, setImageError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (!result) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const timer = window.setTimeout(() => setShowResults(true), reducedMotion ? 0 : 700)
    return () => window.clearTimeout(timer)
  }, [result])

  useEffect(() => {
    if (result) return
    void saveProgress({ version: 2, format: 'year', era, difficulty, round, mapId: map.id, guess: guessInput, guessEra, finished: false })
  }, [difficulty, era, guessEra, guessInput, map.id, round, result, saveProgress])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (result) return
    const guessYear = parseHistoricalYearInput(guessInput, guessEra)
    if (guessYear === null) {
      setInputError(`Enter a whole ${guessEra} year from 1 to 9999.`)
      return
    }
    const nextResult = evaluateHistoricalAtlasGuess(map, guessYear, difficulty)
    setInputError('')
    setResult(nextResult)
    onFinish()
    await saveProgress({ version: 2, format: 'year', era, difficulty, round, mapId: map.id, guess: guessInput, guessEra, result: nextResult, finished: true })
    await save(nextResult.score, nextResult.withinTolerance ? 1 : 0, 1, {
      historicalPuzzleId: `historical-geography:${map.id}:v2`,
      contentVersion: 'cliopatria-v0.2.1',
      mapId: map.id,
      sampleYear: map.sampleYear,
      acceptedFromYear: map.acceptedFromYear,
      acceptedToYear: map.acceptedToYear,
      guessYear,
      distance: nextResult.distance,
      difficulty,
      era,
      tolerance: nextResult.tolerance,
      withinSourcePeriod: nextResult.withinAcceptedInterval,
    })
  }

  return <section className="historical-round historical-atlas-round" aria-labelledby="historical-atlas-round-title">
    <header className="historical-round-heading">
      <div>
        <span className="eyebrow">Historical geography · map {mapNumber} of {mapsCount}</span>
        <h2 id="historical-atlas-round-title">When does this map belong?</h2>
        <p>Read the regional outline and clue, then estimate the period it depicts.</p>
      </div>
      <div className="historical-round-meta" aria-label={`${difficulty} difficulty`}><Clock3 size={15} aria-hidden="true" /><span>{difficultyOptions.find((option) => option.value === difficulty)?.label.split(' · ')[0]}</span></div>
    </header>

    <div className="historical-atlas-clue"><span className="eyebrow">Clue · {map.region.name}</span><p>{map.visibleClue}</p></div>

    <figure className={`historical-map-frame historical-atlas-frame${result ? ' is-revealed' : ''}`}>
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

    {!result ? <form className="historical-guess-form historical-era-guess-form" onSubmit={(event) => void submit(event)} noValidate>
      <label htmlFor="historical-atlas-year-guess">Your year estimate</label>
      <div className="historical-year-entry">
        <input id="historical-atlas-year-guess" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9,]*" maxLength={7} value={guessInput} onChange={(event) => { setGuessInput(event.target.value); setInputError('') }} placeholder="e.g. 2500" aria-describedby={inputError ? 'historical-atlas-year-error' : 'historical-atlas-year-hint'} />
        <select aria-label="BCE or CE" value={guessEra} onChange={(event) => setGuessEra(event.target.value as HistoricalYearEra)}>
          <option value="BCE">BCE</option><option value="CE">CE</option>
        </select>
        <button className="button button-dark" type="submit">Reveal period <Check size={16} aria-hidden="true" /></button>
      </div>
      <p id={inputError ? 'historical-atlas-year-error' : 'historical-atlas-year-hint'} className={inputError ? 'historical-input-error' : 'historical-input-hint'} role={inputError ? 'alert' : undefined}>{inputError || 'Use the separate BCE/CE control. There is no year zero.'}</p>
    </form> : <HistoricalAtlasReveal map={map} result={result} guessEra={guessEra} guessInput={guessInput} difficulty={difficulty} />}

    <div className="historical-attribution historical-atlas-attribution">
      <span>{map.polities.length === 1 ? 'One selected polity · no complete world partition' : 'Selected political entities · not a complete world partition'}</span>
      <span>Cliopatria v0.2.1 · CC BY 4.0</span>
      <a href="https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.1" target="_blank" rel="noreferrer">Source and reuse terms</a>
    </div>
    <GameResultsDialog
      complete={showResults}
      gameId="historical-geography"
      mode={mode}
      score={result?.score ?? 0}
      correct={result?.withinTolerance ? 1 : 0}
      total={1}
      title={result?.withinAcceptedInterval ? 'Inside the source period.' : result?.withinTolerance ? 'Close to the source period.' : 'The source period is revealed.'}
      message={result ? `${formatHistoricalYear(map.sampleYear)} · ${result.distance} ${result.distance === 1 ? 'year' : 'years'} from the accepted interval.` : ''}
      saveError={saveError}
      onReplay={onReplay}
      replayLabel="Study another map"
    />
  </section>
}

function HistoricalAtlasReveal({ map, result, guessEra, guessInput, difficulty }: { map: HistoricalAtlasMap; result: HistoricalAtlasGuessResult; guessEra: HistoricalYearEra; guessInput: string; difficulty: HistoricalDifficulty }) {
  const acceptedRange = formatHistoricalDateRange(map.acceptedFromYear, map.acceptedToYear)
  const guessYear = parseHistoricalYearInput(guessInput, guessEra)
  const entities = map.polities.map((polity) => polity.wikipediaUrl
    ? <a key={polity.name} href={polity.wikipediaUrl} target="_blank" rel="noreferrer">{polity.name}</a>
    : <strong key={polity.name}>{polity.name}</strong>)
  return <section className={`historical-reveal historical-atlas-reveal${result.withinTolerance ? ' is-within-range' : ' is-outside-range'}`} aria-live="polite" aria-labelledby="historical-atlas-reveal-title">
    <div className="historical-reveal-result">
      <span className="historical-reveal-icon" aria-hidden="true">{result.withinTolerance ? <Check size={18} /> : <Clock3 size={18} />}</span>
      <div><span className="eyebrow">Source-supported period</span><h3 id="historical-atlas-reveal-title">{acceptedRange}</h3></div>
      <p className="historical-distance">{result.distance.toLocaleString('en-US')}<span>years from interval</span></p>
    </div>
    <p className="historical-range-note">Your answer: <strong>{guessYear === null ? '—' : formatHistoricalYear(guessYear)}</strong>. {difficulty} tolerance: <strong>±{result.tolerance.toLocaleString('en-US')} years</strong> beyond the source period. Score: <strong>{result.score.toLocaleString('en-US')}</strong> / 1,000.</p>
    <p className="historical-range-note">The visible clue was: <strong>{map.visibleClue}</strong></p>
    <p className="historical-context">{map.historicalContext}</p>
    <p className="historical-range-note">Selected polity: {entities}.</p>
    <details className="historical-source-details">
      <summary>Dates, reconstruction limits and sources</summary>
      <p>Sample frame: <strong>{formatHistoricalYear(map.sampleYear)}</strong>. The accepted period is the inclusive Cliopatria interval <strong>{acceptedRange}</strong>; it is not an exact archival date.</p>
      <p>{map.uncertainty}</p>
      <p>This is a Maproom-generated regional outline derived from a scholarly reconstruction, not a contemporary historical map. A blank area means the selected source did not draw this polity there, not that no society existed.</p>
      <ul>{map.contextSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}<li><a href="https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.1" target="_blank" rel="noreferrer">Cliopatria v0.2.1 data and documentation</a></li></ul>
      <p>Attribution: Cliopatria v0.2.1 by the Seshat Global History Databank, CC BY 4.0. Maproom clipped, oriented, simplified and rendered these source polygons. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">License terms</a>.</p>
    </details>
  </section>
}

function HistoricalAtlasSequenceRound({ sequence, sequenceNumber, sequenceCount, mode, round, seed, saved, saveProgress, save, saveError, onFinish, onReplay }: {
  sequence: HistoricalAtlasSequence
  sequenceNumber: number
  sequenceCount: number
  mode: GameMode
  round: number
  seed: string
  saved: SavedAtlasProgress | null
  saveProgress: (payload: Record<string, unknown>) => Promise<void>
  save: Session['save']
  saveError: string
  onFinish: () => void
  onReplay?: () => void
}) {
  const initialOrder = useMemo(() => createHistoricalAtlasSequenceOrder(sequence, `${seed}:round:${round}`), [round, seed, sequence])
  const mapById = useMemo(() => new Map(sequence.maps.map((map) => [map.id, map])), [sequence.maps])
  const restoredOrder = Array.isArray(saved?.order) && saved.order.length === 3
    && saved.order.every((id) => typeof id === 'string' && mapById.has(id))
    && new Set(saved.order).size === 3
    ? saved.order.map((id) => mapById.get(String(id))!)
    : initialOrder
  const [order, setOrder] = useState(restoredOrder)
  const [result, setResult] = useState<HistoricalSequenceResult | null>(isSequenceResult(saved?.result) ? saved.result : null)
  const [showResults, setShowResults] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const orderIds = useMemo(() => order.map((map) => map.id), [order])
  const { buttonRef, rememberMove } = useReorderFocus(orderIds)
  const labels = useMemo(() => new Map(initialOrder.map((map, index) => [map.id, String.fromCharCode(65 + index)])), [initialOrder])
  const polity = sequence.maps[0]?.polities[0]?.name ?? 'Historical polity'

  useEffect(() => {
    if (!result) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const timer = window.setTimeout(() => setShowResults(true), reducedMotion ? 0 : 700)
    return () => window.clearTimeout(timer)
  }, [result])

  useEffect(() => {
    if (result) return
    void saveProgress({ version: 2, format: 'sequence', round, sequenceId: sequence.id, order: order.map((map) => map.id), finished: false })
  }, [order, result, round, saveProgress, sequence.id])

  function moveMap(index: number, direction: -1 | 1) {
    const destination = index + direction
    if (destination < 0 || destination >= order.length) return
    rememberMove(order[index]!.id, direction)
    const nextOrder = [...order]
    ;[nextOrder[index], nextOrder[destination]] = [nextOrder[destination]!, nextOrder[index]!]
    setOrder(nextOrder)
    setAnnouncement(`Map ${labels.get(order[index]!.id)} moved to position ${destination + 1}.`)
  }

  async function submitSequence() {
    if (result) return
    const canonicalOrder = sequence.maps
    const nextResult = evaluateHistoricalSequenceOrder(canonicalOrder.map((map) => map.id), order.map((map) => map.id))
    setResult(nextResult)
    onFinish()
    await saveProgress({ version: 2, format: 'sequence', round, sequenceId: sequence.id, order: order.map((map) => map.id), result: nextResult, finished: true })
    await save(nextResult.score, nextResult.correctPairs, nextResult.totalPairs, {
      historicalPuzzleId: `historical-geography:sequence:${sequence.id}:v2`,
      contentVersion: 'cliopatria-v0.2.1',
      format: 'sequence',
      sequenceId: sequence.id,
      guessedMapIds: order.map((map) => map.id),
      answerMapIds: canonicalOrder.map((map) => map.id),
      answerRanges: canonicalOrder.map((map) => [map.acceptedFromYear, map.acceptedToYear]),
    })
  }

  return <section className="historical-round historical-sequence-round" aria-labelledby="historical-atlas-sequence-title">
    <header className="historical-round-heading"><div><span className="eyebrow">Historical geography · sequence {sequenceNumber} of {sequenceCount}</span><h2 id="historical-atlas-sequence-title">Order the {polity} maps</h2><p>Compare outlines from the same regional frame, then arrange them from earliest to latest.</p></div><div className="historical-round-meta"><Clock3 size={15} aria-hidden="true" /><span>Oldest → newest</span></div></header>
    <ol className="historical-sequence-list" aria-label="Your current map order">
      {order.map((map, index) => {
        const label = labels.get(map.id) ?? 'Map'
        return <li className="historical-sequence-item" key={map.id}>
          <figure className="historical-sequence-map"><img className="historical-map-image" src={map.assetUrl} alt={`Unlabeled ${map.region.name} territorial outline, map ${label}.`} loading="lazy" decoding="async" /><figcaption><strong>Map {label}</strong><span>Position {index + 1}</span></figcaption></figure>
          {!result && <div className="historical-sequence-controls" role="group" aria-label={`Reorder map ${label}`}><button ref={buttonRef(map.id, -1)} type="button" className="button button-outline" aria-label={`Move map ${label} earlier`} disabled={index === 0} onClick={() => moveMap(index, -1)}><ArrowUp size={15} aria-hidden="true" /><span>Earlier</span></button><button ref={buttonRef(map.id, 1)} type="button" className="button button-outline" aria-label={`Move map ${label} later`} disabled={index === order.length - 1} onClick={() => moveMap(index, 1)}><ArrowDown size={15} aria-hidden="true" /><span>Later</span></button></div>}
        </li>
      })}
    </ol>
    {!result ? <><p className="historical-sequence-status" role="status">{announcement || 'Use the Earlier and Later buttons to arrange the map sequence.'}</p><button type="button" className="button button-dark historical-sequence-submit" onClick={() => void submitSequence()}>Check sequence <Check size={16} aria-hidden="true" /></button></> : <section className="historical-sequence-reveal" aria-live="polite"><span className="eyebrow">{result.exact ? 'All periods in order' : `${result.correctPairs} of ${result.totalPairs} map pairs in order`}</span><h3>Source periods, oldest to newest</h3><ol className="historical-sequence-answer">{sequence.maps.map((map, index) => <li key={map.id}><strong><span>{index + 1}</span>{formatHistoricalDateRange(map.acceptedFromYear, map.acceptedToYear)}</strong><p>{map.historicalContext}</p></li>)}</ol></section>}
    <div className="historical-attribution historical-atlas-attribution"><span>{polity} · {sequence.maps[0]!.region.name}</span><span>Cliopatria v0.2.1 · CC BY 4.0</span><a href="https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.1" target="_blank" rel="noreferrer">Source and reuse terms</a></div>
    <GameResultsDialog complete={showResults} gameId="historical-geography" mode={mode} score={result?.score ?? 0} correct={result?.correctPairs ?? 0} total={result?.totalPairs ?? 3} title={result?.exact ? 'The maps are in order.' : `${result?.correctPairs ?? 0} of 3 map pairs are in order.`} message={result ? `Compare the three ${polity} periods and read the context below.` : ''} saveError={saveError} onReplay={onReplay} replayLabel="Order another set" />
  </section>
}

function isHistoricalFormat(value: unknown): value is HistoricalFormat { return value === 'year' || value === 'sequence' }
function isHistoricalDifficulty(value: unknown): value is HistoricalDifficulty { return value === 'easy' || value === 'medium' || value === 'hard' }
function isHistoricalEra(value: unknown): value is HistoricalEra { return ['all', 'ancient', 'classical', 'medieval', 'early-modern', 'modern'].includes(String(value)) }
function isAtlasGuessResult(value: unknown): value is HistoricalAtlasGuessResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<HistoricalAtlasGuessResult>
  return Number.isInteger(result.guessYear) && result.guessYear !== 0 && Number.isInteger(result.distance)
    && Number.isInteger(result.tolerance) && Number.isInteger(result.acceptedFromYear) && Number.isInteger(result.acceptedToYear)
    && typeof result.withinAcceptedInterval === 'boolean' && typeof result.withinTolerance === 'boolean' && Number.isInteger(result.score)
}
function isSequenceResult(value: unknown): value is HistoricalSequenceResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<HistoricalSequenceResult>
  return Number.isInteger(result.correctPairs) && Number(result.correctPairs) >= 0 && Number(result.correctPairs) <= 3
    && result.totalPairs === 3 && Number.isInteger(result.score) && Number(result.score) >= 0 && Number(result.score) <= 1000
    && typeof result.exact === 'boolean'
}
