import { useMemo, useState } from 'react'
import { ArrowRight, Check, Lightbulb, Route as RouteIcon } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice } from '../../components/Kit'
import type { GeographyData, GameMode } from '../../geography/types'
import { buildAdjacency, generateRoutePuzzle, resolveCountryAnswer, validateRouteStep } from '../../puzzles/engine'
import { useAppData } from '../../app/useAppData'
import { useGameSession } from '../session'

export function BorderRouteGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const puzzle = useMemo(() => generateRoutePuzzle(data.countries, `${seed}:route`), [data.countries, seed])
  const adjacency = useMemo(() => buildAdjacency(data.countries), [data.countries])
  const start = data.countriesByCode.get(puzzle.start)
  const end = data.countriesByCode.get(puzzle.end)
  const [route, setRoute] = useState([puzzle.start])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [hintShown, setHintShown] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const { save, saveError } = useGameSession('routes', mode, date, seed)
  const suggestions: Suggestion[] = useMemo(() => data.countries.map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })), [data.countries])
  const routeNames = route.map((code) => data.countriesByCode.get(code)?.name ?? code)
  const routePoints = route.flatMap((code) => {
    const coordinates = data.countriesByCode.get(code)?.coordinates
    return coordinates ? [coordinates] : []
  })
  const routeMarkers = [
    ...(start?.coordinates ? [{ point: start.coordinates, kind: 'guess' as const, label: `Start: ${start.name}` }] : []),
    ...(end?.coordinates ? [{ point: end.coordinates, kind: 'answer' as const, label: `Destination: ${end.name}` }] : []),
  ]

  if (!start || !end) return <InlineNotice title="The route could not be built" tone="warning">This pair is not available in the current border data. Return to the library and choose another game.</InlineNotice>

  async function addCountry(code: string) {
    if (finished) return
    const country = data.countriesByCode.get(code)
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
    const country = resolveCountryAnswer(input, data.countries)
    if (!country) {
      setError('Choose an exact country name from the suggestions.')
      return
    }
    void addCountry(country.iso3)
  }

  return (
    <div className="game-body route-game-body">
      <div className="route-pair">
        <div><span className="eyebrow">Start here</span><strong>{start.name}</strong></div>
        <div className="route-pair-arrow"><RouteIcon size={19} /><span>across land</span></div>
        <div><span className="eyebrow">Arrive here</span><strong>{end.name}</strong></div>
        <div className="route-distance"><span>Shortest possible</span><strong>{puzzle.shortest.length - 1} {puzzle.shortest.length - 1 === 1 ? 'border' : 'borders'}</strong></div>
      </div>
      <div className="route-map-frame">
        <div className="game-map-stage route-map-stage"><GeoMap features={data.features} activeCodes={route} routePoints={routePoints} markers={routeMarkers} onSelectCode={(code) => void addCountry(code)} ariaLabel="World map. Select a country that borders the last stop." showHoverLabels={state.settings.mapLabels} /></div>
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
            <button className="button button-outline hint-button" type="button" onClick={() => { setHintShown(true); setHintsUsed((value) => value + 1) }}><Lightbulb size={15} /> Hint</button>
          </div>}
          {error && <div className="form-message form-message-error" role="alert">{error}</div>}
          {hintShown && <div className="route-hint" role="status"><Lightbulb size={15} /><span>A shortest route is <strong>{puzzle.shortest.map((code) => data.countriesByCode.get(code)?.name ?? code).join(' → ')}</strong></span></div>}
        </div>
      </div>
      {finished && <div className="result-panel route-result"><span className="eyebrow">Route complete</span><h2>{route.length === puzzle.shortest.length ? 'The shortest way through.' : 'A valid route across the map.'}</h2><p>{routeNames.join(' → ')}</p><div className="result-score">{finalScore.toLocaleString()}<small>points</small></div><div className="result-actions"><a className="button button-dark" href="/statistics">See statistics</a><a className="button button-outline" href="/games/routes?mode=practice"><Check size={15} /> Build another route</a></div>{saveError && <div className="form-message form-message-error" role="alert">{saveError}</div>}</div>}
    </div>
  )
}
