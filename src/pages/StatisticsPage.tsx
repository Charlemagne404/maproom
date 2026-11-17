import { Link } from 'react-router-dom'
import { ArrowRight, ChartNoAxesColumnIncreasing } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { PageHeading } from '../components/Kit'
import { games } from '../games/catalog'
import { ActivityHeatmap } from '../statistics/ActivityHeatmap'
import { calculateStatistics } from '../statistics/summary'
import { usePuzzleDate } from '../hooks/usePuzzleDate'

export function StatisticsPage() {
  const { state } = useAppData()
  const today = usePuzzleDate(state.settings.timeZone)
  const stats = calculateStatistics(state.history, state.settings.timeZone, today ?? undefined)
  const recent = state.history.filter((result) => result.completed).slice(0, 10)

  return (
    <div className="page statistics-page">
      <PageHeading title="Statistics" />

      <section className="stat-overview" aria-label="Overall performance">
        <Stat label="Current streak" value={`${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`} />
        <Stat label="Longest streak" value={`${stats.longestStreak} ${stats.longestStreak === 1 ? 'day' : 'days'}`} />
        <Stat label="Games completed" value={stats.totalCompleted.toLocaleString()} detail={<span><b>{stats.dailyCompleted}</b> Daily · <b>{stats.freeplayCompleted}</b> Free play</span>} />
        <Stat label="Overall accuracy" value={stats.totalCompleted ? `${Math.round(stats.accuracy * 100)}%` : '—'} detail={stats.totalCompleted ? 'Across completed questions' : 'No completed games yet'} />
        <Stat label="Total points" value={stats.totalPoints.toLocaleString()} detail="Across completed games" />
      </section>

      <section className="stats-panel activity-panel" id="activity" aria-labelledby="activity-title">
        <div className="stats-panel-heading">
          <div><span className="eyebrow">Past year</span><h2 id="activity-title">Activity</h2></div>
          <span className="panel-summary">{stats.activeDays} active {stats.activeDays === 1 ? 'day' : 'days'}</span>
        </div>
        {today && <ActivityHeatmap activity={stats.activity} today={today} />}
      </section>

      <div className="statistics-lower-grid">
        <section className="stats-panel performance-panel" aria-labelledby="performance-title">
          <div className="stats-panel-heading">
            <div><span className="eyebrow">Recent results</span><h2 id="performance-title">Accuracy</h2></div>
            <span className="panel-summary">Last 14 days</span>
          </div>
          <div className="trend-chart" role="img" aria-label="Completed game accuracy over the last fourteen days">
            {stats.trend.map((point) => {
              const percent = point.accuracy === null ? 0 : Math.round(point.accuracy * 100)
              const height = point.accuracy === null ? 2 : Math.max(3, percent)
              return <div key={point.date} className="trend-column" title={`${point.date}: ${point.accuracy === null ? 'no completed games' : `${percent}% accuracy, ${point.completed} ${point.completed === 1 ? 'game' : 'games'}`}`}>
                <span className={point.accuracy === null ? 'trend-bar is-empty' : 'trend-bar'} style={{ height: `${height}%` }} />
                <span className="trend-date">{point.date.slice(8)}</span>
              </div>
            })}
          </div>
          <div className="chart-axis-labels"><span>0%</span><span>100%</span></div>
        </section>

        <section className="stats-panel game-performance-panel" aria-labelledby="game-performance-title">
          <div className="stats-panel-heading">
            <div><span className="eyebrow">By game</span><h2 id="game-performance-title">Performance</h2></div>
            <Link className="quiet-link" to="/explore">Explore <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          {stats.byGame.length ? <div className="game-stat-list">
            {stats.byGame.map((summary) => {
              const game = games.find((item) => item.id === summary.gameId)!
              return <Link key={summary.gameId} to={`${game.path}?mode=freeplay`} className="game-stat-row">
                <span className="game-stat-name">{game.shortTitle}</span>
                <span className="game-stat-mode"><small>Daily</small><strong>{summary.dailyCompleted}</strong></span>
                <span className="game-stat-mode"><small>Free play</small><strong>{summary.freeplayCompleted}</strong></span>
                <span className="game-stat-accuracy"><small>Accuracy</small><strong>{summary.total ? `${Math.round(summary.accuracy * 100)}%` : '—'}</strong></span>
                <span className="game-stat-best"><small>Best</small><strong>{summary.bestScore.toLocaleString()}</strong></span>
              </Link>
            })}
          </div> : <p className="stats-empty-note">Completed games will appear here.</p>}
        </section>
      </div>

      <section className="stats-panel history-panel" aria-labelledby="history-title">
        <div className="stats-panel-heading">
          <div><span className="eyebrow">Your latest completions</span><h2 id="history-title">Recent games</h2></div>
          <span className="panel-summary">{stats.totalCompleted.toLocaleString()} total</span>
        </div>
        {recent.length ? <div className="history-list">
          {recent.map((result) => {
            const game = games.find((item) => item.id === result.gameId)
            const accuracy = result.total > 0 ? Math.round(result.correct / result.total * 100) : null
            const completedAt = new Date(result.completedAt)
            const date = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: state.settings.timeZone }).format(completedAt)
            return <article className="history-row" key={result.id}>
              <div className="history-game"><strong>{game?.title ?? result.gameId}</strong><span>{result.mode === 'daily' ? 'Daily' : 'Free play'} · {date}</span></div>
              <div className="history-metric"><small>Score</small><strong>{result.score.toLocaleString()}</strong></div>
              <div className="history-metric history-result"><small>Accuracy</small><strong>{accuracy === null ? '—' : `${accuracy}%`}</strong><span>{result.correct} / {result.total} correct</span></div>
            </article>
          })}
        </div> : <div className="stats-empty-note stats-empty-inline">
          <span className="empty-icon"><ChartNoAxesColumnIncreasing size={20} aria-hidden="true" /></span>
          <span>Complete a Daily puzzle or start a Free play round to see your history.</span>
          <Link to="/explore">Find a game <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>}
      </section>
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: React.ReactNode }) {
  return <div className="stat-cell"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}
