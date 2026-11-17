import { useEffect, useMemo, useState } from 'react'
import { geoCentroid } from 'd3-geo'
import { Check, CircleHelp } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingsMenu } from '../../components/GameControls'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import type { Coordinates, Country, GeoFeature, GeographyData, GameMode, RegionCollection } from '../../geography/types'
import { loadRegions } from '../../geography/data'
import { directionFromTo, greatCircleKm, hashSeed, normalizeAnswer, seededShuffle } from '../../puzzles/engine'
import { useGameSession } from '../session'
import { eligibleCountries, type GeographyEligibility } from '../../geography/eligibility'

type Difficulty = 'easy' | 'standard' | 'expert'
type OutlinePlace = { code: string; name: string; aliases: string[]; coordinates: Coordinates | null; feature?: GeoFeature }
type OutlineQuestion = {
  target: OutlinePlace
  places: OutlinePlace[]
  type: 'country' | 'subdivision'
  scopeLabel: string
  parentCountry?: Country
}

export function OutlineGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [eligibility, setEligibility] = useState<GeographyEligibility>('standard')
  const [scope, setScope] = useState('World')
  const [regionCountry, setRegionCountry] = useState('USA')
  const [difficulty, setDifficulty] = useState<Difficulty>('standard')
  const [rotated, setRotated] = useState(false)
  const [round, setRound] = useState(0)
  const [loadedRegions, setLoadedRegions] = useState<RegionCollection | null>(null)
  const [regionError, setRegionError] = useState('')
  const eligible = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const continents = useMemo(() => [...new Set(eligible.map((country) => country.continent).filter((value): value is string => Boolean(value)))].sort(), [eligible])
  const countriesWithRegions = useMemo(() => eligible.filter((country) => country.regionCount > 0).sort((left, right) => left.name.localeCompare(right.name)), [eligible])
  const regionParent = data.countriesByCode.get(regionCountry)
  const roundSeed = `${seed}:${scope}:${regionCountry}:${round}:${difficulty}:${rotated}`
  const session = useGameSession('outlines', mode, date, roundSeed)
  const progress = mode === 'daily' ? session.progress : null

  useEffect(() => {
    if (scope !== 'Subdivisions') return
    let active = true
    loadRegions(regionCountry).then((collection) => {
      if (active) setLoadedRegions(collection)
    }).catch((error) => {
      if (active) setRegionError(error instanceof Error ? error.message : 'This subdivision map could not be loaded.')
    })
    return () => { active = false }
  }, [scope, regionCountry])

  const regionCollection = loadedRegions?.countryIso3 === regionCountry ? loadedRegions : null
  const countryPlaces = useMemo(() => eligible
    .filter((country) => country.hasGeometry && (scope === 'World' || country.continent === scope))
    .map((country) => ({ code: country.iso3, name: country.name, aliases: country.aliases, coordinates: country.coordinates })), [eligible, scope])
  const question = useMemo<OutlineQuestion | null>(() => {
    if (scope === 'Subdivisions') {
      if (!regionCollection || !regionParent) return null
      const places = regionCollection.features.flatMap((feature) => {
        const code = String(feature.properties.id ?? feature.id ?? '')
        const name = String(feature.properties.name ?? '').trim()
        if (!code || !name) return []
        return [{ code, name, aliases: [], coordinates: featureCenter(feature), feature }]
      })
      const generatedTarget = seededShuffle(places, `${seed}:outline:${scope}:${regionCountry}:${round}`)[0]
      const target = places.find((place) => place.code === progress?.targetCode) ?? generatedTarget
      if (!target) return null
      return { target, places, type: 'subdivision', scopeLabel: regionParent.name, parentCountry: regionParent }
    }

    const generatedTarget = seededShuffle(countryPlaces, `${seed}:outline:${scope}:${round}`)[0]
    const target = countryPlaces.find((place) => place.code === progress?.targetCode) ?? generatedTarget
    if (!target) return null
    return {
      target,
      places: countryPlaces,
      type: 'country',
      scopeLabel: scope,
      parentCountry: data.countriesByCode.get(target.code),
    }
  }, [countryPlaces, data.countriesByCode, regionCollection, regionParent, regionCountry, round, scope, seed, progress])

  if (scope === 'Subdivisions' && !regionCollection && !regionError) return <LoadingState label={`Opening ${regionParent?.name ?? 'subdivision'} outlines…`} />
  if (regionError) return <div className="game-body"><InlineNotice title="Subdivision outlines unavailable" tone="warning">{regionError}<div className="empty-game-actions"><button className="button button-outline" type="button" onClick={() => { setRegionError(''); setScope('World') }}>Return to world outlines</button></div></InlineNotice></div>
  if (scope === 'Subdivisions' && regionCollection?.features.length === 0) return <div className="game-body"><InlineNotice title="No subdivision outlines found" tone="warning">Choose another country with first-level boundary data.</InlineNotice></div>
  if (!question) return <InlineNotice title="No outlines found" tone="warning">There are no shapes available in this scope.</InlineNotice>

  const rotationDegrees = rotated ? ((hashSeed(`${seed}:${scope}:${regionCountry}:${round}:rotation`) % 271) + 45) : 0
  return <OutlineRound
    key={`${scope}:${regionCountry}:${round}:${difficulty}:${rotated}:${eligibility}`}
    data={data}
    question={question}
    mode={mode}
    date={date}
    session={session}
    onNext={() => setRound((value) => value + 1)}
    scope={scope}
    continents={continents}
    countriesWithRegions={countriesWithRegions}
    regionCountry={regionCountry}
    onScopeChange={(value) => { setRegionError(''); setScope(value) }}
    onRegionCountryChange={setRegionCountry}
    difficulty={difficulty}
    eligibility={eligibility}
    onEligibility={setEligibility}
    onDifficulty={setDifficulty}
    rotated={rotated}
    onRotated={setRotated}
    rotationDegrees={rotationDegrees}
  />
}

