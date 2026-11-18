import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GameArtwork } from '../../components/GameArtwork'
import './historical-explore-collection.css'

export function HistoricalExploreCollection() {
  return (
    <section className="historical-explore-collection" aria-labelledby="historical-explore-title">
      <div className="historical-explore-copy">
        <span className="eyebrow">Historical geography</span>
        <h2 id="historical-explore-title">Borders across time</h2>
        <p>Read a Maproom-generated snapshot of historical political boundaries from CShapes 2.1, then place it in context. Each year refers to the depicted snapshot date.</p>
        <Link className="historical-explore-link" to="/games/historical-geography?mode=freeplay">
          Play When Was This Map? <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <small className="historical-explore-license">CC BY-NC-SA 4.0 · non-commercial use</small>
      </div>
      <div className="historical-explore-art" aria-hidden="true">
        <GameArtwork gameId="historical-geography" />
        <span className="historical-explore-count">20 generated snapshots · 1886–2011</span>
      </div>
    </section>
  )
}
