import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { GameResultsDialog } from '../../components/GameResults'
import { InlineNotice, LoadingState } from '../../components/Kit'
import type { GameMode, GeographyData } from '../../geography/types'
import { useGameSession } from '../session'
import { POPULATION_AGE_COHORTS, loadPopulationAgeProfiles, type PopulationAgeProfile, type PopulationAgeProfiles } from './data'
import { createPopulationPyramidDeck, POPULATION_PYRAMID_ROUNDS, scorePopulationPyramidOrder } from './puzzle'
import './population-pyramid.css'

interface SavedPopulationProgress {
  setIndex?: unknown
  round?: unknown
  answers?: unknown
  order?: unknown
  finished?: unknown
}

export function PopulationPyramidGame({ data, mode, date, seed }: { data: GeographyData; mode: GameMode; date: string; seed: string }) {
  const [populationData, setPopulationData] = useState<PopulationAgeProfiles | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    loadPopulationAgeProfiles().then((loaded) => {
      if (active) {
        setPopulationData(loaded)
        setLoadError('')
      }
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Population age profiles could not be loaded.')
    })
    return () => { active = false }
  }, [])

  if (loadError) return <div className="game-body"><InlineNotice title="Population data is unavailable" tone="warning"><p>{loadError}</p><button className="button button-outline" type="button" onClick={() => window.location.reload()}>Reload this game</button></InlineNotice></div>
  if (!populationData) return <div className="game-body"><LoadingState label="Loading 2023 population profiles…" /></div>

  return <PopulationPyramidSession key={`${seed}:${mode}`} data={data} populationData={populationData} mode={mode} date={date} seed={seed} />
}

