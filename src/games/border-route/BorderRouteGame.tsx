import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Lightbulb, Route as RouteIcon } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice } from '../../components/Kit'
import { AdvancedGameSettings, GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { GameResultsDialog } from '../../components/GameResults'
import type { GeographyData, GameMode } from '../../geography/types'
import { buildAdjacency, findRouteOrdering, generateRoutePuzzle, resolveCountryAnswer, shortestPath, type RouteDifficulty } from '../../puzzles/engine'
import { useGameSession } from '../session'
import { eligibleCountries, eligibleFeatures, initialGeographyEligibility, isStandardCountry, type GeographyEligibility } from '../../geography/eligibility'
import { useAppData } from '../../app/useAppData'

export function BorderRouteGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [round, setRound] = useState(0)
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
  const [scope, setScope] = useState('World')
  const [difficulty, setDifficulty] = useState<RouteDifficulty>('standard')
  const countries = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const continents = useMemo(() => [...new Set(countries.map((country) => country.continent).filter((value): value is string => Boolean(value)))].filter((value) => value !== 'Antarctic').sort(), [countries])
  const scopes = useMemo(() => ['World', ...continents.filter((continent) => {
    const regionalCountries = countries.filter((country) => country.continent === continent)
    return [...buildAdjacency(regionalCountries).values()].some((neighbors) => neighbors.length > 0)
  })], [continents, countries])
  const roundSeed = mode === 'daily' ? seed : `${seed}:${round}:${scope}:${difficulty}:${eligibility}`
  return <RouteRound key={roundSeed} data={data} countries={countries} mode={mode} date={date} seed={roundSeed} scope={scope} scopes={scopes} difficulty={difficulty} eligibility={eligibility} onEligibility={setEligibility} onScope={setScope} onDifficulty={setDifficulty} onReplay={() => setRound((value) => value + 1)} />
}

