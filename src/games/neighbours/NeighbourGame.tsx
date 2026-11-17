import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CircleHelp, Lightbulb } from 'lucide-react'
import { AutocompleteInput, type Suggestion } from '../../components/AutocompleteInput'
import { GameResultsDialog } from '../../components/GameResults'
import { GameSettingsMenu } from '../../components/GameControls'
import { GeoMap } from '../../components/GeoMap'
import { InlineNotice } from '../../components/Kit'
import { useAppData } from '../../app/useAppData'
import type { GameMode, GeographyData } from '../../geography/types'
import { makeNeighbourQuestions, scoreNeighbourAnswer, type NeighbourDifficulty } from '../../puzzles/neighbours'
import { useGameSession } from '../session'

type CountOption = '5' | '10' | '20' | 'infinite'

export function NeighbourGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const scopes = useMemo(() => [...new Set(data.countries.filter((country) => country.hasGeometry && country.continent).map((country) => country.continent as string))].sort(), [data.countries])
  const [scope, setScope] = useState('World')
  const [difficulty, setDifficulty] = useState<NeighbourDifficulty>('all')
  const [count, setCount] = useState<CountOption>('5')
  const [timed, setTimed] = useState(false)
  const [round, setRound] = useState(0)
  return <NeighbourRound key={`${round}:${scope}:${difficulty}:${count}:${timed}`} data={data} mode={mode} date={date} seed={`${seed}:${round}:${scope}:${difficulty}:${count}:${timed}`} scope={scope} difficulty={difficulty} count={count} timed={timed} scopes={scopes} onScope={setScope} onDifficulty={setDifficulty} onCount={setCount} onTimed={setTimed} onReplay={() => setRound((value) => value + 1)} />
}

