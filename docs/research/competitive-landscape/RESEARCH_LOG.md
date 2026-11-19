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
- Focused Riverways, Connections and expanded-puzzle tests: 24/24 passed. Full unit suite: 117/117 passed. Typecheck, lint and build passed. Production-preview Riverways browser regression passed 1/1. Manual local-browser review verified a distance/direction miss and the second-miss Ethiopia clue on the live game screen.
- This evidence is engineering verification and self-play, not a moderated player study, screen-reader assessment, physical-device session or production deployment.
