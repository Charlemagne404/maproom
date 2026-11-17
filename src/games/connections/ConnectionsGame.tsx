import { useMemo, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { InlineNotice } from '../../components/Kit'
import type { GameMode, GeographyData } from '../../geography/types'
import { generateConnectionsPuzzle } from '../../puzzles/connections'
import { useGameSession } from '../session'

export function ConnectionsGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [round, setRound] = useState(0)
  const puzzle = useMemo(() => {
    try { return { value: generateConnectionsPuzzle(data.countries, `${seed}:${round}`), error: '' } }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : 'This grouping could not be generated.' } }
  }, [data.countries, seed, round])
  if (!puzzle.value) return <div className="game-body"><InlineNotice title="A fresh set is not available" tone="warning">{puzzle.error}</InlineNotice></div>
  return <ConnectionsRound key={round} data={data} puzzle={puzzle.value} mode={mode} date={date} seed={`${seed}:${round}`} onReplay={() => setRound((value) => value + 1)} />
}

function ConnectionsRound({ data, puzzle, mode, date, seed, onReplay }: {
  data: GeographyData
  puzzle: ReturnType<typeof generateConnectionsPuzzle>
  mode: GameMode
  date: string
  seed: string
  onReplay: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [solved, setSolved] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [message, setMessage] = useState('Select four places that share a geographic connection.')
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
      if (nextSolved.length === 4) await save(nextScore, 4, 4, { groups: puzzle.groups.map((item) => item.id), mistakes })
      return
    }
    const oneAway = puzzle.groups.some((candidate) => selected.filter((code) => candidate.countryCodes.includes(code)).length === 3)
    const nextMistakes = mistakes + 1
    const nextScore = Math.max(0, solved.length * 250 - nextMistakes * 40)
    setMistakes(nextMistakes)
    setSelected([])
    setMessage(oneAway ? 'One away. Three places belong together.' : 'Those four do not make a group. Try another connection.')
    if (nextMistakes >= 4) await save(nextScore, solved.length, 4, { groups: puzzle.groups.map((item) => item.id), mistakes: nextMistakes })
  }

  return <div className="game-body connections-game-body">
    <div className="question-toolbar">
      <div><span className="eyebrow">Geography Connections · World</span><h2>Find four groups of four</h2><p>Every place belongs to one group. Select four tiles and check your hunch.</p></div>
      <div className="question-toolbar-tools"><div className="question-count"><strong>{solved.length}</strong><span>of 4 groups</span></div></div>
    </div>
    <div className="connections-status" aria-live="polite"><span>{message}</span><span className="connections-mistakes" aria-label={`${mistakes} of 4 mistakes used`}>{Array.from({ length: 4 }, (_, index) => <i key={index} className={index < mistakes ? 'is-used' : ''} />)}</span></div>
    <div className="connections-board" role="group" aria-label="Sixteen country tiles">
      {puzzle.tiles.map((country) => {
        const solvedGroup = puzzle.groups.find((group) => solved.includes(group.id) && group.countryCodes.includes(country.iso3))
        const isSelected = selected.includes(country.iso3)
        return <button key={country.iso3} type="button" className={`connections-tile${isSelected ? ' is-selected' : ''}${solvedGroup ? ' is-solved' : ''}`} aria-pressed={isSelected} disabled={finished || Boolean(solvedGroup)} onClick={() => {
          setMessage('Select four places that share a geographic connection.')
          setSelected((current) => isSelected ? current.filter((code) => code !== country.iso3) : current.length < 4 ? [...current, country.iso3] : current)
        }}>{solvedGroup ? <><strong>{country.name}</strong><small>{solvedGroup.label}</small><Check size={14} aria-hidden="true" /></> : country.name}</button>
      })}
    </div>
    <div className="connections-actions">
      <span>{selected.length} of 4 selected</span>
      {!finished && <button className="button button-dark" type="button" disabled={selected.length !== 4} onClick={() => void submit()}>Check group</button>}
      {!finished && <button className="button button-outline" type="button" disabled={!selected.length} onClick={() => { setSelected([]); setMessage('Selection cleared. Look for another shared geographic fact.') }}><RotateCcw size={15} /> Clear</button>}
    </div>
    {finished && <div className="connections-review" aria-label="Group answers">{puzzle.groups.filter((group) => !solved.includes(group.id)).map((group) => <p key={group.id}><strong>{group.label}:</strong> {group.countryCodes.map((code) => data.countriesByCode.get(code)?.name).join(', ')}<span>{group.explanation}</span></p>)}</div>}
    <GameResultsDialog complete={finished} gameId="connections" mode={mode} score={score} correct={solved.length} total={4} title={solved.length === 4 ? 'All the connections found.' : 'The groups are revealed.'} message={`${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'} used.`} saveError={saveError} onReplay={mode === 'practice' ? onReplay : undefined} replayLabel="Play another set" />
  </div>
}
