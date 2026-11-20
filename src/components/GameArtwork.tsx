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
    case 'historical-flags':
      return <div className="art-historical-flags" aria-hidden="true"><svg viewBox="0 0 320 140"><rect className="historical-art-card" x="24" y="15" width="272" height="110" rx="4" /><g className="historical-art-flag historical-art-flag-left"><rect x="45" y="41" width="66" height="44" /><path d="M67 41v44m22-44v44" /></g><g className="historical-art-flag historical-art-flag-center"><rect x="127" y="30" width="66" height="44" /><circle cx="160" cy="52" r="11" /></g><g className="historical-art-flag historical-art-flag-right"><rect x="209" y="48" width="66" height="44" /><path d="M209 62h66m-66 15h66" /></g><path className="historical-art-timeline" d="M46 103H274m0 0-7-5m7 5-7 5" /><circle cx="84" cy="103" r="3" /><circle cx="160" cy="103" r="3" /><circle cx="237" cy="103" r="3" /></svg></div>
    case 'historical-states':
      return <div className="art-historical-states" aria-hidden="true"><svg viewBox="0 0 320 140"><rect className="historical-art-card" x="24" y="15" width="272" height="110" rx="4" /><path className="historical-state-grid" d="M40 44h240M40 68h240M40 92h240M80 27v82m40-82v82m40-82v82m40-82v82m40-82v82" /><path className="historical-state-shape" d="m59 61 24-19 26 8 12-11 22 11 16-5 12 15-9 16 8 16-17 7-18-10-14 4-14-14-23 5-11-9-17 2z" /><path className="historical-state-route" d="M45 103c31-18 50-8 76-19s42 6 62-12 38-14 89-28" /><circle cx="45" cy="103" r="4" /><circle cx="272" cy="44" r="4" /></svg></div>
    case 'projection-match':
      return <div className="art-projection-match"><svg viewBox="0 0 320 120" aria-hidden="true"><path className="projection-art-graticule" d="M12 31h65M12 45h65M12 59h65M12 73h65M12 87h65M25 20v78M42 20v78M59 20v78M178 31h65M178 45h65M178 59h65M178 73h65M178 87h65M191 20v78M208 20v78M225 20v78" /><path className="projection-art-land" d="m20 45 8-8 13 3 5 8-5 7-2 11-8 7-7-4-3-10-6-7zm34 26 8 4 6 10-5 7-7-2-3-10zm132-27 8-8 13 3 5 8-5 7-2 11-8 7-7-4-3-10-6-7zm34 26 8 4 6 10-5 7-7-2-3-10z" /><circle className="projection-art-globe" cx="286" cy="60" r="38" /><path className="projection-art-globe-lines" d="M248 60h76M286 22v76M256 36c18 12 18 36 0 48m60-48c-18 12-18 36 0 48M251 46c22 8 48 8 70 0m-70 28c22-8 48-8 70 0" /></svg></div>
    case 'population-pyramid':
      return <div className="art-population-pyramid" aria-hidden="true"><svg viewBox="0 0 320 120"><g className="population-art-grid"><path d="M14 20H306M14 42H306M14 64H306M14 86H306M14 108H306" /></g><g className="population-art-bars"><path d="M59 27h35v9H59zm-10 13h45v9H49zm-7 13h52v9H42zm9 13h38v9H51zm14 13h24v9H65zm18 13h6v9h-6zm78-65h35v9h-35zm0 13h45v9h-45zm0 13h52v9h-52zm0 13h38v9h-38zm0 13h24v9h-24zm0 13h6v9h-6zm80-52h27v9h-27zm-7 13h34v9h-34zm-8 13h42v9h-42zm5 13h37v9h-37zm11 13h26v9h-26zm15 13h11v9h-11z" /></g><path className="population-art-axis" d="M105 13v96m55-96v96m55-96v96" /></svg></div>
    case 'watershed-match':
      return <div className="art-watershed-match"><svg viewBox="0 0 320 120" aria-hidden="true"><path className="watershed-art-cell watershed-art-source" d="m21 31 48-12 35 22-8 33-48 18-32-24z" /><path className="watershed-art-cell" d="m104 41 42-17 34 20-3 38-50 11-39-19z" /><path className="watershed-art-cell" d="m180 44 42-16 36 18-2 38-49 14-34-16z" /><path className="watershed-art-cell" d="m96 77 31 16 50-11 5 24-60 7-41-18z" /><path className="watershed-art-flow" d="M70 60c36-10 40 17 76 12s41-20 75-10" /><path className="watershed-art-arrow" d="m212 53 11 9-13 5" /><circle className="watershed-art-marker" cx="146" cy="72" r="8" /></svg></div>
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
