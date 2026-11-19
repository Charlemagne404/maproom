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

- WorldClim 2.1 offers monthly climate surfaces for 1970–2000 at resolutions down to about 1 km, but its license page limits use to academic/noncommercial purposes and requires prior permission for redistribution or commercial use. It remains unsuitable for Maproom bundling without permission.
- The public CCKP S3 archive exposed CRU TS 4.09 monthly temperature and precipitation NetCDFs for 1991–2020 on a 0.5° grid. Its collection page says 4.07 and the indexed World Bank metadata page says 4.08, so version documentation is inconsistent. Each NetCDF's embedded `wb_data_license_comment` says UK Open Government Licence v3, CCKP metadata says CC BY 4.0, and the AWS Registry lists ODbL. Climate data will not be bundled or used to derive gameplay content until the World Bank clarifies which terms/version apply.
- A temporary extraction audit matched the files to 11,577 current whole settlements in Maproom's 12,405-record major-city file: 11,559 had all twelve months; 18 nearest cells were masked. The broad pool had 6,344 valid cells, 2,003 shared by several records, and 6,330 profiles after rounding temperature to 1°C and precipitation to 10 mm. All 179 capital-marked records had data and yielded 178 profiles; Brazzaville and Kinshasa shared one cell/profile. This favors a curated capital-only sample if rights clear and shows the broad pool needs substantial de-duplication.
- Analysis files and the NetCDF dependency stayed in `/tmp`; no climate data or dependency was added to the project. The candidate remains held rather than implemented.

## 19 November 2026 — Higher or Lower life-expectancy measure

- Completed the backlog's content review for WDI `SP.DYN.LE00.IN`. The 2023 API response covers 194/195 Standard identities and 215/243 Extended identities; only Vatican City lacks a Standard observation. The API was last updated 11 November 2026. The World Bank indicator page lists CC BY 4.0 and attributes data to UN World Population Prospects, national statistical offices and Eurostat.
- Added the exact-year value to the country catalog as `lifeExpectancyYears2023`, with no fallback for absent observations. The data manifest records the raw API hash, license, attribution and ISO3 transformation.
- Added the measure to Higher or Lower Free Play only. Its description calls it a 2023 estimate at birth, not an individual prediction or healthcare-quality score. Close comparisons now use a 1 to under 4 year gap; Standard uses 4+ years. This avoids treating 17,506 of 18,721 Standard-pool pairs as close under the old ratio rule. World-pool availability is 3,962 Close and 13,258 Standard pairs; all continents have at least 20 pairs in each tier.
- Updated the country data builder, artifact validation, game rules, source documentation and existing-game backlog. Daily measure selection and puzzle identities are unchanged. Player testing remains needed before considering Daily use.

## 19 November 2026 — Latitude Ladder city-spacing audit

The audit sampled the existing Free Play eligibility rules: GeoNames cities with population at least 100,000, valid coordinates, and feature codes other than historical, destroyed, abandoned or section records. The resulting pool contains 5,870 cities: Africa 826, Asia 2,962, Europe 798, North America 643, South America 611 and Oceania 30. For each scope and axis, 20,000 five-city samples were drawn uniformly without replacement using Python `random.Random(20261119).sample`. This estimates the current generator's uniform seeded shuffle without reproducing its PRNG stream. The measurement is the smallest of the four adjacent coordinate gaps after sorting the five cities by latitude or longitude. The percentages below are the share of rounds whose closest pair fell below each threshold; they describe generated content, not human answer accuracy.

| Scope | Axis | Closest gap under 0.25° | Under 0.5° | Under 1° |
| --- | --- | ---: | ---: | ---: |
| World | North–south | 7.6% | 14.6% | 27.1% |
| World | West–east | 3.4% | 6.4% | 11.5% |
| Africa | North–south | 12.8% | 22.6% | 37.8% |
| Africa | West–east | 13.4% | 23.1% | 38.8% |
| Asia | North–south | 13.7% | 25.2% | 43.5% |
| Asia | West–east | 7.7% | 14.1% | 25.0% |
| Europe | North–south | 25.4% | 43.8% | 69.2% |
| Europe | West–east | 9.3% | 17.7% | 31.5% |
| North America | North–south | 19.1% | 31.9% | 51.9% |
| North America | West–east | 13.6% | 22.9% | 37.3% |
| Oceania | North–south | 25.9% | 39.3% | 68.5% |
| Oceania | West–east | 28.4% | 44.4% | 60.9% |
| South America | North–south | 18.2% | 29.8% | 46.6% |
| South America | West–east | 15.7% | 27.1% | 45.8% |

Europe and Oceania produce more close pairs on some axes, while world west–east rounds are usually more widely spaced. A universal degree threshold would therefore change meaning by region; longitude degrees also represent shorter ground distances closer to the poles. The current sampler remains unchanged. Moderated play should record order accuracy, confidence and completion by scope/axis before any difficulty labels or spacing constraints are introduced.

## 19 November 2026 — Terrain Profile elevation sources

- Reviewed NOAA ETOPO 2022's current product page, metadata and user guide; its 15-arc-second global surface grid is CC0 and referenced to EGM2008. The guide says final vertical-accuracy assessments were still being compiled in its 2022 revision.
- Reviewed USGS SRTM 1 Arc-Second Global and GeoNames feature definitions. SRTM is public domain and globally distributed with some voids and higher-latitude 2-by-1-arc-second sampling. GeoNames is CC BY 4.0, defines peak/pass feature codes and supplies coordinates plus elevation fields, but disclaims accuracy and does not provide per-record provenance for its named-feature elevation field.
- Licensing is workable for a small attributed offline sample, but a DEM cell at a gazetteer point is not automatically an authoritative summit height. No DEM was downloaded. Terrain Profile remains a candidate pending a bounded cross-check of feature coordinates and elevations against independent authoritative records; details are in [the source review](STUDIES/terrain-profile-source-review.md).
