import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Check, RotateCcw, Shuffle } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { RoundProgress } from '../../components/RoundProgress'
import { AdvancedGameSettings, GameSettingSelect, GameSettingsMenu } from '../../components/GameControls'
import { InlineNotice } from '../../components/Kit'
import type { GameMode, GeographyData } from '../../geography/types'
import { eligibleCountries, initialGeographyEligibility, type GeographyEligibility } from '../../geography/eligibility'
import { generateConnectionsPuzzle, type ConnectionsDifficulty } from '../../puzzles/connections'
import { seededShuffle } from '../../puzzles/engine'
import { useGameSession } from '../session'
import { useAppData } from '../../app/useAppData'
import './connections.css'

const MAX_MISTAKES = 4
const RESOLVE_MS = 440

export function ConnectionsGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const { state } = useAppData()
  const [round, setRound] = useState(0)
  const [difficulty, setDifficulty] = useState<ConnectionsDifficulty>('easy')
  const [eligibility, setEligibility] = useState<GeographyEligibility>(initialGeographyEligibility(mode, state.settings.catalogue))
  const countries = useMemo(() => eligibleCountries(data.countries, eligibility), [data.countries, eligibility])
  const puzzle = useMemo(() => {
    try { return { value: generateConnectionsPuzzle(countries, seed, difficulty, eligibility, round), error: '' } }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : 'This grouping could not be generated.' } }
  }, [countries, seed, round, difficulty, eligibility])

  if (!puzzle.value) return <div className="game-body connections-game-body"><InlineNotice title="A fresh set is not available" tone="warning">{puzzle.error}</InlineNotice></div>
  return <ConnectionsRound
    key={`${round}:${difficulty}:${eligibility}`}
    data={data}
    puzzle={puzzle.value}
    mode={mode}
    date={date}
    seed={`${seed}:${round}`}
    difficulty={difficulty}
    eligibility={eligibility}
    onDifficulty={setDifficulty}
    onEligibility={setEligibility}
    onReplay={() => setRound((value) => value + 1)}
  />
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
  const [tileOrder, setTileOrder] = useState(() => puzzle.tiles.map((country) => country.iso3))
  const [shuffleCount, setShuffleCount] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [solved, setSolved] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [phase, setPhase] = useState<'playing' | 'checking' | 'won' | 'lost'>('playing')
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none')
  const [message, setMessage] = useState('Select four countries that share a connection.')
  const [resolvingGroup, setResolvingGroup] = useState('')
  const [winningMoment, setWinningMoment] = useState(false)
  const tileRefs = useRef(new Map<string, HTMLButtonElement>())
  const previousRects = useRef(new Map<string, DOMRect>())
  const nextFocusCode = useRef<string | null>(null)
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { save, saveError } = useGameSession('connections', mode, date, seed)
  const solvedGroups = solved.flatMap((id) => {
    const group = puzzle.groups.find((candidate) => candidate.id === id)
    return group ? [group] : []
  })
  const solvedCodes = new Set(solvedGroups.flatMap((group) => group.countryCodes))
  const countryByCode = data.countriesByCode
  const availableCodes = tileOrder.filter((code) => !solvedCodes.has(code))
  const mistakesLeft = MAX_MISTAKES - mistakes
  const finished = phase === 'won' || phase === 'lost'
  const score = Math.max(0, solved.length * 250 - mistakes * 40)
  function rememberTilePositions() {
    previousRects.current = new Map([...tileRefs.current].map(([code, element]) => [code, element.getBoundingClientRect()]))
  }

  useLayoutEffect(() => {
    animateTileReflow()
  }, [tileOrder])

  useLayoutEffect(() => {
    animateTileReflow()
    const focusCode = nextFocusCode.current
    nextFocusCode.current = null
    if (focusCode) tileRefs.current.get(focusCode)?.focus({ preventScroll: true })
  }, [solved])

  function animateTileReflow() {
    const oldRects = previousRects.current
    if (!oldRects.size) return
    previousRects.current = new Map()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return
    for (const [code, element] of tileRefs.current) {
      const previous = oldRects.get(code)
      if (!previous) continue
      const next = element.getBoundingClientRect()
      const dx = previous.left - next.left
      const dy = previous.top - next.top
      if (Math.abs(dx) + Math.abs(dy) < 1) continue
      element.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' },
      ], { duration: 310, easing: 'cubic-bezier(.2,.78,.24,1)' })
    }
  }

  async function finishRound(nextPhase: 'won' | 'lost', nextSolved: string[], nextMistakes: number) {
    setPhase(nextPhase)
    setWinningMoment(nextPhase === 'won')
    setMessage(nextPhase === 'won' ? 'Every connection is in place. Nicely spotted.' : 'That was the last guess. The remaining connections are shown below.')
    const nextScore = Math.max(0, nextSolved.length * 250 - nextMistakes * 40)
    await save(nextScore, nextSolved.length, 4, {
      puzzleId: puzzle.id,
      groups: puzzle.groups.map((group) => group.id),
      mistakes: nextMistakes,
      difficulty,
      eligibility,
      shuffles: shuffleCount,
    })
  }

  async function submit() {
    if (selected.length !== 4 || phase !== 'playing') return
    const group = puzzle.groups.find((candidate) => !solved.includes(candidate.id)
      && candidate.countryCodes.every((code) => selected.includes(code)))

    setPhase('checking')
    if (group) {
      setFeedback('correct')
      setResolvingGroup(group.id)
      setMessage(`${group.label}. ${group.explanation}`)
      rememberTilePositions()
      resolveTimer.current = setTimeout(() => {
        const nextSolved = [...solved, group.id]
        nextFocusCode.current = tileOrder.find((code) => !solvedCodes.has(code) && !group.countryCodes.includes(code)) ?? null
        setSolved(nextSolved)
        setSelected([])
        setResolvingGroup('')
        setFeedback('none')
        if (nextSolved.length === 4) void finishRound('won', nextSolved, mistakes)
        else setPhase('playing')
      }, RESOLVE_MS)
      return
    }

    const oneAway = puzzle.groups.some((candidate) => !solved.includes(candidate.id)
      && selected.filter((code) => candidate.countryCodes.includes(code)).length === 3)
    const nextMistakes = mistakes + 1
    setMistakes(nextMistakes)
    setFeedback('incorrect')
    setMessage(oneAway ? 'One away. Three of those countries share a connection.' : 'No match this time. Try another way of reading the board.')
    resolveTimer.current = setTimeout(() => {
      setSelected([])
      setFeedback('none')
      if (nextMistakes >= MAX_MISTAKES) void finishRound('lost', solved, nextMistakes)
      else setPhase('playing')
    }, RESOLVE_MS)
  }

  function shuffleRemaining() {
    if (phase !== 'playing' || availableCodes.length < 2) return
    rememberTilePositions()
    const nextCount = shuffleCount + 1
    const shuffled = seededShuffle(availableCodes, `${seed}:shuffle:${nextCount}`)
    const staysSame = shuffled.every((code, index) => code === availableCodes[index])
    setTileOrder([...solvedCodes, ...(staysSame ? [...shuffled.slice(1), shuffled[0]] : shuffled)])
    setShuffleCount(nextCount)
    setSelected([])
    setMessage('The remaining countries have been shuffled.')
  }

  function toggleCountry(code: string) {
    if (phase !== 'playing') return
    setMessage('Select four countries that share a connection.')
    setSelected((current) => current.includes(code)
      ? current.filter((item) => item !== code)
      : current.length < 4 ? [...current, code] : current)
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, code: string) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    const currentIndex = availableCodes.indexOf(code)
    const board = event.currentTarget.closest('.connection-board')
    const columns = board ? getComputedStyle(board).gridTemplateColumns.trim().split(/\s+/).length : 4
    const rowDelta = event.key === 'ArrowUp' ? -columns : event.key === 'ArrowDown' ? columns : 0
    const colDelta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    const targetIndex = Math.max(0, Math.min(availableCodes.length - 1, currentIndex + rowDelta + colDelta))
    event.preventDefault()
    tileRefs.current.get(availableCodes[targetIndex])?.focus()
  }

  useLayoutEffect(() => () => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current)
  }, [])

  return <div className={`game-body connections-game-body connection-experience${winningMoment ? ' is-complete' : ''}`}>
    <header className="connection-heading question-toolbar">
      <div className="connection-heading-copy">
        <span className="connection-kicker"><span aria-hidden="true">◈</span> Geography Connections <i /> Atlas set {String(Number(puzzle.id.match(/\d+/)?.[0] ?? 1)).padStart(2, '0')}</span>
        <h2>Find four groups of four</h2>
        <p>Sixteen countries. Four hidden links. Some clues overlap.</p>
      </div>
      <div className="connection-heading-tools">
        {mode === 'freeplay' && <GameSettingsMenu><div className="practice-config">
          <GameSettingSelect label="Difficulty" value={difficulty} options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} onChange={(value) => onDifficulty(value as ConnectionsDifficulty)} />
          <AdvancedGameSettings><GameSettingSelect label="Country pool" value={eligibility} options={[{ value: 'standard', label: 'Standard · 195 states' }, { value: 'extended', label: 'Extended · territories included' }]} onChange={(value) => onEligibility(value as GeographyEligibility)} /></AdvancedGameSettings>
        </div></GameSettingsMenu>}
        <div className="connection-progress-block"><span>{solved.length} <i>/</i> 4 groups</span><RoundProgress current={solved.length} total={4} label="groups" /></div>
      </div>
    </header>

    <div className="connection-tier-legend" aria-label="Groups increase in difficulty from yellow to purple">
      {[1, 2, 3, 4].map((tier) => <span className={`connection-tier-dot tier-${tier}${solvedGroups.some((group) => group.tier === tier) ? ' is-found' : ''}`} key={tier}><i />{['Warm-up', 'Map reader', 'Atlas mind', 'Cartographer'][tier - 1]}</span>)}
    </div>

    <div className={`connection-status connections-status${feedback === 'incorrect' ? ' is-error' : ''}${feedback === 'correct' ? ' is-success' : ''}`}>
      <span className="connection-status-mark" aria-hidden="true">{feedback === 'correct' ? <Check size={16} /> : feedback === 'incorrect' ? '!' : '✳'}</span>
      <span className="connection-status-message" aria-live="polite" aria-atomic="true">{message}</span>
      <span className="connection-mistake-meter connections-mistakes" aria-label={`${mistakes} of ${MAX_MISTAKES} mistakes used`}>
        {Array.from({ length: MAX_MISTAKES }, (_, index) => <i key={index} className={index < mistakes ? 'is-used' : ''} />)}
        <small>{mistakesLeft} left</small>
      </span>
    </div>

    {solvedGroups.length > 0 && <div className="connection-solved-stack" aria-label="Solved groups">
      {solvedGroups.map((group) => <section key={group.id} className={`connection-solved-row connections-solved-group tier-${group.tier}`} aria-label={`${group.label}: ${group.explanation}`}>
        <div className="connection-solved-copy"><span>Connection found · {['', 'I', 'II', 'III', 'IV'][group.tier]}</span><strong>{group.label}</strong><small>{group.explanation}</small></div>
        <div className="connection-solved-countries">{group.countryCodes.map((code) => <span key={code}>{countryByCode.get(code)?.name ?? code}</span>)}</div>
      </section>)}
    </div>}

    <div className={`connection-board-frame${feedback === 'incorrect' ? ' is-shaking' : ''}${feedback === 'correct' ? ` is-solving tier-${puzzle.groups.find((group) => group.id === resolvingGroup)?.tier ?? 1}` : ''}`}>
      <div className="connection-board connections-board" role="group" aria-label={`Unsolved country tiles, ${availableCodes.length} remaining`}>
        {availableCodes.map((code, index) => {
          const country = countryByCode.get(code)
          if (!country) return null
          const isSelected = selected.includes(code)
          return <button
            key={country.iso3}
            ref={(element) => { if (element) tileRefs.current.set(code, element); else tileRefs.current.delete(code) }}
            type="button"
            className={`connection-tile connections-tile${isSelected ? ' is-selected' : ''}${feedback === 'correct' && isSelected ? ' is-accepted' : ''}${feedback === 'incorrect' && isSelected ? ' is-rejected' : ''}`}
            aria-pressed={isSelected}
            data-country-code={code}
            disabled={phase !== 'playing'}
            onKeyDown={(event) => moveFocus(event, code)}
            onClick={() => toggleCountry(code)}
            style={{ '--tile-index': index } as CSSProperties}
          >
            <span className="connection-tile-name">{country.name}</span>
            <span className="connection-tile-check" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
          </button>
        })}
      </div>
    </div>

    <div className="connection-controls">
      <div className="connection-selection-count"><strong>{selected.length}</strong><span> of 4 selected</span><span className="connection-selection-hint">{selected.length === 4 ? 'Ready to test your theory' : 'Select four connected countries'}</span><span className="connection-sr-only" role="status" aria-live="polite" aria-atomic="true">{selected.length} of 4 countries selected</span></div>
      <div className="connection-control-buttons">
        <button className="connection-tool-button" type="button" onClick={shuffleRemaining} disabled={phase !== 'playing' || availableCodes.length < 2}><Shuffle size={16} aria-hidden="true" /><span>Shuffle</span></button>
        <button className="connection-tool-button" type="button" onClick={() => { setSelected([]); setMessage('Selection cleared. Take another look at the board.') }} disabled={phase !== 'playing' || !selected.length}><RotateCcw size={16} aria-hidden="true" /><span>Clear</span></button>
        <button className="connection-submit" type="button" onClick={() => void submit()} disabled={phase !== 'playing' || selected.length !== 4}><span>Check group</span><span className="connection-submit-key" aria-hidden="true">↵</span></button>
      </div>
    </div>

    {phase === 'lost' && <div className="connection-reveal" aria-label="Remaining group answers"><div className="connection-reveal-heading"><span>Atlas debrief</span><strong>The remaining links</strong></div>{puzzle.groups.filter((group) => !solved.includes(group.id)).map((group) => <section key={group.id} className={`connection-reveal-row tier-${group.tier}`}><strong>{group.label}</strong><span>{group.countryCodes.map((code) => countryByCode.get(code)?.name ?? code).join(' · ')}</span><small>{group.explanation}</small></section>)}</div>}

    <footer className="connection-footnote"><span>◌</span> The clues draw on borders, capitals, physical geography, history and shared data.</footer>
    <GameResultsDialog complete={finished} gameId="connections" mode={mode} score={score} correct={solved.length} total={4} title={phase === 'won' ? 'Every connection found.' : 'The atlas has more to teach.'} message={`${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'} used · ${puzzle.id.replace('atlas-', 'Set ')}`} saveError={saveError} onReplay={mode === 'freeplay' ? onReplay : undefined} replayLabel="Play another set" />
  </div>
}
