import { useEffect, useMemo, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice, LoadingState } from '../../components/Kit'
import { useAppData } from '../../app/useAppData'
import type { Country, GeoFeature, GeographyData, GameMode, RegionCollection } from '../../geography/types'
import { loadRegions } from '../../geography/data'
import { pickCountries, seededShuffle } from '../../puzzles/engine'
import { useGameSession } from '../session'

type Scope = 'world' | 'continent' | 'regions'
interface Question { code: string; name: string; detail: string; feature?: GeoFeature }

export function CountryIdentificationGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [scope, setScope] = useState<Scope>('world')
  const [continent, setContinent] = useState('Europe')
  const [regionCountry, setRegionCountry] = useState('USA')
  const [loadedRegions, setLoadedRegions] = useState<{ iso3: string; collection: RegionCollection } | null>(null)
  const [failedRegionCountry, setFailedRegionCountry] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [answerLocked, setAnswerLocked] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [input, setInput] = useState('')
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [scopeError, setScopeError] = useState('')
  const { save, saveError } = useGameSession('countries', mode, date, `${seed}:${scope}:${continent}:${regionCountry}`)

  const countriesWithRegions = useMemo(() => data.countries.filter((country) => country.regionCount > 0).sort((a, b) => a.name.localeCompare(b.name)), [data.countries])
  const continents = useMemo(() => [...new Set(data.countries.filter((country) => country.hasGeometry && country.continent).map((country) => country.continent as string))].sort(), [data.countries])
  const regions = loadedRegions?.iso3 === regionCountry ? loadedRegions.collection : null
  const regionError = failedRegionCountry === regionCountry
    ? 'No subdivision map is available for this country. Choose another supported country.'
    : ''

  useEffect(() => {
    if (scope !== 'regions') return
    let active = true
    loadRegions(regionCountry).then((collection) => { if (active) setLoadedRegions({ iso3: regionCountry, collection }) }).catch(() => {
      if (active) setFailedRegionCountry(regionCountry)
    })
    return () => { active = false }
  }, [scope, regionCountry])

  const questions = useMemo<Question[]>(() => {
    if (scope === 'regions') {
      if (!regions) return []
      return seededShuffle(regions.features, `${seed}:regions:${regionCountry}`)
        .slice(0, mode === 'daily' ? 8 : 10)
        .map((feature) => ({
          code: String(feature.properties.id ?? feature.id ?? ''),
          name: String(feature.properties.name ?? 'Unnamed region'),
          detail: data.countriesByCode.get(regionCountry)?.name ?? regionCountry,
          feature,
        }))
    }
    const filter = scope === 'continent' ? (country: Country) => country.continent === continent : undefined
    return pickCountries(data.countries, mode === 'daily' ? 8 : 10, `${seed}:${scope}:${continent}`, filter)
      .map((country) => ({ code: country.iso3, name: country.name, detail: country.continent ?? 'World' }))
  }, [scope, regions, regionCountry, mode, seed, data.countries, data.countriesByCode, continent])

  function resetRound() {
    setIndex(0)
    setSelected('')
    setAnswerLocked(false)
    setFeedback('')
    setInput('')
    setCorrect(0)
    setScore(0)
    setFinished(false)
    setScopeError('')
  }

  const question = questions[index]
  const countryFeatures = useMemo(() => scope === 'regions'
    ? (regions?.features ?? [])
    : data.features, [scope, regions, data.features])
  const suggestions: Suggestion[] = useMemo(() => scope === 'regions'
    ? (regions?.features ?? []).map((feature) => ({ value: String(feature.properties.id), label: String(feature.properties.name), detail: data.countriesByCode.get(regionCountry)?.name }))
    : data.countries.filter((country) => country.hasGeometry).map((country) => ({ value: country.iso3, label: country.name, detail: country.continent ?? undefined, aliases: country.aliases })),
  [scope, regions, data.countries, data.countriesByCode, regionCountry])

  if (scope === 'regions' && !regions && !regionError) return <LoadingState label="Opening subdivision map…" />
  if (regionError) return <div className="game-body"><InlineNotice title="Subdivision data unavailable" tone="warning">{regionError}</InlineNotice></div>
  if (questions.length === 0) return <LoadingState label="Choosing a country…" />
  if (finished) return <div className="result-panel">
    <span className="eyebrow">Map round complete</span><h2>Good work. You’ve covered some ground.</h2>
    <p>{correct} of {questions.length} places found on the map.</p><div className="result-score">{score.toLocaleString()}<small>points</small></div>
    <div className="result-actions"><a className="button button-dark" href="/statistics">See your statistics</a><a className="button button-outline" href="/explore">Choose another game</a></div>
    {saveError && <div className="form-message form-message-error" role="alert">{saveError}</div>}
  </div>

  const filteredFeatures = question.feature ? [question.feature] : countryFeatures
  const showOptions = mode === 'practice'

  function submit(code: string) {
    if (!question || answerLocked) return
    const suggestion = suggestions.find((item) => item.value === code)
    if (!suggestion) {
      setScopeError('Choose a place from the suggestions or the map.')
      return
    }
    const allowed = scope !== 'continent' || data.countriesByCode.get(code)?.continent === continent
    if (scope === 'regions' && !question.feature) return
    if (!allowed) {
      setScopeError(`Choose a country in ${continent}.`)
      return
    }
    const isCorrect = code === question.code
    setSelected(code)
    setAnswerLocked(true)
    setScopeError('')
    setFeedback(isCorrect ? `That’s ${question.name}.` : `That was ${question.name}. ${suggestion.label} is ${isCorrect ? 'correct' : 'a different place'}.`)
    if (isCorrect) {
      setCorrect((value) => value + 1)
      setScore((value) => value + 100)
    }
  }

  async function nextQuestion() {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1)
      setSelected('')
      setAnswerLocked(false)
      setFeedback('')
      setInput('')
      setScopeError('')
      return
    }
    const totalCorrect = correct + (selected === question.code ? 0 : 0)
    const totalScore = score
    setFinished(true)
    await save(totalScore, totalCorrect, questions.length, { scope, continent, regionCountry, questionCodes: questions.map((item) => item.code) })
  }

  return (
    <div className="game-body map-game-body">
      {showOptions && <div className="practice-config">
        <label><span>Practice scope</span><select value={scope} onChange={(event) => { resetRound(); setScope(event.target.value as Scope) }}><option value="world">Worldwide</option><option value="continent">One continent</option><option value="regions">Subdivisions</option></select></label>
        {scope === 'continent' && <label><span>Continent</span><select value={continent} onChange={(event) => { resetRound(); setContinent(event.target.value) }}>{continents.map((item) => <option key={item}>{item}</option>)}</select></label>}
        {scope === 'regions' && <label><span>Country</span><select value={regionCountry} onChange={(event) => { resetRound(); setFailedRegionCountry(null); setRegionCountry(event.target.value) }}>{countriesWithRegions.map((country) => <option key={country.iso3} value={country.iso3}>{country.name} · {country.regionCount}</option>)}</select></label>}
      </div>}
      {scopeError && <div className="form-message form-message-error" role="alert">{scopeError}</div>}
      <div className="question-toolbar"><div><span className="eyebrow">{question.detail}</span><h2><em>{question.name}</em></h2></div><div className="question-count"><strong>{index + 1}</strong><span>of {questions.length}</span></div></div>
      <div className="map-playfield">
        <div className="game-map-stage">
          <GeoMap
            features={filteredFeatures}
            onSelectCode={submit}
            activeCodes={selected ? [selected] : []}
            correctCode={answerLocked ? question.code : null}
            wrongCode={answerLocked && selected !== question.code ? selected : null}
            ariaLabel={scope === 'regions' ? `Map of ${question.detail}` : 'World map; choose a country'}
            showHoverLabels={state.settings.mapLabels}
          />
        </div>
        <div className="map-answer-dock">
        <AutocompleteInput
          id="country-answer"
          label="Search countries or regions"
          placeholder={scope === 'regions' ? 'Type a region name' : 'Type a country name'}
          value={input}
          onChange={(value) => { setInput(value); setScopeError('') }}
          suggestions={suggestions}
          onPick={(suggestion) => { setInput(suggestion.label); submit(suggestion.value) }}
          onSubmit={() => {
            const matched = suggestions.find((item) => [item.label, ...(item.aliases ?? [])].some((name) => name.toLocaleLowerCase() === input.trim().toLocaleLowerCase()))
            if (matched) submit(matched.value)
            else setScopeError('Choose an exact place name from the suggestions.')
          }}
          submitLabel="Answer"
          disabled={answerLocked}
        />
        </div>
      </div>
      {scope === 'regions' && data.countriesByCode.get(regionCountry)?.regionSource && <p className="map-source-note">Boundary source: {data.countriesByCode.get(regionCountry)?.regionSource?.source} · {data.countriesByCode.get(regionCountry)?.regionSource?.license}</p>}
      {answerLocked && <div className={`answer-feedback${selected === question.code ? ' is-correct' : ' is-incorrect'}`} role="status"><span className="feedback-icon">{selected === question.code ? <Check size={17} /> : <RotateCcw size={16} />}</span><span>{feedback}</span><button className="button button-dark" type="button" onClick={() => void nextQuestion()}>{index === questions.length - 1 ? 'See result' : 'Next place'}</button></div>}
    </div>
  )
}
