# Research log

## 19 November 2026 — competitive review and Maproom baseline

### Direct browser observation

- [Teuteuf portfolio](https://teuteuf.fr/): counted 19 current game entries. Directly played a round or partial round of Worldle, Travle, Flagle, GeoGrid, GeoConnections and Historicale. Opened Geozee, WhereTaken and WhenTaken but did not submit a round after consent controls appeared. See individual studies for limits.
- [Geocore Classic catalog](https://www.geocore.fun/game-catalog): observed 85/85 entries, numbered 001–069 and 072–087, thirteen input labels, category totals, Windows-only tags, and no-Pro/no-account labels. Also checked [Play](https://www.geocore.fun/play) and a guest Click Country round.
- [Seterra](https://www.seterra.com/): played one US states round. Guest score advanced after an Illinois answer; no high-score login was used.
- [Globle](https://globle-game.com/): submitted one wrong country and observed country coloring plus closest-border distance.
- [TimeGuessr](https://timeguessr.com/): played one five-round session; recorded one location/year score breakdown.
- [World Geography Games](https://world-geography-games.com/): inspected the broad catalog and opened a country map quiz; a test map click did not register, so no answer is reported.
- [Sporcle](https://www.sporcle.com/): rejected optional cookie processing, passed the site's continue-without-ads prompt, played four correct responses in Countries of the World, then reviewed the result screen.
- [GeoGuessr](https://www.geoguessr.com/free): guest daily challenge was advertised; the play action led to signup. No account was created.

### Limits and incomplete play

- [WhereTaken](https://wheretaken.com/) and [WhenTaken](https://whentaken.com/) displayed consent controls that included precise geolocation and ad processing. No consent was granted and no guess was submitted. Their public instructions and first game screen were recorded only.
- [NYT Games](https://www.nytimes.com/games/) could not be opened because the browser raised a safety block. No alternate route was attempted.
- Geocore had no version string on its current Classic catalog. The live page count (85 Classic modes), Play headline (168 games) and October 2026 2.0 announcement (73 games) were preserved as separate claims.
- Daily puzzles and catalog modes may change after the access date. No unavailable account or paid flow was inferred.

### Maproom validation and implementation

- Clean baseline: typecheck, lint and production build passed; 113/114 unit tests passed because one editorial Connections audit test exceeded its 5-second timeout; production-preview browser suite passed 87/87 sequentially with one worker.
- Riverways improvement: wrong guesses now compare calculated line centres (50 km rounding and compass direction); after two misses, the target line-centre country is shown. The wording distinguishes centre distance from shortest river-course distance.
- Connections audit improvement: fact rules are evaluated against the 16 board tiles, retaining exact alternate-quartet checks while avoiding repeated scans across the whole country catalog.
- Geography Grid Free Play pool review: a deterministic 240-board sample increased from 345 to 371 unique row/column clue pairs and reduced P90 intersection size from 32 to 27, while preserving all 240 valid boards. The most-used category rose from 76 to 77 appearances; human play repetition and difficulty remain unmeasured.
- Border Route follow-up: after accepting any complete path, results now compare its border count with the shortest route and state any extra stops. Travle's qualitative route feedback informed the comparison; Maproom keeps its map-first input and accepts longer valid routes.
- Neighbour Challenge follow-up: the check result now names the matched, missing and extra countries instead of revealing only counts plus the complete answer list. The production-preview regression checks one missing item, one extra item, and the subsequent exact-round results.
- Focused Riverways, Connections and expanded-puzzle tests: 24/24 passed. Full unit suite: 117/117 passed. Typecheck, lint and build passed. Production-preview Riverways browser regression passed 1/1. Manual local-browser review verified a distance/direction miss and the second-miss Ethiopia clue on the live game screen.
- This evidence is engineering verification and self-play, not a moderated player study, screen-reader assessment, physical-device session or production deployment.

## 19 November 2026 — Higher or Lower source coverage

- Queried five World Development Indicators series for the exact 2023 observation and matched them by ISO3 to Maproom's 195 Standard and 243 Extended identities. The API data metadata reported a last update of 11 November 2026. Coverage, positive-value counts, possible pair totals under the existing ratio bands, sources and interpretation limits are recorded in [GAME_RESEARCH.md](../../GAME_RESEARCH.md).
- Life expectancy has the broadest positive coverage (194/195 Standard and 215/243 Extended) and supports 17,506 possible Standard-pool close pairs and 21,469 Extended-pool close pairs. It is a candidate for a separate content decision, not approved for implementation. GDP per capita, Internet use, CO₂-equivalent emissions and signed population growth each have distinct source or interpretation limits.
- The source audit found that the results screen's blanket “2023 country data” wording overstated provenance. The result and rules now say that population uses 2023 World Bank data where present, falls back to country-catalog population, and that area comes from that catalog. No metric, data file or comparison rule changed.

## 19 November 2026 — Distance & Direction pair calibration

- A five-seed, 100-question-per-configuration World sample confirmed full 20-question generator completion and correct-answer key spread from 45% to 60% left. It exposed that coordinate Close calls had no maximum: their old median gaps reached 20.31° north/south and 82.57° east/west. They now use 0.35° to under 4°, while Standard retains a 4° floor. Distance Close calls remain within the existing 1.01–1.35 ratio.
- Question uniqueness now uses the origin and the unordered two-city choice pair. The extended-region selector also excludes any continent with fewer than three eligible current cities at the chosen minimum population. A deterministic 50-question scan found six short Oceania decks at the 1-million threshold (13 distance, 32 latitude, 4 longitude); the interface states the generated count and how to widen the pool.
- Unit and focused browser checks verify the comparison bands, two-choice flow, scope availability and short-deck feedback. Player response and completion data remain unavailable, so no player-difficulty claim is made.

## 19 November 2026 — Historical Geography sequences and Country Outlines pilot

- Reviewed a contact sheet of all 20 bundled historical-map SVGs. Close neighboring modern snapshots can be visually subtle, so the Free Play sequence prototype uses six seeded three-map sets with year gaps of at least 22 years. Players reorder maps with Earlier/Later controls, score the three pairwise chronology relations, and see the dated, cited timeline after submission. Existing year-guess play, saved progress, and Daily eligibility remain unchanged.
- The sequence is an interaction prototype based on the existing curated CShapes snapshots, not a claim that new players will understand the task or find its difficulty appropriate. The desktop and mobile layouts were inspected; mobile stacks the cards without horizontal overflow.
- Prepared a standalone Country Outlines study instrument for the fixed 12-target, three-tier sample and orders A/B/C in [the study pack](STUDIES/country-outlines-difficulty.md). It presents uncued silhouettes, locks one answer per map, collects response time/confidence/familiarity, withholds correctness until the last item, and provides a facilitator-triggered CSV download. It uses no network, analytics, cookies, or browser storage. Browser walkthrough completed all 12 items and verified the CSV content/name; no participant responses were collected.
- Validation passed for the sequence: full unit suite (127/127), typecheck, lint, production build (22 route snapshots, 19 indexable sitemap URLs, 201 precached assets; all 20 historical maps checked), and the full Historical Geography Playwright file (6/6, one worker). The study tool's desktop/mobile layouts and browser flow were also manually inspected. No difficulty thresholds changed and no deployment occurred.

## 19 November 2026 — Geocore Geo Puzzle follow-up

- A second inspection of the live [Play page](https://www.geocore.fun/play) showed 169 games and 2,200+ quizzes; the earlier same-day capture showed 168. The [Classic catalog](https://www.geocore.fun/game-catalog) remains a separate 85-mode surface with no version string.
- Played one guest round of **Geo Puzzle: Countries** without account creation. The World setup contained 20 pieces selected from 197 countries, with normal snapping and no names or timer. Direct observation confirmed drag or select-and-tap placement, zoom controls, a geographic hint, a wrong-drop distance message, and a green snap confirmation. The first correct Bulgaria placement advanced the score display to 75 and progress to 1/20. The session ended before a complete round.
- The accessibility tree exposed per-piece controls and documented arrow-key movement plus Enter-to-drop; successful keyboard placement was not tested. This preserves the distinction between the visible game flow and the browser's exposed instruction.
- Direct play showed that the proposed Country Mosaic concept would repeat the same central map-reconstruction action. It is now deferred unless a future design adds a different learning outcome and accessible input. No new feature or data was added.

## 19 November 2026 — Climate Twins source shortlist

- The official WorldClim 2.1 page offers monthly climate surfaces for 1970–2000 at resolutions down to about 1 km, but WorldClim's current license page limits use to academic/noncommercial purposes and forbids redistribution or commercial use without prior permission. This dataset is not suitable for bundling under the current project assumptions.
- The World Bank Climate Change Knowledge Portal documents observed CRU TS data, a 1991–2020 climatology, public gridded archives, and CC BY 4.0 terms. The currently listed CRU product uses a 0.5° grid, which is suitable for broad climate-pattern exploration but can smooth coastal and elevation differences at city scale.
- Climate Twins remains a candidate, not an approved feature. Before implementation, extract a small set of city-adjacent grid cells, check missingness, duplicate cells and chart separability, and describe the result as gridded climate context rather than station/city-wide normals. No data was downloaded into the project and no app code changed.
