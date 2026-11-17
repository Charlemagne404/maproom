import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return <div className="page not-found-page"><span className="eyebrow">404 · off the map</span><h1>We can’t find that place.</h1><p>The address may have moved, or it may never have been part of this atlas.</p><Link className="button button-dark" to="/"><ArrowLeft size={15} /> Return to today’s puzzles</Link></div>
}