function NeighbourRound({ data, mode, date, seed, scope, difficulty, count, timed, scopes, onScope, onDifficulty, onCount, onTimed, onReplay }: {
  data: GeographyData
  mode: GameMode
  date: string
  seed: string
  scope: string
  difficulty: NeighbourDifficulty
  count: CountOption
  timed: boolean
  scopes: string[]
  onScope: (value: string) => void
  onDifficulty: (value: NeighbourDifficulty) => void
  onCount: (value: CountOption) => void
  onTimed: (value: boolean) => void
  onReplay: () => void
}) {
  const { state } = useAppData()
  const totalQuestions = mode === 'daily' ? 5 : count === 'infinite' ? 40 : Number(count)
  const [cycle, setCycle] = useState(0)
  const [deck, setDeck] = useState(() => makeNeighbourQuestions(data.countries, `${seed}:targets:0`, totalQuestions, scope, difficulty))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [locked, setLocked] = useState(false)
  const [resolved, setResolved] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState('Select every country that shares a land border with the target.')
  const [roundExact, setRoundExact] = useState(false)
  const [seconds, setSeconds] = useState(60)
  const [finished, setFinished] = useState(false)
  const question = deck[index]
  const { save, saveError } = useGameSession('neighbours', mode, date, seed)
  const infinite = mode === 'practice' && count === 'infinite'
  const suggestions: Suggestion[] = useMemo(() => data.countries
    .map((country) => ({ value: country.iso3, label: country.name, detail: country.hasGeometry ? country.continent ?? undefined : 'Text entry only · no mapped outline', aliases: country.aliases })), [data.countries])

  const finishRound = useCallback(async (finalScore = score, finalCorrect = correct, finalTotal = resolved) => {
    if (finished || finalTotal === 0) return
    setFinished(true)
    await save(finalScore, finalCorrect, finalTotal, { scope, difficulty, timed, perfectRounds: finalCorrect })
  }, [correct, difficulty, finished, resolved, save, scope, score, timed])

  useEffect(() => {
    if (!timed || finished) return
    const timer = window.setTimeout(() => {
      if (seconds <= 1) {
        setSeconds(0)
        void finishRound()
      } else setSeconds((value) => value - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [seconds, timed, finished, finishRound])

  if (!question) return <div className="game-body"><InlineNotice title="No border challenges fit those settings" tone="warning"><span>Choose a wider region or switch to all border counts. The map only uses recorded land-border neighbors.</span>{mode === 'practice' && <div className="empty-game-actions"><button className="button button-outline" type="button" onClick={() => { onScope('World'); onDifficulty('all') }}>Use all recorded borders</button></div>}</InlineNotice></div>

  function toggle(code: string) {
    if (locked || finished) return
    setMessage('Check your full set when you are ready; incorrect selections reduce the score.')
    setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])
  }

  async function checkAnswer() {
    if (!question || locked || finished) return
    const result = scoreNeighbourAnswer(question.neighbourCodes, selected)
    const nextResolved = resolved + 1
    const nextCorrect = correct + Number(result.exact)
    const nextScore = score + result.points
    setResolved(nextResolved)
    setCorrect(nextCorrect)
    setScore(nextScore)
    setLocked(true)
    setRoundExact(result.exact)
    setMessage(result.exact
      ? `Complete. You found all ${question.neighbourCodes.length} land neighbours.`
      : `${result.matched} found · ${result.missed} missed · ${result.extra} incorrect.`)
    if (!infinite && index === deck.length - 1) {
      setFinished(true)
      await save(nextScore, nextCorrect, nextResolved, { scope, difficulty, timed, perfectRounds: nextCorrect })
    }
  }

  function nextQuestion() {
    if (index < deck.length - 1) setIndex((value) => value + 1)
    else if (infinite) {
      const nextCycle = cycle + 1
      setDeck(makeNeighbourQuestions(data.countries, `${seed}:targets:${nextCycle}`, 40, scope, difficulty))
      setCycle(nextCycle)
      setIndex(0)
    }
    setSelected([])
    setInput('')
    setLocked(false)
    setRoundExact(false)
    setMessage('Select every country that shares a land border with the target.')
  }

  const settings = mode === 'practice' && !finished ? <GameSettingsMenu><div className="practice-config">
    <label><span>Target region</span><select value={scope} onChange={(event) => onScope(event.target.value)}><option>World</option>{scopes.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label><span>Border count</span><select value={difficulty} onChange={(event) => onDifficulty(event.target.value as NeighbourDifficulty)}><option value="all">All countries</option><option value="dense">Five or more neighbors</option></select></label>
    <label><span>Countries</span><select value={count} onChange={(event) => onCount(event.target.value as CountOption)}><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="infinite">Infinite</option></select></label>
    <label className="flag-reveal-setting"><input type="checkbox" checked={timed} onChange={(event) => onTimed(event.target.checked)} /><span>60-second round</span></label>
  </div></GameSettingsMenu> : null
  const mapActive = locked ? question.neighbourCodes : selected
  const neighbourNames = question.neighbourCodes.map((code) => data.countriesByCode.get(code)?.name ?? code)

  return <div className="game-body neighbour-game-body">
    <div className="question-toolbar"><div><span className="eyebrow">Neighbour Challenge · {scope}</span><h2>Complete the land borders</h2><p>Choose every country that shares a recorded land border with the target.</p></div><div className="question-toolbar-tools">{settings}<div className="question-count"><strong>{resolved + 1}</strong><span>{infinite ? 'country' : `of ${deck.length}`}</span></div></div></div>
    <div className="neighbour-target"><span className="eyebrow">Target country</span><strong>{question.country.name}</strong><span>{question.neighbourCodes.length} neighbours to find</span></div>
    <div className="neighbour-live" aria-live="polite"><span><strong>{score.toLocaleString()}</strong> points</span><span>{correct} perfect rounds</span><span>{timed ? `${seconds}s left` : `${selected.length} selected`}</span>{infinite && resolved > 0 && !finished && <button className="button button-outline" type="button" disabled={locked} onClick={() => void finishRound()}>End session</button>}</div>
    <div className="neighbour-map"><GeoMap features={data.features} activeCodes={mapActive} onSelectCode={toggle} ariaLabel={`World map. Select countries that border ${question.country.name}.`} showHoverLabels={state.settings.mapLabels} /></div>
    {!locked && <div className="neighbour-answer-dock">
      <AutocompleteInput id="neighbour-answer" label="Add a country" placeholder="Type a country name" value={input} onChange={(value) => { setInput(value); setMessage('Choose any country, then check your full set.') }} suggestions={suggestions} onPick={(item) => { toggle(item.value); setInput('') }} onSubmit={() => setMessage('Choose any country, then check your full set.')} submitLabel="Add" />
      <button className="button button-dark" type="button" disabled={selected.length === 0} onClick={() => void checkAnswer()}><Check size={15} /> Check neighbors</button>
    </div>}
    {selected.length > 0 && !locked && <div className="neighbour-selected" aria-label="Selected neighbors">{selected.map((code) => <button type="button" key={code} onClick={() => toggle(code)}>{data.countriesByCode.get(code)?.name} ×</button>)}</div>}
    <div className={`answer-feedback${locked && roundExact ? ' is-correct' : locked ? ' is-incorrect' : ''}`} role="status"><span className="feedback-icon">{locked ? <Check size={17} /> : <Lightbulb size={16} />}</span><span>{message}{locked && <small className="neighbour-reveal-list">Answer: {neighbourNames.join(', ')}.</small>}</span>{locked && !finished && <button className="button button-dark" type="button" onClick={nextQuestion}>{index === deck.length - 1 && !infinite ? 'See result' : 'Next country'}</button>}</div>
    <p className="map-source-note"><CircleHelp size={14} /> Border answers follow reciprocal country-catalog land neighbors; maritime boundaries and disputed claims are not included.</p>
    <GameResultsDialog complete={finished} gameId="neighbours" mode={mode} score={score} correct={correct} total={resolved} title={timed && seconds === 0 ? 'Time is up.' : 'Border round complete.'} message={`${correct} perfect rounds across ${resolved} countries.`} saveError={saveError} onReplay={mode === 'practice' ? onReplay : undefined} replayLabel="Find more neighbours" />
  </div>
}