function RouteRound({ data, countries, mode, date, seed, scope, scopes, difficulty, eligibility, onEligibility, onScope, onDifficulty, onReplay }: { data: GeographyData; countries: GeographyData['countries']; mode: GameMode; date: string; seed: string; scope: string; scopes: string[]; difficulty: RouteDifficulty; eligibility: GeographyEligibility; onEligibility: (value: GeographyEligibility) => void; onScope: (scope: string) => void; onDifficulty: (difficulty: RouteDifficulty) => void; onReplay: () => void }) {
  const session = useGameSession('routes', mode, date, seed)
  const progress = mode === 'daily' ? session.progress : null
  const routeCountries = useMemo(() => {
    const savedCodes = Array.isArray(progress?.countryCodes) ? progress.countryCodes.filter((code): code is string => typeof code === 'string') : []
    return mode === 'daily' && savedCodes.length > 1
      ? data.countries.filter((country) => savedCodes.includes(country.iso3) && country.hasGeometry)
      : countries
  }, [progress, mode, data.countries, countries])
  const graphCountries = useMemo(() => mode === 'freeplay' && scope !== 'World' ? routeCountries.filter((country) => country.continent === scope) : routeCountries, [routeCountries, mode, scope])
  const adjacency = useMemo(() => buildAdjacency(graphCountries), [graphCountries])
  const generatedPuzzle = useMemo(() => generateRoutePuzzle(graphCountries, `${seed}:route`, mode === 'freeplay' ? { continent: scope, difficulty } : undefined), [graphCountries, seed, mode, scope, difficulty])
  const puzzle = useMemo(() => {
    const start = progress?.start
    const end = progress?.end
    const shortest = Array.isArray(progress?.shortest) ? progress.shortest.filter((code): code is string => typeof code === 'string') : []
    const validSaved = typeof start === 'string' && typeof end === 'string' && shortest.length >= 2
      && shortest[0] === start && shortest.at(-1) === end
      && shortest.every((code, index) => graphCountries.some((country) => country.iso3 === code) && (index === 0 || Boolean(adjacency.get(shortest[index - 1]!)?.includes(code))))
    return validSaved ? { start: start as string, end: end as string, shortest } : generatedPuzzle
  }, [progress, graphCountries, adjacency, generatedPuzzle])
  const start = graphCountries.find((country) => country.iso3 === puzzle.start)
  const end = graphCountries.find((country) => country.iso3 === puzzle.end)
  const [selectedCountries, setSelectedCountries] = useState<string[]>(() => restoreRouteSelection(progress?.selectedCountries, progress?.route, puzzle.start, puzzle.end, graphCountries))
  const [input, setInput] = useState(() => typeof progress?.input === 'string' ? progress.input : '')
  const [error, setError] = useState(() => typeof progress?.error === 'string' ? progress.error : '')
  const [hintShown, setHintShown] = useState(() => typeof progress?.hintShown === 'string' ? progress.hintShown : '')
  const [hintsUsed, setHintsUsed] = useState(() => typeof progress?.hintsUsed === 'number' ? progress.hintsUsed : 0)
  const [finished, setFinished] = useState(() => progress?.finished === true)
  const [finalScore, setFinalScore] = useState(() => typeof progress?.finalScore === 'number' ? progress.finalScore : 0)
  const { save, saveError, saveProgress } = session
  const suggestions: Suggestion[] = useMemo(() => graphCountries.filter((country) => country.iso3 !== puzzle.start && country.iso3 !== puzzle.end).map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [graphCountries, puzzle.start, puzzle.end])
  const routeOrdering = useMemo(() => findRouteOrdering(puzzle.start, puzzle.end, selectedCountries, adjacency), [puzzle.start, puzzle.end, selectedCountries, adjacency])
  const routeNames = (routeOrdering ?? []).map((code) => data.countriesByCode.get(code)?.name ?? code)
  const selectedNames = selectedCountries.map((code) => ({ code, name: data.countriesByCode.get(code)?.name ?? code }))
  const focusCodes = [...new Set([puzzle.start, puzzle.end, ...selectedCountries])]
  const mapEligibility: GeographyEligibility = routeCountries.some((country) => !isStandardCountry(country.iso3)) ? 'extended' : eligibility

  useEffect(() => {
    if (mode !== 'daily' || finished) return
    void saveProgress({ selectedCountries, route: routeOrdering ?? [puzzle.start, ...selectedCountries], input, error, hintShown, hintsUsed, finished, finalScore, start: puzzle.start, end: puzzle.end, shortest: puzzle.shortest, countryCodes: routeCountries.map((country) => country.iso3) })
  }, [mode, finished, selectedCountries, routeOrdering, input, error, hintShown, hintsUsed, finalScore, puzzle, routeCountries, saveProgress])

  if (!start || !end) return <InlineNotice title="The route could not be built" tone="warning">This pair is not available in the current border data. Return to the library and choose another game.</InlineNotice>

  async function addCountry(code: string) {
    if (finished) return
    const country = graphCountries.find((item) => item.iso3 === code)
    if (!country || !adjacency.has(code) || code === puzzle.start || code === puzzle.end) {
      setError('Choose a country from the list.')
      return
    }
    if (selectedCountries.includes(code)) {
      setError(`${country.name} is already selected. Remove it from the set to try again.`)
      return
    }
    const nextSelected = [...selectedCountries, code]
    const nextOrdering = findRouteOrdering(puzzle.start, puzzle.end, nextSelected, adjacency)
    setSelectedCountries(nextSelected)
    setInput('')
    setError('')
    if (!nextOrdering) return
    const extraCountries = Math.max(0, nextOrdering.length - puzzle.shortest.length)
    const score = Math.max(100, 1000 - extraCountries * 150 - hintsUsed * 100)
    setFinished(true)
    setFinalScore(score)
    await save(score, 1, 1, { route: nextOrdering, selectedCountries: nextSelected, shortestHops: puzzle.shortest.length - 1, hintsUsed })
  }

  function submitName() {
    const country = resolveCountryAnswer(input, graphCountries)
    if (!country) {
      setError('Choose an exact country name from the suggestions.')
      return
    }
    void addCountry(country.iso3)
  }

  return (
    <div className="game-body route-game-body">
      {mode === 'freeplay' && <div className="question-toolbar route-practice-toolbar"><div><span className="eyebrow">Border route</span><h2>Connect the countries by land</h2></div><div className="question-toolbar-tools"><GameSettingsMenu><div className="practice-config">
        <GameSettingSelect label="Geographic scope" value={scope} control="select" options={scopes.map((item) => ({ value: item, label: item }))} onChange={onScope} />
        <GameSettingSelect label="Route length" value={difficulty} options={[{ value: 'short', label: 'Short · 2–4' }, { value: 'standard', label: 'Standard · 3–6' }, { value: 'long', label: 'Long · 5–8' }]} onChange={(value) => onDifficulty(value as RouteDifficulty)} />
        <AdvancedGameSettings><GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => onEligibility(value as GeographyEligibility)} /></AdvancedGameSettings>
        <span className="practice-config-note">All routes use recorded land borders and are solvable.</span>
      </div></GameSettingsMenu></div></div>}
      <div className="route-pair">
        <div><span className="eyebrow">Start here</span><strong>{start.name}</strong></div>
        <div className="route-pair-arrow"><RouteIcon size={19} /><span>across land</span></div>
        <div><span className="eyebrow">Arrive here</span><strong>{end.name}</strong></div>
        <div className="route-distance"><span>Shortest possible</span><strong>{puzzle.shortest.length - 1} {puzzle.shortest.length - 1 === 1 ? 'border' : 'borders'}</strong></div>
      </div>
      <div className="route-map-frame">
        <div className="game-map-stage route-map-stage"><GeoMap features={eligibleFeatures(data.features, mapEligibility)} activeCodes={selectedCountries} startCode={puzzle.start} destinationCode={puzzle.end} focusCodes={focusCodes} focusPadding={72} hideFeatureNames showHoverLabels={false} ariaLabel="Map showing the fixed start, destination and selected intermediate countries. Use the country input to add intermediate countries." /></div>
        <div className="route-map-legend" aria-label="Map key">
          <span><i className="route-map-key-start" aria-hidden="true" />Start</span>
          <span><i className="route-map-key-finish" aria-hidden="true" />Finish</span>
          <span><i className="route-map-key-path" aria-hidden="true" />Selected</span>
        </div>
        <div className="route-game-dock">
          <div className="route-builder">
            <div className="route-builder-head"><span className="eyebrow">Intermediate countries</span><span>{selectedCountries.length} selected</span></div>
            {routeOrdering ? <ol className="route-stops is-ordered" aria-label="A valid border route">
              {routeNames.map((name, index) => <li key={`${routeOrdering[index]}-${index}`} className={index === 0 ? 'is-start' : index === routeNames.length - 1 ? 'is-destination' : ''}><span>{name}</span>{index < routeNames.length - 1 && <ArrowRight size={13} aria-hidden="true" />}</li>)}
            </ol> : selectedNames.length > 0 ? <div className="route-selected-set" aria-label="Selected countries, in entry order">
              {selectedNames.map(({ code, name }) => <button key={code} type="button" disabled={finished} aria-label={`Remove ${name}`} onClick={() => { setSelectedCountries((current) => current.filter((item) => item !== code)); setError('') }}>{name}<span aria-hidden="true">×</span></button>)}
            </div> : <p className="route-set-hint">Add any countries in any order. The map will show when the set connects.</p>}
          </div>
          {!finished && <div className="route-input-row">
            <AutocompleteInput id="route-country" label="Add an intermediate country in any order" placeholder="Type any country name" value={input} onChange={(value) => { setInput(value); setError('') }} suggestions={suggestions} onPick={(item) => { setInput(item.label); void addCountry(item.value) }} onSubmit={submitName} submitLabel="Add" />
            <button className="button button-outline hint-button" type="button" onClick={() => {
              const shortest = shortestPath(puzzle.start, puzzle.end, adjacency) ?? []
              const nextCode = shortest.slice(1, -1).find((candidate) => !selectedCountries.includes(candidate))
              if (nextCode) {
                setHintShown(`One shortest route includes ${data.countriesByCode.get(nextCode)?.name ?? nextCode}.`)
                setHintsUsed((value) => value + 1)
              }
            }}><Lightbulb size={15} /> Hint</button>
          </div>}
          {error && <div className="form-message form-message-error" role="alert">{error}</div>}
          {hintShown && <div className="route-hint" role="status"><Lightbulb size={15} /><span>{hintShown}</span></div>}
          {!finished && <div className={`route-set-status${routeOrdering ? ' is-valid' : ''}`} role="status" aria-live="polite">{routeOrdering ? 'A continuous route is ready.' : selectedCountries.length === 0 ? 'Add countries in any order; the map will show when the set connects.' : 'The selected countries do not connect in one route yet.'}</div>}
        </div>
      </div>
      <GameResultsDialog complete={finished} gameId="routes" mode={mode} score={finalScore} correct={finished ? 1 : 0} total={1} title={selectedCountries.length === puzzle.shortest.length - 2 ? 'The shortest way through.' : 'A valid route across the map.'} message={routeNames.join(' → ')} saveError={saveError} onReplay={mode === 'freeplay' ? onReplay : undefined} replayLabel="Build another route" />
    </div>
  )
}

function restoreRouteSelection(savedSelected: unknown, savedRoute: unknown, start: string, end: string, countries: GeographyData['countries']): string[] {
  const known = new Set(countries.map((country) => country.iso3))
  const preferred = Array.isArray(savedSelected) ? savedSelected : savedRoute
  if (!Array.isArray(preferred)) return []
  const values = preferred.filter((code): code is string => typeof code === 'string')
  // Earlier daily sessions stored an ordered [start, ..., destination] route.
  const intermediate = values[0] === start ? values.slice(1).filter((code) => code !== end) : values
  return intermediate.filter((code) => known.has(code) && code !== start && code !== end)
}
