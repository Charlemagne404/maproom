import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Lightbulb, Route as RouteIcon } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice } from '../../components/Kit'
import { GameSettingsMenu } from '../../components/GameControls'
import { GameResultsDialog } from '../../components/GameResults'
import type { GeographyData, GameMode } from '../../geography/types'
import { buildAdjacency, generateRoutePuzzle, resolveCountryAnswer, shortestPath, validateRouteStep, type RouteDifficulty } from '../../puzzles/engine'
import { useGameSession } from '../session'
import { eligibleCountries, eligibleFeatures, isStandardCountry, type GeographyEligibility } from '../../geography/eligibility'

export function BorderRouteGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [round, setRound] = useState(0)
  const [eligibility, setEligibility] = useState<GeographyEligibility>('standard')
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
  const graphCountries = useMemo(() => mode === 'practice' && scope !== 'World' ? routeCountries.filter((country) => country.continent === scope) : routeCountries, [routeCountries, mode, scope])
  const adjacency = useMemo(() => buildAdjacency(graphCountries), [graphCountries])
  const generatedPuzzle = useMemo(() => generateRoutePuzzle(graphCountries, `${seed}:route`, mode === 'practice' ? { continent: scope, difficulty } : undefined), [graphCountries, seed, mode, scope, difficulty])
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
  const [route, setRoute] = useState<string[]>(() => {
    const saved = Array.isArray(progress?.route) ? progress.route.filter((code): code is string => typeof code === 'string') : []
    const valid = saved.length > 0 && saved[0] === puzzle.start && saved.every((code, index) => graphCountries.some((country) => country.iso3 === code) && (index === 0 || Boolean(adjacency.get(saved[index - 1]!)?.includes(code))))
    return valid ? saved : [puzzle.start]
  })
  const [input, setInput] = useState(() => typeof progress?.input === 'string' ? progress.input : '')
  const [error, setError] = useState(() => typeof progress?.error === 'string' ? progress.error : '')
  const [hintShown, setHintShown] = useState(() => typeof progress?.hintShown === 'string' ? progress.hintShown : '')
  const [hintsUsed, setHintsUsed] = useState(() => typeof progress?.hintsUsed === 'number' ? progress.hintsUsed : 0)
  const [finished, setFinished] = useState(() => progress?.finished === true)
  const [finalScore, setFinalScore] = useState(() => typeof progress?.finalScore === 'number' ? progress.finalScore : 0)
  const { save, saveError, saveProgress } = session
  const suggestions: Suggestion[] = useMemo(() => graphCountries.map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [graphCountries])
  const routeNames = route.map((code) => data.countriesByCode.get(code)?.name ?? code)
  const routePoints = route.flatMap((code) => {
    const coordinates = data.countriesByCode.get(code)?.coordinates
    return coordinates ? [coordinates] : []
  })
  const routeMarkers = [
    ...(start?.coordinates ? [{ point: start.coordinates, kind: 'guess' as const, label: 'Start' }] : []),
    ...(end?.coordinates ? [{ point: end.coordinates, kind: 'answer' as const, label: 'Destination' }] : []),
  ]
  const focusCodes = [...new Set([puzzle.start, puzzle.end, ...route])]
  const mapEligibility: GeographyEligibility = routeCountries.some((country) => !isStandardCountry(country.iso3)) ? 'extended' : eligibility

  useEffect(() => {
    if (mode !== 'daily' || finished) return
    void saveProgress({ route, input, error, hintShown, hintsUsed, finished, finalScore, start: puzzle.start, end: puzzle.end, shortest: puzzle.shortest, countryCodes: routeCountries.map((country) => country.iso3) })
  }, [mode, finished, route, input, error, hintShown, hintsUsed, finalScore, puzzle, routeCountries, saveProgress])

  if (!start || !end) return <InlineNotice title="The route could not be built" tone="warning">This pair is not available in the current border data. Return to the library and choose another game.</InlineNotice>

  async function addCountry(code: string) {
    if (finished) return
    const country = graphCountries.find((item) => item.iso3 === code)
    if (!country || !adjacency.has(code)) {
      setError('Choose a country from the list.')
      return
    }
    const problem = validateRouteStep(route, code, adjacency)
    if (problem) {
      setError(problem)
      return
    }
    const nextRoute = [...route, code]
    setRoute(nextRoute)
    setInput('')
    setError('')
    if (code !== puzzle.end) return
    const extraCountries = Math.max(0, nextRoute.length - puzzle.shortest.length)
    const score = Math.max(100, 1000 - extraCountries * 150 - hintsUsed * 100)
    setFinished(true)
    setFinalScore(score)
    await save(score, 1, 1, { route: nextRoute, shortestHops: puzzle.shortest.length - 1, hintsUsed })
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
      {mode === 'practice' && <div className="question-toolbar route-practice-toolbar"><div><span className="eyebrow">Border route practice</span><h2>Connect the countries by land</h2></div><div className="question-toolbar-tools"><GameSettingsMenu><div className="practice-config">
        <label><span>Country pool</span><select value={eligibility} onChange={(event) => onEligibility(event.target.value as GeographyEligibility)}><option value="standard">Standard · 195 states</option><option value="extended">Extended · territories included</option></select></label>
        <label><span>Geographic scope</span><select value={scope} onChange={(event) => onScope(event.target.value)}>{scopes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Route length</span><select value={difficulty} onChange={(event) => onDifficulty(event.target.value as RouteDifficulty)}><option value="short">Short · 2–4 borders</option><option value="standard">Standard · 3–6 borders</option><option value="long">Long · 5–8 borders</option></select></label>
        <span className="practice-config-note">All routes use recorded land borders and are solvable.</span>
      </div></GameSettingsMenu></div></div>}
      <div className="route-pair">
        <div><span className="eyebrow">Start here</span><strong>{start.name}</strong></div>
        <div className="route-pair-arrow"><RouteIcon size={19} /><span>across land</span></div>
        <div><span className="eyebrow">Arrive here</span><strong>{end.name}</strong></div>
        <div className="route-distance"><span>Shortest possible</span><strong>{puzzle.shortest.length - 1} {puzzle.shortest.length - 1 === 1 ? 'border' : 'borders'}</strong></div>
      </div>
      <div className="route-map-frame">
        <div className="game-map-stage route-map-stage"><GeoMap features={eligibleFeatures(data.features, mapEligibility)} activeCodes={route} focusCodes={focusCodes} focusPadding={72} hideFeatureNames showHoverLabels={false} routePoints={routePoints} markers={routeMarkers} onSelectCode={(code) => void addCountry(code)} ariaLabel="Unlabelled map. Use the country search to identify a selectable region." /></div>
        <div className="route-map-legend" aria-label="Map key">
          <span><i className="route-map-key-start" aria-hidden="true" />Start</span>
          <span><i className="route-map-key-finish" aria-hidden="true" />Finish</span>
          <span><i className="route-map-key-path" aria-hidden="true" />Route</span>
        </div>
        <div className="route-game-dock">
          <div className="route-builder">
            <div className="route-builder-head"><span className="eyebrow">Your route</span><span>{route.length - 1} {route.length - 1 === 1 ? 'country entered' : 'countries entered'}</span></div>
            <ol className="route-stops" aria-label="Countries in your route">
              {routeNames.map((name, index) => <li key={`${route[index]}-${index}`} className={index === 0 ? 'is-start' : ''}><span className="route-stop-index">{String(index + 1).padStart(2, '0')}</span><span>{name}</span>{index < routeNames.length - 1 && <ArrowRight size={13} aria-hidden="true" />}</li>)}
              {!finished && <li className="route-stop-target"><span className="route-stop-index">··</span><span>{end.name}</span><small>destination</small></li>}
            </ol>
          </div>
          {!finished && <div className="route-input-row">
            <AutocompleteInput id="route-country" label="Next country in the route" placeholder="Enter a neighbouring country" value={input} onChange={(value) => { setInput(value); setError('') }} suggestions={suggestions} onPick={(item) => { setInput(item.label); void addCountry(item.value) }} onSubmit={submitName} submitLabel="Add country" />
            <button className="button button-outline hint-button" type="button" onClick={() => {
              const continuation = shortestPath(route.at(-1) ?? puzzle.start, puzzle.end, adjacency)
              const nextCode = continuation?.[1]
              if (nextCode) {
                setHintShown(`A shortest continuation goes through ${data.countriesByCode.get(nextCode)?.name ?? nextCode}.`)
                setHintsUsed((value) => value + 1)
              }
            }}><Lightbulb size={15} /> Hint</button>
          </div>}
          {error && <div className="form-message form-message-error" role="alert">{error}</div>}
          {hintShown && <div className="route-hint" role="status"><Lightbulb size={15} /><span>{hintShown}</span></div>}
        </div>
      </div>
      <GameResultsDialog complete={finished} gameId="routes" mode={mode} score={finalScore} correct={finished ? 1 : 0} total={1} title={route.length === puzzle.shortest.length ? 'The shortest way through.' : 'A valid route across the map.'} message={routeNames.join(' → ')} saveError={saveError} onReplay={mode === 'practice' ? onReplay : undefined} replayLabel="Build another route" />
    </div>
  )
}
