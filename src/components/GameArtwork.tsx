import { MapPin } from 'lucide-react'
import type { GameId } from '../geography/types'

export function GameArtwork({ gameId }: { gameId: GameId }) {
  switch (gameId) {
    case 'countries':
      return <img className="art-world" src="/illustrations/world-map.svg" alt="" />
    case 'outlines':
      return <div className="art-outline"><img className="art-outline-light" src="/illustrations/outline-madagascar.svg" alt="" /><img className="art-outline-dark" src="/illustrations/outline-madagascar-dark.svg" alt="" /><span className="art-outline-orbit" /></div>
    case 'routes':
      return <div className="art-route"><img src="/illustrations/world-map.svg" alt="" /><svg viewBox="0 0 320 140" aria-hidden="true"><path d="M42 93 C88 30 133 112 179 66 S250 29 282 49" /><circle className="route-origin" cx="42" cy="93" r="8" /><circle cx="111" cy="71" r="5" /><circle cx="179" cy="66" r="5" /><circle cx="232" cy="49" r="5" /><circle className="route-destination" cx="282" cy="49" r="9" /></svg></div>
    case 'flags':
      return <div className="art-flags" aria-hidden="true"><span className="fi fi-se" /><span className="fi fi-jp" /><span className="fi fi-ng" /></div>
    case 'grid':
      return <div className="art-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} className={index === 4 ? 'is-highlighted' : ''} />)}</div>
    case 'cities':
      return <div className="art-city-target"><svg viewBox="0 0 320 140" aria-hidden="true"><path className="city-grid-lines" d="M49 24H271M49 52H271M49 80H271M49 108H271M76 13V113M132 13V113M188 13V113M244 13V113" /><path className="city-crosshair" d="M160 16V39M160 78V101M104 59H137M183 59H216" /><circle className="city-ring" cx="160" cy="59" r="31" /><circle className="city-ring city-ring-inner" cx="160" cy="59" r="15" /><path className="city-pin" d="M160 91s-19-19-19-34a19 19 0 1 1 38 0c0 15-19 34-19 34Z" /><circle className="city-pin-core" cx="160" cy="57" r="6" /></svg><span>59° 20′ N&nbsp;&nbsp; 18° 04′ E</span></div>
    case 'connections':
      return <div className="art-connections" aria-hidden="true"><span /><span /><span /><span /><i /><i /><i /><i /></div>
    case 'higher-lower':
      return <div className="art-comparison" aria-hidden="true"><span className="comparison-bar comparison-bar-short" /><span className="comparison-bar comparison-bar-tall" /><ArrowMarks /></div>
    case 'neighbours':
      return <div className="art-neighbours" aria-hidden="true"><img src="/illustrations/world-map.svg" alt="" /><svg viewBox="0 0 320 140"><path d="M58 79 107 40 152 69 213 39 266 83" /><circle cx="58" cy="79" r="7" /><circle cx="107" cy="40" r="5" /><circle cx="152" cy="69" r="5" /><circle cx="213" cy="39" r="5" /><circle cx="266" cy="83" r="5" /></svg></div>
    case 'distance':
      return <div className="art-distance" aria-hidden="true"><span className="distance-orbit distance-orbit-outer" /><span className="distance-orbit distance-orbit-inner" /><MapPin size={26} /><i /><b>km</b></div>
    case 'rivers':
      return <div className="art-riverways"><img src="/illustrations/world-map.svg" alt="" /><svg viewBox="0 0 320 140" aria-hidden="true"><path className="river-course-shadow" d="M27 101 C53 78 63 83 79 62 S110 48 123 67 147 100 163 78 181 38 198 49 218 92 240 71 271 38 294 48" /><path className="river-course" d="M27 101 C53 78 63 83 79 62 S110 48 123 67 147 100 163 78 181 38 198 49 218 92 240 71 271 38 294 48" /><circle className="river-source" cx="27" cy="101" r="6" /><circle className="river-mouth" cx="294" cy="48" r="7" /></svg></div>
    case 'latitude-ladder':
      return <div className="art-latitude-ladder"><svg viewBox="0 0 320 140" aria-hidden="true"><path className="ladder-graticule" d="M36 25H284M36 48H284M36 71H284M36 94H284M36 117H284M61 15V125M111 15V125M160 15V125M209 15V125M259 15V125" /><path className="ladder-order-line" d="M63 101 111 80 160 65 210 49 258 31" /><path className="ladder-direction" d="M293 108V31m-7 9 7-9 7 9" /><g><circle cx="63" cy="101" r="12" /><text x="63" y="105">1</text></g><g><circle cx="111" cy="80" r="12" /><text x="111" y="84">2</text></g><g><circle cx="160" cy="65" r="12" /><text x="160" y="69">3</text></g><g><circle cx="210" cy="49" r="12" /><text x="210" y="53">4</text></g><g><circle cx="258" cy="31" r="12" /><text x="258" y="35">5</text></g></svg></div>
    case 'historical-geography':
      return <svg viewBox="0 0 320 140" aria-hidden="true" style={{ width: '100%', height: '100%' }}><rect x="28" y="14" width="264" height="112" rx="4" fill="#f1e8d9" stroke="#bcad98" /><path d="M42 70H278M160 24V116M61 33l35 13-15 22 18 22-42 21-15-29 20-17-19-18Zm93-3 28 11 11 24-17 9-4 27-21-7 7-24-17-13zm58 39 25 9-10 15-21-5z" fill="#b9cbb7" stroke="#8f9c8b" strokeWidth="1.4" strokeLinejoin="round" /><path d="M54 41c22 9 32 7 45 19m86-12c8 14 19 18 39 15m-96 33c9-12 19-11 26-19" fill="none" stroke="#cc8d62" strokeWidth="2" strokeDasharray="3 3" /></svg>
    default:
      return assertNever(gameId)
  }
}

function ArrowMarks() {
  return <svg viewBox="0 0 50 56" aria-hidden="true"><path d="M25 43V13M14 24l11-11 11 11M14 32l11 11 11-11" /></svg>
}

function assertNever(value: never): never {
  throw new Error('Missing artwork for ' + String(value) + '.')
}