function OutlineRound({ data, question, mode, date, session, onNext, scope, continents, countriesWithRegions, regionCountry, onScopeChange, onRegionCountryChange, difficulty, onDifficulty, eligibility, onEligibility, rotated, onRotated, rotationDegrees }: {
  data: GeographyData
  question: OutlineQuestion
  mode: GameMode
  date: string
  session: ReturnType<typeof useGameSession>
  onNext: () => void
  scope: string
  continents: string[]
  countriesWithRegions: Country[]
  regionCountry: string
  onScopeChange: (scope: string) => void
  onRegionCountryChange: (iso3: string) => void
  difficulty: Difficulty
  onDifficulty: (difficulty: Difficulty) => void
  eligibility: GeographyEligibility
  onEligibility: (eligibility: GeographyEligibility) => void
  rotated: boolean
  onRotated: (rotated: boolean) => void
  rotationDegrees: number
}) {
  const progress = mode === 'daily' ? session.progress : null
  const [input, setInput] = useState(() => typeof progress?.input === 'string' ? progress.input : '')
  const [attempts, setAttempts] = useState<string[]>(() => Array.isArray(progress?.attempts) ? progress.attempts.filter((item): item is string => typeof item === 'string') : [])
  const [message, setMessage] = useState(() => typeof progress?.message === 'string' ? progress.message : '')
  const [finished, setFinished] = useState(() => progress?.finished === true)
  const [solved, setSolved] = useState(() => progress?.solved === true)
  const [score, setScore] = useState(() => typeof progress?.score === 'number' ? progress.score : 0)
  const guessLimit = difficulty === 'easy' ? 8 : difficulty === 'expert' ? 4 : 6
  const { save, saveError, saveProgress } = session
  const suggestions: Suggestion[] = useMemo(() => question.places.map((place) => ({
    value: place.code,
    label: place.name,
    detail: question.type === 'subdivision' ? question.parentCountry?.name : question.scopeLabel === 'World' ? undefined : question.scopeLabel,
    aliases: place.aliases,
  })), [question])
  const answerFeatures = question.target.feature ? [question.target.feature] : data.featuresByCode.get(question.target.code) ?? []

  useEffect(() => {
    if (mode !== 'daily' || finished) return
    void saveProgress({ input, attempts, message, finished, solved, score, targetCode: question.target.code, type: question.type })
  }, [mode, finished, input, attempts, message, solved, score, question.target.code, question.type, saveProgress])

  async function guess() {
    if (finished) return
    const answer = normalizeAnswer(input)
    const place = question.places.find((candidate) => [candidate.name, ...candidate.aliases].some((name) => normalizeAnswer(name) === answer))
    if (!place) {
      setMessage('Choose a place from the suggestions.')
      return
    }
    if (attempts.includes(place.code)) {
      setMessage(`You already tried ${place.name}.`)
      return
    }
    const nextAttempts = [...attempts, place.code]
    setAttempts(nextAttempts)
    setInput('')
    if (place.code === question.target.code) {
      const penalty = difficulty === 'easy' ? 100 : difficulty === 'expert' ? 250 : 150
      const points = Math.max(100, 1000 - (nextAttempts.length - 1) * penalty)
      setSolved(true)
      setFinished(true)
      setScore(points)
      setMessage(`That’s ${question.target.name}. You found it in ${nextAttempts.length} ${nextAttempts.length === 1 ? 'guess' : 'guesses'}.`)
      await save(points, 1, 1, { type: question.type, country: question.parentCountry?.iso3 ?? question.target.code, outline: question.target.code, attempts: nextAttempts.length })
      return
    }
    if (nextAttempts.length >= guessLimit) {
      setFinished(true)
      setSolved(false)
      setMessage(`The outline was ${question.target.name}.`)
      await save(0, 0, 1, { type: question.type, country: question.parentCountry?.iso3 ?? question.target.code, outline: question.target.code, attempts: nextAttempts.length })
      return
    }
    const from = place.coordinates
    const to = question.target.coordinates
    const distance = from && to ? greatCircleKm(from, to) : null
    const direction = from && to ? directionFromTo(from, to) : null
    const locationHint = question.type === 'subdivision'
      ? nextAttempts.length >= 4
        ? ` · the outline starts with ${question.target.name[0]?.toLocaleUpperCase() ?? '…'}`
        : nextAttempts.length >= 2 && question.parentCountry?.coordinates && to
          ? ` · it lies ${directionFromTo(question.parentCountry.coordinates, to)} of ${question.parentCountry.name}’s catalog center`
          : ''
      : nextAttempts.length >= 4 && question.parentCountry?.subregion
        ? ` · the answer is in ${question.parentCountry.subregion}`
        : nextAttempts.length >= 2 && question.parentCountry?.continent
          ? ` · the answer is in ${question.parentCountry.continent}`
          : ''
    setMessage(`${place.name} is ${direction ? `${direction} of the answer` : 'not the answer'}${distance !== null ? ` · about ${Math.round(distance).toLocaleString()} km away` : ''}${locationHint}.`)
  }

  return (
    <div className="game-body outline-game-body">
      <div className="outline-prompt"><div><span className="eyebrow">{guessLimit} guesses · {question.type === 'subdivision' ? question.parentCountry?.name : question.scopeLabel}</span><h2>{question.type === 'subdivision' ? 'Which subdivision is this?' : 'Which country is this?'}</h2><p>Look at the borders, not the fill. The silhouette is drawn from the bundled boundary data.</p></div><div className="outline-prompt-tools">
        {mode === 'practice' && <GameSettingsMenu><div className="practice-config"><label><span>Country pool</span><select value={eligibility} onChange={(event) => onEligibility(event.target.value as GeographyEligibility)}><option value="standard">Standard · 195 states</option><option value="extended">Extended · territories included</option></select></label><label><span>Practice scope</span><select value={scope} onChange={(event) => onScopeChange(event.target.value)}><option value="World">World</option>{continents.map((item) => <option key={item}>{item}</option>)}<option value="Subdivisions">First-level subdivisions</option></select></label>{scope === 'Subdivisions' && <label><span>Country</span><select value={regionCountry} onChange={(event) => onRegionCountryChange(event.target.value)}>{countriesWithRegions.map((country) => <option key={country.iso3} value={country.iso3}>{country.name} · {country.regionCount}</option>)}</select></label>}<label><span>Difficulty</span><select value={difficulty} onChange={(event) => onDifficulty(event.target.value as Difficulty)}><option value="easy">Easy · 8 guesses</option><option value="standard">Standard · 6 guesses</option><option value="expert">Expert · 4 guesses</option></select></label><label className="flag-reveal-setting"><input type="checkbox" checked={rotated} onChange={(event) => onRotated(event.target.checked)} /><span>Rotate silhouettes</span></label><span className="practice-config-note">Wrong guesses give distance and bearing; later hints narrow by region or position.</span></div></GameSettingsMenu>}
        <div className="attempt-meter" aria-label={`${attempts.length} of ${guessLimit} guesses used`}>{Array.from({ length: guessLimit }, (_, index) => <span key={index} className={index < attempts.length ? (solved && index === attempts.length - 1 ? 'is-right' : 'is-used') : ''} />)}</div>
      </div></div>
      <div className="outline-map-stage"><GeoMap features={answerFeatures} rotationDegrees={rotationDegrees} hideFeatureNames showHoverLabels={false} ariaLabel={`${rotated ? 'Rotated ' : ''}unlabelled ${question.type === 'subdivision' ? 'first-level subdivision' : 'country'} silhouette`} /></div>
      {!finished && <AutocompleteInput
        id="outline-answer"
        label={question.type === 'subdivision' ? 'Name the subdivision shown' : 'Name the country shown'}
        placeholder={question.type === 'subdivision' ? 'Type a subdivision name' : 'Type a country name'}
        value={input}
        onChange={(value) => { setInput(value); setMessage('') }}
        suggestions={suggestions}
        onPick={(suggestion) => { setInput(suggestion.label) }}
        onSubmit={() => void guess()}
        submitLabel="Guess"
      />}
      {message && <div className={`answer-feedback${solved ? ' is-correct' : finished ? ' is-incorrect' : ''}`} role="status"><span className="feedback-icon">{solved ? <Check size={17} /> : <CircleHelp size={16} />}</span><span>{message}</span></div>}
      {attempts.length > 0 && !finished && <div className="guess-list" aria-label="Previous guesses">{attempts.map((code) => <span key={code}>{question.places.find((place) => place.code === code)?.name ?? code}</span>)}</div>}
      {mode === 'daily' && <p className="map-source-note">Daily country silhouette · {date}</p>}
      {question.type === 'subdivision' && question.parentCountry?.regionSource && <p className="map-source-note">Subdivision data: {question.parentCountry.regionSource.source} · {question.parentCountry.regionSource.license}</p>}
      <GameResultsDialog complete={finished} gameId="outlines" mode={mode} score={score} correct={solved ? 1 : 0} total={1} title={solved ? `${question.type === 'subdivision' ? 'Subdivision' : 'Outline'} solved.` : `The answer was ${question.target.name}.`} message={`${attempts.length} of ${guessLimit} guesses used.`} saveError={saveError} onReplay={mode === 'practice' ? onNext : undefined} replayLabel={question.type === 'subdivision' ? 'Next subdivision' : 'Next outline'} />
    </div>
  )
}

function featureCenter(feature: GeoFeature): Coordinates | null {
  const [longitude, latitude] = geoCentroid(feature as unknown as GeoJSON.Feature)
  return Number.isFinite(longitude) && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    ? { lat: latitude, lon: longitude }
    : null
}
