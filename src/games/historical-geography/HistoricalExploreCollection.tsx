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
        <p>Read a changing political map, then place it in its historical moment. A small, sourced collection for curious map readers.</p>
        <Link className="historical-explore-link" to="/games/historical-geography?mode=freeplay">
          Play When Was This Map? <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="historical-explore-art" aria-hidden="true">
        <GameArtwork gameId="historical-geography" />
        <span className="historical-explore-count">20 dated maps · 1886–2011</span>
      </div>
    </section>
  )
}
