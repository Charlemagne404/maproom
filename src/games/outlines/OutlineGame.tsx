import { useContext, useEffect, useMemo, useState } from 'react'
import { geoCentroid } from 'd3-geo'
import { Check, CircleHelp } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { AdvancedGameSettings, GameSettingSelect, GameSettingToggle, GameSettingsMenu } from '../../components/GameControls'
import { FreePlaySetupContext } from '../../components/FreePlaySetupContext'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import type { Coordinates, Country, GeoFeature, GeographyData, GameMode, RegionCollection } from '../../geography/types'
import { loadOutlineFeatures, loadRegions } from '../../geography/data'
import { directionFromTo, greatCircleKm, hashSeed, normalizeAnswer } from '../../puzzles/engine'
import { useGameSession } from '../session'
import { classifyGeography, eligibleCountries, initialGeographyEligibility, type GeographyEligibility, type GeographicClassification } from '../../geography/eligibility'
import { useAppData } from '../../app/useAppData'
import { advanceOutlineSequence, buildOutlineCandidateGroups, EMPTY_OUTLINE_PROGRESS, outlinePoolSize, outlineQuestionAt, type OutlineCandidate, type OutlineDifficulty, type OutlinePoolMode, type OutlineSequenceProgress } from './questionPool'

type OutlinePlace = { code: string; name: string; aliases: string[]; coordinates: Coordinates | null; feature?: GeoFeature; classification?: GeographicClassification; difficulty?: OutlineDifficulty | null }
type OutlineQuestion = {
  target: OutlinePlace
  places: OutlinePlace[]
  type: 'country' | 'subdivision'
  scopeLabel: string
  parentCountry?: Country
  poolKey: string
}