function PopulationPyramidSession({ data, populationData, mode, date, seed }: {
  data: GeographyData
  populationData: PopulationAgeProfiles
  mode: GameMode
  date: string
  seed: string
}) {
  const session = useGameSession('population-pyramid', mode, date, seed)
  const { save, saveError, resetSession, saveProgress } = session
  const saved = session.progress as SavedPopulationProgress | null
  const initialSetIndex = readIndex(saved?.setIndex)
  const [setIndex, setSetIndex] = useState(initialSetIndex)
  const deck = useMemo(() => createPopulationPyramidDeck(
    populationData.profiles.filter((profile) => data.countriesByCode.has(profile.iso3)),
    seed,
    setIndex,
  ), [data.countriesByCode, populationData.profiles, seed, setIndex])
  const restoredRound = Math.min(readIndex(saved?.round), deck.length - 1)
  const [round, setRound] = useState(restoredRound)
  const [answers, setAnswers] = useState(() => restoreAnswers(saved?.answers, deck))
  const [order, setOrder] = useState(() => restoreOrder(saved?.order, deck[restoredRound]?.startingOrder ?? []))
  const [finished, setFinished] = useState(saved?.finished === true)
  const question = deck[round]
  const submittedOrder = answers[round]
  const checked = Boolean(submittedOrder)
  const score = answers.reduce((total, answer, index) => total + (deck[index] ? scorePopulationPyramidOrder(answer, trueOrder(deck[index]!)).score : 0), 0)
  const exactRounds = answers.reduce((total, answer, index) => total + Number(Boolean(deck[index] && scorePopulationPyramidOrder(answer, trueOrder(deck[index]!)).exact)), 0)
  const profileByCode = useMemo(() => new Map(populationData.profiles.map((profile) => [profile.iso3, profile])), [populationData.profiles])
  const startingLabels = useMemo(() => new Map((question?.startingOrder ?? []).map((code, index) => [code, String.fromCharCode(65 + index)])), [question])
  const resolvedOrder = order.map((code) => profileByCode.get(code)).filter((profile): profile is PopulationAgeProfile => Boolean(profile))
  const currentScore = submittedOrder && question ? scorePopulationPyramidOrder(submittedOrder, trueOrder(question)) : null

  useEffect(() => {
    if (finished) return
    void saveProgress({ version: 1, setIndex, round, answers, order, finished: false })
  }, [answers, finished, order, round, saveProgress, setIndex])

  function moveProfile(index: number, delta: -1 | 1) {
    if (checked || finished) return
    const nextIndex = index + delta
    if (nextIndex < 0 || nextIndex >= order.length) return
    const next = [...order]
    ;[next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!]
    setOrder(next)
  }

  function checkOrder() {
    if (checked || !question || order.length !== 3) return
    setAnswers((current) => [...current.slice(0, round), order])
  }

  async function advance() {
    if (!checked || !question) return
    if (round < deck.length - 1) {
      const nextRound = round + 1
      setRound(nextRound)
      setOrder(deck[nextRound]!.startingOrder)
      return
    }

    const finalAnswers = answers.slice(0, round + 1)
    const finalScore = finalAnswers.reduce((total, answer, index) => total + scorePopulationPyramidOrder(answer, trueOrder(deck[index]!)).score, 0)
    const finalExactRounds = finalAnswers.reduce((total, answer, index) => total + Number(scorePopulationPyramidOrder(answer, trueOrder(deck[index]!)).exact), 0)
    setFinished(true)
    await saveProgress({ version: 1, setIndex, round, answers: finalAnswers, order, finished: true })
    await save(finalScore, finalExactRounds, POPULATION_PYRAMID_ROUNDS, { setIndex, answers: finalAnswers })
  }

  function replay() {
    const nextSet = setIndex + 1
    const nextDeck = createPopulationPyramidDeck(
      populationData.profiles.filter((profile) => data.countriesByCode.has(profile.iso3)),
      seed,
      nextSet,
    )
    resetSession()
    setSetIndex(nextSet)
    setRound(0)
    setAnswers([])
    setOrder(nextDeck[0]!.startingOrder)
    setFinished(false)
  }

  if (!question || resolvedOrder.length !== 3) {
    return <div className="game-body"><InlineNotice title="This profile set could not be prepared" tone="warning">Return to the game library and reopen Population Pyramid Sort.</InlineNotice></div>
  }

  return (
    <div className="game-body population-pyramid-game">
      <header className="population-pyramid-heading">
        <div>
          <span className="eyebrow">Population profiles · {round + 1} of {POPULATION_PYRAMID_ROUNDS}</span>
          <h2>Order by the share aged 65+</h2>
          <p>Move the three profiles from the smallest 65+ share to the largest. Country names stay hidden until you check.</p>
          <p className="population-pyramid-scoring-rule">Each correctly ordered pair is worth 100 points (up to 300 per round). All three pairs right makes a perfect round.</p>
        </div>
        <div className="population-pyramid-score" aria-label={`${score.toLocaleString()} of 1,500 points, ${exactRounds} of ${POPULATION_PYRAMID_ROUNDS} perfect rounds`}>
          <strong>{score.toLocaleString()}</strong><span> / 1,500 points</span><small>{exactRounds} of {POPULATION_PYRAMID_ROUNDS} perfect rounds</small>
        </div>
      </header>

      <div className="population-pyramid-progress" role="status" aria-live="polite">
        <span>Round {round + 1} of {POPULATION_PYRAMID_ROUNDS}</span>
        <span>Profiles get closer together each round</span>
      </div>

      <div className="population-pyramid-key" aria-label="Chart legend and scale">
        <span><i className="population-pyramid-swatch is-male" />Male</span>
        <span><i className="population-pyramid-swatch is-female" />Female</span>
        <p>Each bar is a share of the total population; all profiles use the same 0–8% scale.</p>
      </div>

      <ol className="population-pyramid-order" aria-label="Your current profile order">
        {resolvedOrder.map((profile, index) => {
          const country = data.countriesByCode.get(profile.iso3)!
          const label = startingLabels.get(profile.iso3) ?? 'Profile'
          const correctRank = question.profiles.findIndex((item) => item.iso3 === profile.iso3)
          const userRank = submittedOrder?.indexOf(profile.iso3) ?? -1
          return <li key={profile.iso3} data-iso3={profile.iso3} className={`population-pyramid-card${checked && userRank !== correctRank ? ' is-misplaced' : ''}${checked && userRank === correctRank ? ' is-in-place' : ''}`}>
            <div className="population-pyramid-card-heading">
              <span className="population-pyramid-rank">Position {index + 1}</span>
              <h3>Profile {label}</h3>
              {checked && <span className="population-pyramid-result-rank">Correct position {correctRank + 1}</span>}
            </div>
            <PyramidChart profile={profile} label={`Profile ${label}`} />
            {checked && <div className="population-pyramid-reveal">
              <strong>{country.name}</strong>
              <span>{formatShare(profile.age65Plus)} of the population is aged 65+</span>
            </div>}
            <div className="population-pyramid-move-controls" aria-label={`Move Profile ${label}`}>
              <button type="button" aria-label={`Move Profile ${label} earlier`} disabled={checked || index === 0} onClick={() => moveProfile(index, -1)}><ChevronLeft size={17} aria-hidden="true" /><span>Earlier</span></button>
              <button type="button" aria-label={`Move Profile ${label} later`} disabled={checked || index === order.length - 1} onClick={() => moveProfile(index, 1)}><span>Later</span><ChevronRight size={17} aria-hidden="true" /></button>
            </div>
          </li>
        })}
      </ol>

      {checked && currentScore && <section className="population-pyramid-feedback" aria-labelledby="population-pyramid-feedback-title">
        <h3 id="population-pyramid-feedback-title" className="sr-only">Round result</h3>
        <p role="status" aria-live="polite"><strong>{currentScore.exact ? 'Perfect order.' : `${currentScore.correctPairs} of 3 country pairs are in the right order.`}</strong> The 65+ shares are shown on each profile.</p>
        <ol aria-label="Correct order from lowest to highest 65+ share">
          {question.profiles.map((profile, index) => <li key={profile.iso3}><span>{index + 1}</span><strong>{data.countriesByCode.get(profile.iso3)?.name}</strong><b>{formatShare(profile.age65Plus)}</b></li>)}
        </ol>
        <button className="button button-dark" type="button" onClick={() => void advance()}>{round === deck.length - 1 ? 'Finish set' : 'Next round'}</button>
      </section>}

      {!checked && <button className="button button-dark population-pyramid-check" type="button" onClick={checkOrder}>Check this order</button>}

      <p className="population-pyramid-source">2023 estimates. Male and female cohort shares are weighted by each sex’s population total to show a percentage of the whole population. Source: World Bank World Development Indicators; underlying age estimates are from the UN World Population Prospects 2024 Revision.</p>

      <GameResultsDialog
        complete={finished}
        gameId="population-pyramid"
        mode={mode}
        score={score}
        correct={exactRounds}
        total={POPULATION_PYRAMID_ROUNDS}
        title={exactRounds === POPULATION_PYRAMID_ROUNDS ? 'Every profile set in order.' : 'A clearer picture of age.'}
        message={`${score.toLocaleString()} of 1,500 possible points across 15 pairwise comparisons. Each round used the same 2023 age profiles, with the differences between countries narrowing as you went.`}
        saveError={saveError}
        onReplay={mode === 'freeplay' ? replay : undefined}
        replayLabel="Compare another set"
      />
    </div>
  )
}

