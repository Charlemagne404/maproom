import { Link } from 'react-router-dom'
import { ArrowRight, ChartNoAxesColumnIncreasing } from 'lucide-react'
import { useAppData } from '../app/useAppData'
import { PageHeading } from '../components/Kit'
import { games } from '../games/catalog'
import { calculateStatistics } from '../statistics/summary'

export function StatisticsPage() {
  const { state } = useAppData()
  const stats = calculateStatistics(state.history, state.settings.timeZone)
  const recent = state.history.slice(0, 8)
  const maxScore = Math.max(1000, ...stats.trend.map((point) => point.score ?? 0))

  return (
    <div className="page statistics-page">
      <PageHeading eyebrow="Your atlas, over time" title="Statistics" description="A personal record of the maps you’ve learned and the puzzles you’ve solved." />
      {stats.totalPlayed === 0 ? (
        <div className="empty-state stats-empty">
          <span className="empty-icon"><ChartNoAxesColumnIncreasing size={22} /></span>
          <h2>Your first result is waiting</h2>
          <p>Play a daily puzzle or start a practice round. Your results will appear here.</p>
          <Link className="button button-dark" to="/explore">Find a game <ArrowRight size={15} /></Link>
        </div>
      ) : (
        <>
          <section className="stat-overview" aria-label="Overall statistics">
            <Stat label="Games played" value={stats.totalPlayed.toLocaleString()} detail={`${stats.totalCompleted} completed`} />
            <Stat label="Accuracy" value={`${Math.round(stats.accuracy * 100)}%`} detail="Across completed questions" />
            <Stat label="Average score" value={Math.round(stats.averageScore).toLocaleString()} detail="Per completed game" />
            <Stat label="Best daily streak" value={`${stats.bestDailyStreak} ${stats.bestDailyStreak === 1 ? 'day' : 'days'}`} detail={`Current: ${stats.currentDailyStreak} days`} />
          </section>
          <section className="stats-section trend-section">
            <div className="section-heading"><div><span className="eyebrow">Daily results</span><h2>Two weeks at a glance</h2></div><span className="muted-note">Average daily score</span></div>
            <div className="trend-chart" role="img" aria-label="Average score over the last fourteen days">
              {stats.trend.map((point) => {
                const height = point.score === null ? 2 : Math.max(4, point.score / maxScore * 100)
                return <div key={point.date} className="trend-column" title={`${point.date}: ${point.score === null ? 'no result' : Math.round(point.score)}`}><span className={point.score === null ? 'trend-bar is-empty' : 'trend-bar'} style={{ height: `${height}%` }} /><span className="trend-date">{point.date.slice(8)}</span></div>
              })}
            </div>
          </section>
          <section className="stats-section">
            <div className="section-heading"><div><span className="eyebrow">By game</span><h2>Where you’ve been</h2></div></div>
            <div className="game-stat-list">
              {stats.byGame.map((summary) => {
                const game = games.find((item) => item.id === summary.gameId)!
                return <Link key={summary.gameId} to={`${game.path}?mode=practice`} className="game-stat-row">
                  <span className="game-stat-name">{game.title}</span>
                  <span>{summary.completed} {summary.completed === 1 ? 'game' : 'games'}</span>
                  <span>{summary.total ? `${Math.round(summary.accuracy * 100)}% accuracy` : '—'}</span>
                  <span>{summary.completed ? `Best ${summary.bestScore.toLocaleString()}` : '—'}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              })}
            </div>
          </section>
          <section className="stats-section">
            <div className="section-heading"><div><span className="eyebrow">Recent history</span><h2>Last played</h2></div><span className="muted-note">Best score: {stats.bestScore.toLocaleString()}</span></div>
            <div className="history-list">
              {recent.map((result) => {
                const game = games.find((item) => item.id === result.gameId)
                return <div className="history-row" key={result.id}>
                  <div><strong>{game?.title ?? result.gameId}</strong><span>{result.mode === 'daily' ? 'Daily' : 'Practice'} · {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: state.settings.timeZone }).format(new Date(result.completedAt))}</span></div>
                  <div className="history-result"><strong>{result.score.toLocaleString()}</strong><span>{result.correct} / {result.total} correct</span></div>
                </div>
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="stat-cell"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}