export function OutlineGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const setup = useContext(FreePlaySetupContext)
  const [eligibility, setEligibility] = useState<OutlinePoolMode>(initialGeographyEligibility(mode, state.settings.catalogue))
  const [scope, setScope] = useState('World')
  const [regionCountry, setRegionCountry] = useState('USA')
  const [difficulty, setDifficulty] = useState<OutlineDifficulty>('medium')
  const [rotated, setRotated] = useState(false)
  const [round, setRound] = useState(0)
  const [sequenceProgress, setSequenceProgress] = useState<Record<string, OutlineSequenceProgress>>({})
  const [loadedRegions, setLoadedRegions] = useState<RegionCollection | null>(null)
  const [regionError, setRegionError] = useState('')
  const [outlineFeaturesByCode, setOutlineFeaturesByCode] = useState<Map<string, GeoFeature[]> | null>(null)
  const [outlineError, setOutlineError] = useState('')
  const geographyEligibility: GeographyEligibility = eligibility === 'territories' ? 'extended' : eligibility
  const eligible = useMemo(() => eligibleCountries(data.countries, geographyEligibility), [data.countries, geographyEligibility])
  const continents = useMemo(() => [...new Set(eligible.map((country) => country.continent).filter((value): value is string => Boolean(value)))].sort(), [eligible])
  const countriesWithRegions = useMemo(() => eligible.filter((country) => country.regionCount > 0).sort((left, right) => left.name.localeCompare(right.name)), [eligible])
  const regionParent = data.countriesByCode.get(regionCountry)
  const countryPoolKey = `country:${eligibility}:${scope}:${difficulty}`
  const activeSequenceProgress = sequenceProgress[countryPoolKey] ?? EMPTY_OUTLINE_PROGRESS
  const roundSeed = `${seed}:${scope}:${regionCountry}:${round}:${difficulty}:${rotated}:${eligibility}`
  const session = useGameSession('outlines', mode, date, roundSeed)
  const progress = mode === 'daily' ? session.progress : null

  useEffect(() => {
    let active = true
    loadOutlineFeatures().then((features) => {
      if (!active) return
      const byCode = new Map<string, GeoFeature[]>()
      for (const feature of features) {
        const code = feature.properties.iso3
        if (!code) continue
        const existing = byCode.get(code) ?? []
        existing.push(feature)
        byCode.set(code, existing)
      }
      setOutlineFeaturesByCode(byCode)
    }).catch((error) => {
      if (active) setOutlineError(error instanceof Error ? error.message : 'The detailed outline data could not be loaded.')
    })
    return () => { active = false }
  }, [])

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
  const countryGroups = useMemo(() => buildOutlineCandidateGroups(data.countries, outlineFeaturesByCode ?? new Map(), {
    pool: eligibility,
    difficulty,
    scope,
  }), [data.countries, difficulty, eligibility, outlineFeaturesByCode, scope])
  const countryPlaces = useMemo(() => [...countryGroups.standard, ...countryGroups.extended].map(outlinePlaceFromCandidate), [countryGroups])
  const selectedCandidate = outlineQuestionAt(countryGroups, `${seed}:${countryPoolKey}`, activeSequenceProgress)
  const question = useMemo<OutlineQuestion | null>(() => {
    if (scope === 'Subdivisions') {
      if (!regionCollection || !regionParent) return null
      const places = regionCollection.features.flatMap((feature) => {
        const code = String(feature.properties.id ?? feature.id ?? '')
        const name = String(feature.properties.name ?? '').trim()
        if (!code || !name) return []
        return [{ code, name, aliases: [], coordinates: featureCenter(feature), feature }]
      })
      const poolKey = `subdivision:${regionCountry}`
      const generatedTarget = outlineQuestionAt({ standard: places, extended: [] }, `${seed}:${poolKey}`, sequenceProgress[poolKey] ?? EMPTY_OUTLINE_PROGRESS)
      const target = places.find((place) => place.code === progress?.targetCode) ?? generatedTarget
      if (!target) return null
      return { target, places, type: 'subdivision', scopeLabel: regionParent.name, parentCountry: regionParent, poolKey }
    }

    const poolKey = countryPoolKey
    const legacyTargetCountry = mode === 'daily' && typeof progress?.targetCode === 'string'
      ? data.countriesByCode.get(progress.targetCode)
      : undefined
    const legacyTarget = legacyTargetCountry?.hasGeometry
      ? {
          code: legacyTargetCountry.iso3,
          name: legacyTargetCountry.name,
          aliases: legacyTargetCountry.aliases,
          coordinates: legacyTargetCountry.coordinates,
          classification: classifyGeography(legacyTargetCountry),
        }
      : undefined
    const target = (legacyTarget ?? countryPlaces.find((place) => place.code === progress?.targetCode)) ?? (selectedCandidate ? outlinePlaceFromCandidate(selectedCandidate) : null)
    if (!target) return null
    const places = legacyTarget && !countryPlaces.some((place) => place.code === legacyTarget.code) ? [...countryPlaces, legacyTarget] : countryPlaces
    return {
      target,
      places,
      type: 'country',
      scopeLabel: scope,
      parentCountry: data.countriesByCode.get(target.code),
      poolKey,
    }
  }, [countryPlaces, countryPoolKey, data.countriesByCode, mode, progress, regionCollection, regionParent, regionCountry, scope, seed, selectedCandidate, sequenceProgress])

  if (!outlineFeaturesByCode && !outlineError) return <LoadingState label="Loading detailed country outlines…" />
  if (outlineError) return <div className="game-body"><InlineNotice title="Country outlines unavailable" tone="warning">{outlineError}</InlineNotice></div>
  if (scope === 'Subdivisions' && !regionCollection && !regionError) return <LoadingState label={`Opening ${regionParent?.name ?? 'subdivision'} outlines…`} />
  if (regionError) return <div className="game-body"><InlineNotice title="Subdivision outlines unavailable" tone="warning">{regionError}<div className="empty-game-actions"><button className="button button-outline" type="button" onClick={() => { setRegionError(''); setScope('World') }}>Return to world outlines</button></div></InlineNotice></div>
  if (scope === 'Subdivisions' && regionCollection?.features.length === 0) return <div className="game-body"><InlineNotice title="No subdivision outlines found" tone="warning">Choose another country with first-level boundary data.</InlineNotice></div>
  if (!question) {
    const noCandidates = scope !== 'Subdivisions' && outlineFeaturesByCode && outlinePoolSize(countryGroups) === 0
    return <div className="game-body">
      <InlineNotice title={noCandidates ? 'No fair silhouettes in this pool' : 'No outlines found'} tone="warning">{noCandidates ? 'This scope and difficulty have no outlines approved for silhouette-only play. Choose a wider scope, a different difficulty, or the Extended pool.' : 'There are no shapes available in this scope.'}</InlineNotice>
      {noCandidates && mode === 'freeplay' && (setup.setup
        ? <GameSettingsMenu>
            <p className="practice-config-note" role="status">This selection has no fair silhouettes. Change the pool, scope, or difficulty, then start free play.</p>
            <OutlineSettingsControls eligibility={eligibility} onEligibility={setEligibility} scope={scope} onScopeChange={(value) => { setRegionError(''); setScope(value) }} continents={continents} difficulty={difficulty} onDifficulty={setDifficulty} countriesWithRegions={countriesWithRegions} regionCountry={regionCountry} onRegionCountryChange={setRegionCountry} rotated={rotated} onRotated={setRotated} activePoolSize={0} />
          </GameSettingsMenu>
        : <div className="practice-config outline-empty-settings"><OutlineSettingsControls eligibility={eligibility} onEligibility={setEligibility} scope={scope} onScopeChange={(value) => { setRegionError(''); setScope(value) }} continents={continents} difficulty={difficulty} onDifficulty={setDifficulty} countriesWithRegions={countriesWithRegions} regionCountry={regionCountry} onRegionCountryChange={setRegionCountry} rotated={rotated} onRotated={setRotated} activePoolSize={0} /></div>
      )}
    </div>
  }

  const rotationDegrees = rotated ? ((hashSeed(`${seed}:${scope}:${regionCountry}:${round}:rotation`) % 271) + 45) : 0
  const activePoolSize = question.type === 'country' ? outlinePoolSize(countryGroups) : question.places.length
  return <OutlineRound
    key={`${scope}:${regionCountry}:${round}:${difficulty}:${rotated}:${eligibility}`}
    data={data}
    outlineFeaturesByCode={outlineFeaturesByCode!}
    question={question}
    mode={mode}
    date={date}
    session={session}
    onNext={() => {
      const next = advanceOutlineSequence(sequenceProgress[question.poolKey] ?? EMPTY_OUTLINE_PROGRESS, question.target.code)
      setSequenceProgress((current) => ({ ...current, [question.poolKey]: next }))
      setRound((value) => value + 1)
    }}
    activePoolSize={activePoolSize}
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