function PyramidChart({ profile, label }: { profile: PopulationAgeProfile; label: string }) {
  const rows = [...POPULATION_AGE_COHORTS].reverse().map(({ code, label: ageLabel }, reverseIndex) => {
    const index = POPULATION_AGE_COHORTS.length - reverseIndex - 1
    return { code, ageLabel, male: profile.male[index]!, female: profile.female[index]! }
  })
  return <figure className="population-pyramid-figure" aria-labelledby={`population-pyramid-caption-${label.replaceAll(' ', '-')}`}>
    <div className="population-pyramid-chart" aria-hidden="true">
      <div className="population-pyramid-axis"><span>8%</span><span>0% · Age · 0%</span><span>8%</span></div>
      {rows.map(({ code, ageLabel, male, female }) => <div className="population-pyramid-row" key={code}>
        <span className="population-pyramid-bar-track is-male"><i style={{ width: `${Math.min(100, male / 8 * 100)}%` }} /></span>
        <span className="population-pyramid-age">{ageLabel}</span>
        <span className="population-pyramid-bar-track is-female"><i style={{ width: `${Math.min(100, female / 8 * 100)}%` }} /></span>
      </div>)}
    </div>
    <figcaption id={`population-pyramid-caption-${label.replaceAll(' ', '-')}`} className="sr-only">{label}, 2023. Male population shares are on the left, female shares are on the right, and age bands run from 80 and older down to 0–4. Exact cohort values are available in the age-band table.</figcaption>
    <details className="population-pyramid-data">
      <summary>Show {label} age-band values</summary>
      <div className="population-pyramid-data-table-wrap">
        <table className="population-pyramid-data-table">
          <caption>{label}: male and female shares of the total population by age band, 2023</caption>
          <thead><tr><th scope="col">Age band</th><th scope="col">Male share</th><th scope="col">Female share</th></tr></thead>
          <tbody>{rows.map(({ code, ageLabel, male, female }) => <tr key={code}><th scope="row">{ageLabel}</th><td>{formatShare(male)}</td><td>{formatShare(female)}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </figure>
}

function trueOrder(question: { profiles: PopulationAgeProfile[] }): string[] {
  return question.profiles.map(({ iso3 }) => iso3)
}

function restoreAnswers(value: unknown, deck: ReturnType<typeof createPopulationPyramidDeck>): string[][] {
  if (!Array.isArray(value)) return []
  const answers: string[][] = []
  for (const [index, item] of value.slice(0, deck.length).entries()) {
    const answer = restoreOrder(item, [])
    const validCodes = new Set(deck[index]?.profiles.map(({ iso3 }) => iso3) ?? [])
    if (answer.length !== 3 || answer.some((code) => !validCodes.has(code))) break
    answers.push(answer)
  }
  return answers
}

function restoreOrder(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value) || value.length !== 3 || value.some((code) => typeof code !== 'string')) return fallback
  const codes = value as string[]
  return new Set(codes).size === 3 ? codes : fallback
}

function readIndex(value: unknown): number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0 ? value : 0
}

function formatShare(value: number): string {
  return `${value.toFixed(1)}%`
}
