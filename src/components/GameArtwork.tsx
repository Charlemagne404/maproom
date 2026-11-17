import type { GameId } from '../geography/types'

export function GameArtwork({ gameId }: { gameId: GameId }) {
  switch (gameId) {
    case 'countries':
      return <img className="art-world" src="/illustrations/world-map.svg" alt="" />
    case 'outlines':
      return <div className="art-outline"><img src="/illustrations/outline-madagascar.svg" alt="" /><span className="art-outline-orbit" /></div>
    case 'routes':
      return <div className="art-route"><img src="/illustrations/world-map.svg" alt="" /><svg viewBox="0 0 320 140" aria-hidden="true"><path d="M42 93 C88 30 133 112 179 66 S250 29 282 49" /><circle className="route-origin" cx="42" cy="93" r="8" /><circle cx="111" cy="71" r="5" /><circle cx="179" cy="66" r="5" /><circle cx="232" cy="49" r="5" /><circle className="route-destination" cx="282" cy="49" r="9" /></svg></div>
    case 'flags':
      return <div className="art-flags" aria-hidden="true"><span className="fi fi-se" /><span className="fi fi-jp" /><span className="fi fi-ng" /></div>
    case 'grid':
      return <div className="art-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} className={index === 4 ? 'is-highlighted' : ''} />)}</div>
    case 'cities':
      return <div className="art-city-target"><svg viewBox="0 0 320 140" aria-hidden="true"><path className="city-grid-lines" d="M49 24H271M49 52H271M49 80H271M49 108H271M76 13V113M132 13V113M188 13V113M244 13V113" /><path className="city-crosshair" d="M160 16V39M160 78V101M104 59H137M183 59H216" /><circle className="city-ring" cx="160" cy="59" r="31" /><circle className="city-ring city-ring-inner" cx="160" cy="59" r="15" /><path className="city-pin" d="M160 91s-19-19-19-34a19 19 0 1 1 38 0c0 15-19 34-19 34Z" /><circle className="city-pin-core" cx="160" cy="57" r="6" /></svg><span>59° 20′ N&nbsp;&nbsp; 18° 04′ E</span></div>
  }
}