function OutlineRound({ data, outlineFeaturesByCode, question, mode, date, session, onNext, activePoolSize, scope, continents, countriesWithRegions, regionCountry, onScopeChange, onRegionCountryChange, difficulty, onDifficulty, eligibility, onEligibility, rotated, onRotated, rotationDegrees }: {
  data: GeographyData
  outlineFeaturesByCode: Map<string, GeoFeature[]>
  question: OutlineQuestion
  mode: GameMode
  date: string
  session: ReturnType<typeof useGameSession>
  onNext: () => void
  activePoolSize: number
  scope: string
  continents: string[]
  countriesWithRegions: Country[]
  regionCountry: string
  onScopeChange: (scope: string) => void
  onRegionCountryChange: (iso3: string) => void
  difficulty: OutlineDifficulty
  onDifficulty: (difficulty: OutlineDifficulty) => void
  eligibility: OutlinePoolMode
  onEligibility: (eligibility: OutlinePoolMode) => void
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
  const guessLimit = difficulty === 'easy' ? 8 : difficulty === 'hard' ? 4 : 6
  const { save, saveError, saveProgress } = session
  const suggestions: Suggestion[] = useMemo(() => question.places.map((place) => ({
    value: place.code,
    label: place.name,
    detail: question.type === 'subdivision' ? question.parentCountry?.name : question.scopeLabel === 'World' ? undefined : question.scopeLabel,
    aliases: place.aliases,
  })), [question])
  const answerFeatures = question.target.feature ? [question.target.feature] : outlineFeaturesByCode.get(question.target.code) ?? data.featuresByCode.get(question.target.code) ?? []

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
      const penalty = difficulty === 'easy' ? 100 : difficulty === 'hard' ? 250 : 150
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
    const direction = from && to ? directionFromTo(to, from) : null
    const locationHint = question.type === 'subdivision'
      ? nextAttempts.length >= (difficulty === 'hard' ? 3 : 4)
        ? ` · the outline starts with ${question.target.name[0]?.toLocaleUpperCase() ?? '…'}`
        : nextAttempts.length >= 2 && question.parentCountry?.coordinates && to
          ? ` · it lies ${directionFromTo(question.parentCountry.coordinates, to)} of ${question.parentCountry.name}’s catalog center`
          : ''
      : nextAttempts.length >= (difficulty === 'hard' ? 3 : 4) && question.parentCountry?.subregion
        ? ` · the answer is in ${question.parentCountry.subregion}`
        : nextAttempts.length >= 2 && question.parentCountry?.continent
          ? ` · the answer is in ${question.parentCountry.continent}`
          : ''
    setMessage(`${place.name} is ${direction ? `${direction} of the answer` : 'not the answer'}${distance !== null ? ` · about ${Math.round(distance).toLocaleString()} km away` : ''}${locationHint}.`)
  }

  return (
    <div className="game-body outline-game-body">
      <div className="outline-prompt"><div><span className="eyebrow">{guessLimit} guesses · {question.type === 'subdivision' ? question.parentCountry?.name : question.scopeLabel}</span><h2>{question.type === 'subdivision' ? 'Which subdivision is this?' : 'Which country is this?'}</h2><p>Identify the place from its shape. Each outline is selected for fair silhouette play at this difficulty.</p></div><div className="outline-prompt-tools">
        {mode === 'freeplay' && <GameSettingsMenu><OutlineSettingsControls eligibility={eligibility} onEligibility={onEligibility} scope={scope} onScopeChange={onScopeChange} continents={continents} difficulty={difficulty} onDifficulty={onDifficulty} countriesWithRegions={countriesWithRegions} regionCountry={regionCountry} onRegionCountryChange={onRegionCountryChange} rotated={rotated} onRotated={onRotated} activePoolSize={activePoolSize} /></GameSettingsMenu>}
        <div className="attempt-meter" aria-label={`${attempts.length} of ${guessLimit} guesses used`}>{Array.from({ length: guessLimit }, (_, index) => <span key={index} className={index < attempts.length ? (solved && index === attempts.length - 1 ? 'is-right' : 'is-used') : ''} />)}</div>
      </div></div>
      <div className="outline-map-stage"><GeoMap features={answerFeatures} rotationDegrees={rotationDegrees} localFit fitCenter={question.type === 'subdivision' ? question.parentCountry?.coordinates : question.target.coordinates} hideFeatureNames showHoverLabels={false} ariaLabel={`${rotated ? 'Rotated ' : ''}unlabelled ${question.type === 'subdivision' ? 'first-level subdivision' : 'country'} silhouette`} /></div>
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
      {attempts.length > 0 && !finished && <div className="guess-list" aria-label="Previous guesses">{attempts.map((code) => <span key={code}>{question.places.find((place) => place.code === code)?.name ?? data.countriesByCode.get(code)?.name ?? code}</span>)}</div>}
      {mode === 'daily' && <p className="map-source-note">Daily country silhouette · {date}</p>}
      {question.type === 'subdivision' && question.parentCountry?.regionSource && <p className="map-source-note">Subdivision data: {question.parentCountry.regionSource.source} · {question.parentCountry.regionSource.license}</p>}
      <GameResultsDialog complete={finished} gameId="outlines" mode={mode} score={score} correct={solved ? 1 : 0} total={1} title={solved ? `${question.type === 'subdivision' ? 'Subdivision' : 'Outline'} solved.` : `The answer was ${question.target.name}.`} message={`${attempts.length} of ${guessLimit} guesses used.`} saveError={saveError} onReplay={mode === 'freeplay' ? onNext : undefined} replayLabel={question.type === 'subdivision' ? 'Next subdivision' : 'Next outline'} />
    </div>
  )
}

