import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Compass, MapPin } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { AdvancedGameSettings, GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { useFreePlayFormat } from '../../components/FreePlaySetupContext'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { loadMajorCities } from '../../geography/data'
import { formatCoordinate } from '../../geography/coordinates'
import type { GeographyData, GameMode } from '../../geography/types'
import { countCorrectCityPositions, createCityOrderQuestion, moveCity, type LadderAxis } from '../../puzzles/latitudeLadder'
import { useGameSession } from '../session'

export function LatitudeLadderGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const selectedFormat = useFreePlayFormat()
  const axis: LadderAxis = selectedFormat === 'west-east' ? 'longitude' : 'latitude'
  const session = useGameSession('latitude-ladder', mode, date, seed)
  const initialScope = typeof session.progress?.scope === 'string' ? session.progress.scope : 'World'
  const [scope, setScope] = useState(initialScope)
  const restoredRound = Number.isInteger(session.progress?.round) && Number(session.progress?.round) >= 0 ? Number(session.progress?.round) : 0
  const [round, setRound] = useState(restoredRound)
  const [cityData, setCityData] = useState<Awaited<ReturnType<typeof loadMajorCities>> | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    loadMajorCities().then((loaded) => { if (active) setCityData(loaded) }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'The city gazetteer could not be loaded.')
    })
    return () => { active = false }
  }, [])

  const continents = useMemo(() => [...new Set(data.countries.map((country) => country.continent).filter((value): value is string => Boolean(value) && value !== 'Antarctic'))].sort(), [data.countries])
  const cityPool = useMemo(() => (cityData?.cities ?? []).filter((city) => {
    const country = data.countriesByCode.get(city.countryIso3)
    return city.population >= 100_000 && (scope === 'World' || country?.continent === scope)
  }), [cityData, data.countriesByCode, scope])
  const question = useMemo(() => createCityOrderQuestion(cityPool, axis, `${seed}:${scope}:${axis}:${round}`), [axis, cityPool, round, scope, seed])

  if (loadError) return <div className="game-body"><InlineNotice title="The city atlas could not open" tone="warning">{loadError}</InlineNotice></div>
  if (!cityData) return <LoadingState label="Opening the city gazetteer…" />
  if (!question) return <div className="game-body"><InlineNotice title={`Not enough cities in ${scope}`} tone="warning">Choose another city pool. Latitude Ladder needs five mapped cities with population of at least 100,000.</InlineNotice>
    {mode === 'freeplay' && <GameSettingsMenu><div className="practice-config"><GameSettingSelect label="City pool" value={scope} control="select" options={[{ value: 'World', label: 'World' }, ...continents.map((continent) => ({ value: continent, label: continent }))]} onChange={setScope} /></div></GameSettingsMenu>}
  </div>

  return (
    <LatitudeRound
      key={`${round}:${scope}:${axis}`}
      axis={axis}
      continents={continents}
      data={data}
      mode={mode}
      question={question}
      round={round}
      scope={scope}
      session={session}
      onRoundComplete={() => { session.resetSession(); setRound((value) => value + 1) }}
      onScope={setScope}
    />
  )
}

