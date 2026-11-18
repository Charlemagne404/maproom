import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { RoundProgress } from '../../components/RoundProgress'
import { AdvancedGameSettings, GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice } from '../../components/Kit'
import type { GameMode, GeographyData } from '../../geography/types'
import { eligibleCountries, initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'
import { generateConnectionsPuzzle, type ConnectionsDifficulty } from '../../puzzles/connections'
import { useGameSession } from '../session'
import { useAppData } from '../../app/useAppData'

export function ConnectionsGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [round, setRound] = useState(0)
  const [difficulty, setDifficulty] = useState<ConnectionsDifficulty>('easy')
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
  const countries = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const puzzle = useMemo(() => {
    try { return { value: generateConnectionsPuzzle(countries, `${seed}:${round}`, difficulty, eligibility), error: '' } }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : 'This grouping could not be generated.' } }
  }, [countries, seed, round, difficulty, eligibility])
  if (!puzzle.value) return <div className="game-body"><InlineNotice title="A fresh set is not available" tone="warning">{puzzle.error}</InlineNotice></div>
  return <ConnectionsRound key={`${round}:${difficulty}:${eligibility}`} data={data} puzzle={puzzle.value} mode={mode} date={date} seed={`${seed}:${round}`} difficulty={difficulty} eligibility={eligibility} onDifficulty={setDifficulty} onEligibility={setEligibility} onReplay={() => setRound((value) => value + 1)} />
}

function ConnectionsRound({ data, puzzle, mode, date, seed, difficulty, eligibility, onDifficulty, onEligibility, onReplay }: {
  data: GeographyData
  puzzle: ReturnType<typeof generateConnectionsPuzzle>
  mode: GameMode
  date: string
  seed: string
  difficulty: ConnectionsDifficulty
  eligibility: GeographyEligibility
  onDifficulty: (value: ConnectionsDifficulty) => void
  onEligibility: (value: GeographyEligibility) => void
  onReplay: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [solved, setSolved] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [message, setMessage] = useState('Select four countries that share a connection.')
  const finished = solved.length === 4 || mistakes >= 4
  const score = Math.max(0, solved.length * 250 - mistakes * 40)
  const { save, saveError } = useGameSession('connections', mode, date, seed)

  async function submit() {
    if (selected.length !== 4 || finished) return
    const group = puzzle.groups.find((candidate) => candidate.countryCodes.every((code) => selected.includes(code)))
    if (group) {
      const nextSolved = [...solved, group.id]
      const nextScore = Math.max(0, nextSolved.length * 250 - mistakes * 40)
      setSolved(nextSolved)
      setSelected([])
      setMessage(`${group.label}: ${group.explanation}`)
      if (nextSolved.length === 4) await save(nextScore, 4, 4, { groups: puzzle.groups.map((item) => item.id), mistakes, difficulty, eligibility })
      return
    }
    const oneAway = puzzle.groups.some((candidate) => selected.filter((code) => candidate.countryCodes.includes(code)).length === 3)
    const nextMistakes = mistakes + 1
    const nextScore = Math.max(0, solved.length * 250 - nextMistakes * 40)
    setMistakes(nextMistakes)
    setSelected([])
    setMessage(oneAway ? 'One away. Three countries share a connection.' : 'Those four do not make a group. Try another connection.')
    if (nextMistakes >= 4) await save(nextScore, solved.length, 4, { groups: puzzle.groups.map((item) => item.id), mistakes: nextMistakes, difficulty, eligibility })
  }

  const solvedGroups = solved.flatMap((id) => {
    const group = puzzle.groups.find((candidate) => candidate.id === id)
    return group ? [group] : []
  })
  const solvedCodes = new Set(solvedGroups.flatMap((group) => group.countryCodes))

  return <div className="game-body connections-game-body">
    <div className="question-toolbar">
      <div><h2>Find four groups of four</h2><p>Choose four countries with a shared geographic connection.</p></div>
      <div className="question-toolbar-tools">
        {mode === 'freeplay' && <GameSettingsMenu><div className="practice-config">
          <GameSettingSelect label="Difficulty" value={difficulty} options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} onChange={(value) => onDifficulty(value as ConnectionsDifficulty)} />
          <AdvancedGameSettings><GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => onEligibility(value as GeographyEligibility)} /></AdvancedGameSettings>
        </div></GameSettingsMenu>}
        <RoundProgress current={solved.length} total={4} label="groups" />
      </div>
    </div>
    <div className="connections-status" aria-live="polite"><span>{message}</span><span className="connections-mistakes" aria-label={`${mistakes} of 4 mistakes used`}>{Array.from({ length: 4 }, (_, index) => <i key={index} className={index < mistakes ? 'is-used' : ''} />)}</span></div>
    {solvedGroups.length > 0 && <div className="connections-solved-rows" aria-label="Solved groups">
      {solvedGroups.map((group, index) => <section key={group.id} className={`connections-solved-group connections-color-${index}`} aria-label={`${group.label}: ${group.explanation}`}>
        <strong>{group.label}</strong>
        <div className="connections-solved-countries">{group.countryCodes.map((code) => <span key={code}>{data.countriesByCode.get(code)?.name ?? code}</span>)}</div>
      </section>)}
    </div>}
    <div className="connections-board" role="group" aria-label="Unsolved country tiles">
      {puzzle.tiles.filter((country) => !solvedCodes.has(country.iso3)).map((country) => {
        const isSelected = selected.includes(country.iso3)
        return <button key={country.iso3} type="button" className={`connections-tile${isSelected ? ' is-selected' : ''}`} aria-pressed={isSelected} disabled={finished} onClick={() => {
          setMessage('Select four countries that share a connection.')
          setSelected((current) => isSelected ? current.filter((code) => code !== country.iso3) : current.length < 4 ? [...current, country.iso3] : current)
        }}>{country.name}</button>
      })}
    </div>
    <div className="connections-actions">
      <span role="status" aria-live="polite" aria-atomic="true">{selected.length} of 4 countries selected</span>
      {!finished && <button className="button button-dark" type="button" disabled={selected.length !== 4} onClick={() => void submit()}>Check group</button>}
      {!finished && <button className="button button-outline" type="button" disabled={!selected.length} onClick={() => { setSelected([]); setMessage('Selection cleared. Look for another shared connection.') }}><RotateCcw size={15} /> Clear</button>}
    </div>
    {finished && mistakes >= 4 && <div className="connections-review" aria-label="Remaining group answers">{puzzle.groups.filter((group) => !solved.includes(group.id)).map((group) => <p key={group.id}><strong>{group.label}:</strong> {group.countryCodes.map((code) => data.countriesByCode.get(code)?.name).join(', ')}<span>{group.explanation}</span></p>)}</div>}
    <GameResultsDialog complete={finished} gameId="connections" mode={mode} score={score} correct={solved.length} total={4} title={solved.length === 4 ? 'All the connections found.' : 'The groups are revealed.'} message={`${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'} used.`} saveError={saveError} onReplay={mode === 'freeplay' ? onReplay : undefined} replayLabel="Play another set" />
  </div>
}