function OutlineSettingsControls({ eligibility, onEligibility, scope, onScopeChange, continents, difficulty, onDifficulty, countriesWithRegions, regionCountry, onRegionCountryChange, rotated, onRotated, activePoolSize }: {
  eligibility: OutlinePoolMode
  onEligibility: (value: OutlinePoolMode) => void
  scope: string
  onScopeChange: (value: string) => void
  continents: string[]
  difficulty: OutlineDifficulty
  onDifficulty: (value: OutlineDifficulty) => void
  countriesWithRegions: Country[]
  regionCountry: string
  onRegionCountryChange: (value: string) => void
  rotated: boolean
  onRotated: (value: boolean) => void
  activePoolSize: number
}) {
  return <div className="practice-config">
    <GameSettingSelect label="Geographic scope" value={scope} control="select" options={[{ value: 'World', label: 'World' }, ...continents.map((item) => ({ value: item, label: item })), { value: 'Subdivisions', label: 'First-level subdivisions' }]} onChange={onScopeChange} />
    <GameSettingSelect label="Difficulty" value={difficulty} options={[{ value: 'easy', label: 'Easy · familiar' }, { value: 'medium', label: 'Medium · wider geography' }, { value: 'hard', label: 'Hard · challenging' }]} onChange={(value) => onDifficulty(value as OutlineDifficulty)} />
    <AdvancedGameSettings>
      <GameSettingSelect label="Outline pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · eligible countries' }, { value: 'extended', label: 'Extended · balanced territories' }, { value: 'territories', label: 'Territory focus' }]} onChange={(value) => onEligibility(value as OutlinePoolMode)} />
      {scope === 'Subdivisions' && <GameSettingSelect label="Country" value={regionCountry} control="select" options={countriesWithRegions.map((country) => ({ value: country.iso3, label: `${country.name} · ${country.regionCount}` }))} onChange={onRegionCountryChange} />}
      <GameSettingToggle label="Rotate silhouettes" checked={rotated} onChange={onRotated} />
    </AdvancedGameSettings>
    {scope !== 'Subdivisions' && <span className="practice-config-note">{activePoolSize} suitable silhouettes. A place repeats only after this pool has been used once.</span>}
    <span className="practice-config-note">Wrong guesses give distance and direction; later guesses reveal the region.</span>
  </div>
}

function outlinePlaceFromCandidate(candidate: OutlineCandidate): OutlinePlace {
  return {
    code: candidate.code,
    name: candidate.country.name,
    aliases: candidate.country.aliases,
    coordinates: candidate.country.coordinates,
    classification: classifyGeography(candidate.country),
    difficulty: candidate.rule.difficulty,
  }
}

function featureCenter(feature: GeoFeature): Coordinates | null {
  const [longitude, latitude] = geoCentroid(feature as unknown as GeoJSON.Feature)
  return Number.isFinite(longitude) && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    ? { lat: latitude, lon: longitude }
    : null
}