function LatitudeRound({ axis, continents, data, mode, question, round, scope, session, onRoundComplete, onScope }: {
  axis: LadderAxis
  continents: string[]
  data: GeographyData
  mode: GameMode
  question: NonNullable<ReturnType<typeof createCityOrderQuestion>>
  round: number
  scope: string
  session: ReturnType<typeof useGameSession>
  onRoundComplete: () => void
  onScope: (value: string) => void
}) {
  const saved = session.progress?.round === round && session.progress?.axis === axis && session.progress?.scope === scope ? session.progress : null
  const questionIds = useMemo(() => question.startingOrder.map((city) => city.id), [question.startingOrder])
  const [order, setOrder] = useState(() => restoredOrder(saved?.order, questionIds) ?? questionIds)
  const [finished, setFinished] = useState(() => saved?.finished === true)
  const [correctCount, setCorrectCount] = useState(() => typeof saved?.correctCount === 'number' ? saved.correctCount : 0)
  const [message, setMessage] = useState(() => typeof saved?.message === 'string' ? saved.message : '')
  const [score, setScore] = useState(() => typeof saved?.score === 'number' ? saved.score : 0)
  const { save, saveError, saveProgress } = session
  const cityById = useMemo(() => new Map(question.startingOrder.map((city) => [city.id, city])), [question.startingOrder])
  const orderedCities = order.flatMap((id) => cityById.get(id) ? [cityById.get(id)!] : [])
  const correctIds = question.correctOrder.map((city) => city.id)
  const isExact = correctCount === question.correctOrder.length
  const mapMarkers = finished ? question.correctOrder.map((city, index) => ({
    point: { lat: city.lat, lon: city.lon },
    kind: 'answer' as const,
    label: `${index + 1}. ${city.name}, ${data.countriesByCode.get(city.countryIso3)?.name ?? city.countryIso3}`,
  })) : []

  useEffect(() => {
    if (finished) return
    void saveProgress({ round, axis, scope, questionIds, order, finished, correctCount, message, score })
  }, [axis, correctCount, finished, message, order, questionIds, round, saveProgress, scope, score])

  async function checkOrder() {
    if (finished) return
    const correct = countCorrectCityPositions(order, question.correctOrder)
    const points = correct * 200
    setCorrectCount(correct)
    setScore(points)
    setFinished(true)
    setMessage(correct === 5 ? 'Perfect line. Every city is in its right place.' : `${correct} of 5 cities are in the right position. The map shows their true locations.`)
    await save(points, correct, question.correctOrder.length, { axis, scope, questionIds, order, correctPositions: correct })
  }

  function shift(index: number, direction: -1 | 1) {
    if (finished) return
    setOrder((current) => moveCity(current, index, direction))
  }

  const axisLabel = axis === 'latitude' ? 'north to south' : 'west to east'
  const startingEdge = axis === 'latitude' ? 'North' : 'West'
  const endingEdge = axis === 'latitude' ? 'South' : 'East'

  return (
    <div className="game-body latitude-ladder-game-body">
      <div className="latitude-ladder-prompt">
        <div><span className="eyebrow">Five cities · {scope} · round {round + 1}</span><h2>Set the cities in a line</h2><p>Use your mental map to place these cities from {axisLabel}. Move each place with its arrow buttons, then check your order.</p></div>
        <div className="latitude-ladder-tools">
          {mode === 'freeplay' && <GameSettingsMenu><div className="practice-config">
            <GameSettingSelect label="City pool" value={scope} control="select" options={[{ value: 'World', label: 'World' }, ...continents.map((continent) => ({ value: continent, label: continent }))]} onChange={onScope} />
            <AdvancedGameSettings><span className="practice-config-note">Questions use GeoNames populated places with known coordinates and population of at least 100,000.</span></AdvancedGameSettings>
          </div></GameSettingsMenu>}
          <span className="latitude-axis-badge"><Compass size={15} aria-hidden="true" /> {axis === 'latitude' ? 'Latitude' : 'Longitude'}</span>
        </div>
      </div>
      <div className="latitude-ladder-board">
        <div className="latitude-order-panel">
          <div className="latitude-edge-label"><span>{startingEdge}</span><span>{axis === 'latitude' ? '90° N' : '180° W'}</span></div>
          <ol className="latitude-order-list" aria-label={`Cities ordered ${axisLabel}`}>
            {orderedCities.map((city, index) => {
              const country = data.countriesByCode.get(city.countryIso3)
              const placedCorrectly = finished && city.id === correctIds[index]
              return <li key={city.id} className={finished ? placedCorrectly ? 'is-correct' : 'is-misplaced' : ''}>
                <span className="latitude-order-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="latitude-city-label"><strong>{city.name}</strong><small>{country?.name ?? city.countryIso3}</small></span>
                {finished
                  ? <span className="latitude-city-coordinate">{formatCoordinate(axis === 'latitude' ? city.lat : city.lon, axis)}</span>
                  : <span className="latitude-move-controls"><button type="button" aria-label={`Move ${city.name} earlier`} title="Move earlier" disabled={index === 0} onClick={() => shift(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button><button type="button" aria-label={`Move ${city.name} later`} title="Move later" disabled={index === orderedCities.length - 1} onClick={() => shift(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button></span>}
              </li>
            })}
          </ol>
          <div className="latitude-edge-label"><span>{endingEdge}</span><span>{axis === 'latitude' ? '90° S' : '180° E'}</span></div>
          {!finished && <button className="button button-dark latitude-check-button" type="button" onClick={() => void checkOrder()}>Check the line <Check size={16} aria-hidden="true" /></button>}
          {message && <p className="latitude-order-message" role="status">{message}</p>}
        </div>
        <div className="latitude-map-stage"><GeoMap features={data.features} markers={mapMarkers} hideFeatureNames showHoverLabels={false} ariaLabel={finished ? 'World map showing the correct city locations' : 'Unmarked world map for the city ordering puzzle'} /></div>
      </div>
      <p className="map-source-note latitude-source-note"><MapPin size={13} aria-hidden="true" /> City coordinates: GeoNames · map boundaries: Natural Earth</p>
      <GameResultsDialog complete={finished} gameId="latitude-ladder" mode={mode} score={score} correct={correctCount} total={question.correctOrder.length} title={isExact ? 'A perfect line.' : 'The cities are mapped.'} message={`${correctCount} of 5 cities were in the right position.`} saveError={saveError} onReplay={mode === 'freeplay' ? onRoundComplete : undefined} replayLabel="Build another line" />
    </div>
  )
}

function restoredOrder(value: unknown, expectedIds: string[]): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === 'string')) return undefined
  if (value.length !== expectedIds.length || new Set(value).size !== expectedIds.length) return undefined
  const expected = new Set(expectedIds)
  return value.every((id) => expected.has(id)) ? value : undefined
}
