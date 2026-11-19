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

## 19 November 2026 — Riverways clue signal audit

- Exhaustively compared line-centre distance/direction signatures across the 134 named questions (148 Natural Earth features). With the current 50 km/eight-way clue, one wrong guess uniquely identifies the target in 83.2% of Easy, 82.1% of Medium and 77.5% of Hard pool cases. Adding both miss clues and the target-centre country raises unique signatures to 94.3%, 96.8% and 96.9% respectively.
- In the Hard pool, rounding to 250 km with eight directions drops first-miss uniqueness to 37.6%; 500 km drops it to 20.8%. These are exhaustive, equally weighted clue combinations, not simulated player behavior or difficulty ratings. No clue precision changed.
- Recorded methodology, precision sensitivity and a 6–8 person moderated pilot protocol in the [Riverways feedback audit](STUDIES/riverways-feedback-audit.md). Player understanding, whether the clue makes targets too obvious, fairness and completion remain unmeasured.

## 19 November 2026 — Geography Connections review protocol

- Prepared a blinded qualitative review for all 24 authored boards. Six to eight casual players each play two boards from each overall difficulty pool; the protocol captures solve order and time, mistakes, one-away events, perceived challenge and fairness, alternative groupings, and explanation clarity.
- The board's answer labels and editorial overlap notes remain hidden until the normal reveal. The study treats repeated participant concerns as editorial leads, not population-level evidence. No participant sessions or content changes occurred; see the [review protocol](STUDIES/connections-content-review.md).

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
- The public CCKP S3 archive exposed CRU TS 4.09 monthly temperature and precipitation NetCDFs for 1991–2020 on a 0.5° grid. Its collection page says 4.07 and the indexed World Bank metadata page says 4.08, so version documentation is inconsistent. Each NetCDF's embedded `wb_data_license_comment` says UK Open Government Licence v3, CCKP metadata says CC BY 4.0, and the AWS Registry lists ODbL. Do not bundle or derive gameplay content from these CRU files until the World Bank clarifies which terms/version apply.
- A temporary extraction audit matched the files to 11,577 current whole settlements in Maproom's 12,405-record major-city file: 11,559 had all twelve months; 18 nearest cells were masked. The broad pool had 6,344 valid cells, 2,003 shared by several records, and 6,330 profiles after rounding temperature to 1°C and precipitation to 10 mm. All 179 capital-marked records had data and yielded 178 profiles; Brazzaville and Kinshasa shared one cell/profile. This favors a curated capital-only sample if rights clear and shows the broad pool needs substantial de-duplication.
- Analysis files and the NetCDF dependency stayed in `/tmp`; no climate data or dependency was added to the project. The candidate remains held rather than implemented.

## 19 November 2026 — Climate Twins ERA5 alternative

- Reviewed the official CCKP ERA5 collection documentation, World Bank dataset record and download terms. The record assigns CC BY 4.0; the CCKP terms add mandatory dispute-resolution language and attribution requirements. The 1991–2020 monthly climatology is available at 0.25° in public NetCDF files.
- Downloaded the temperature and precipitation files temporarily and inspected their metadata: 12 months, °C average for `tas`, mm sum for `pr`, 0.25° grid, period 1991–2020, raw source ECMWF/Copernicus and CCKP processing. Recorded file hashes in the [source study](STUDIES/climate-twins-source-review.md); the full rasters remain in `/tmp` and are not part of Maproom.
- Nearest-grid sampling of 179 capital-marked Maproom records found complete values for all, 178 distinct cells and 178 unique profiles after rounding to 1°C/10 mm per month. Brazzaville and Kinshasa remain the only collision; it is stable under tested 0.5°C/5 mm and 2°C/20 mm rounding. Coastal/elevation review is still needed.
- Decision: CCKP ERA5 is a source path for a curated Free Play prototype, provided its attribution and terms are disclosed. CRU TS remains held; Climate Twins remains outside Daily pending player evaluation. No game code or data was added.

## 19 November 2026 — Climate Twins full capital-pool screen

- Corrected the sample frame: `cities-major.json` omits places below 50,000 population, while the full `cities.json` includes 241 GeoNames `PPLC` records across countries and territories. All 241 nearest CCKP ERA5 cells have data; the 1°C/10 mm display profile has 237 unique answers before screening.
- Natural Earth 1:10m point-in-polygon checks identified offshore nearest centers, cross-border centers, and some city coordinates outside the mapped land. Requiring both the city coordinate and nearest grid center to fall inside the same country, and excluding the two Antarctic-classified records, leaves 155 profiles with no rounding collisions.
- Joined all capital IDs to the current GeoNames cities500 dump (2026-11-19; SHA-256 in the study). Its city fields matched the pinned Maproom snapshot. The GeoNames DEM is a coarse area-average signal; excluding values at or above 1,000 m leaves 127 profiles across Africa, Asia, Europe, North America, Oceania and South America. This is a conservative review pool, not a final published answer set.
- Copernicus' ECV product is a direct CC BY 4.0 alternative with the same 1991–2020 climatology period, but access requires CDS login; no CDS API configuration is available here. The CCKP source remains the accessible path if its added terms are accepted. No code/data asset was added.

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
- Sampled four named summits from the public SRTM30m point API using their GeoNames coordinates. Relative to government or national-mapping references, raster samples were 27–143 m lower, while GeoNames' integer elevation fields were close for these four cases. This is a small exploratory check, not a dataset-wide accuracy estimate; SRTM point values should not become summit answer keys.
- Licensing is workable for a small attributed offline sample. The next gate is a larger, curated summit list with authoritative height references per feature and enough well-spaced comparisons for replay. Passes need a separate check. Details are in [the source review](STUDIES/terrain-profile-source-review.md).

## 19 November 2026 — Terrain Profile distinctness decision

- Reviewed GSI's 1,003-mountain source, its current content terms, and selected HTML records. The source provides highest-point names, coordinates and whole-metre elevations; four prominent peaks span 3,180–3,193 m, with adjacent differences of 0, 3 and 10 m. This was not a full audit of the CSV or GeoJSON, so the whole-set height distribution remains unknown. GSI is a viable attributed Japan-only source, but does not provide terrain-profile cross-sections.
- Compared the proposed sort-by-elevation loop with Maproom's Latitude Ladder and Population Pyramid Sort, Geocore's Rank It and elevation-comparison catalog entries, and Worldly Games' six-country Rankings format. A public Worldly GDP puzzle was played and solved in three guesses with 2/6, 4/6 and 6/6 position feedback. Geocore's two elevation games remain catalog-only because the catalog marks them as requiring a free account. The evidence confirms substantial mechanic overlap.
- Decision: defer Terrain Profile in its current form. Summit heights are sourceable, but another ordering game would not add a sufficiently distinct player action. Reopen only if a terrain-reading task and its data source are separately defined. Full source and limitations are in the [Terrain Profile study](STUDIES/terrain-profile-source-review.md).

## 19 November 2026 — Worldly Rankings live practice

- Completed one public six-country GDP practice puzzle. The first order scored 2/6 correct positions, a second tap-to-swap order scored 4/6, and the third solved the puzzle. The result displayed all six GDP figures but did not show their source or year. One puzzle does not measure typical difficulty or fairness.
- Observed tap-to-swap and correct-position history buttons. Official instructions also describe drag and reopening prior guesses; those two interactions were not tested. The browser accessibility tree exposed country rows as generic text, so keyboard and assistive-technology operation remains unverified.
- Added the round to the [Worldly Rankings study](DEEP_DIVES/worldly-rankings.md), competitor inventory and mechanic library. It confirms that a distinct new game should not simply repeat ordering with a different subject.

## 19 November 2026 — Watershed Match source and gameplay review

- Reviewed USGS WBD 2024 and Mainstems v3.1. WBD is a static official snapshot, complete through HUC12 for the United States, with nested codes and downstream-HUC attributes; its hydrologic units may describe only part of a river's total upstream area. Mainstems v3.1 is marked CC0 and provides outlet and mainstem crosswalks, but it uses a January 2025 final-WBD snapshot rather than the separate WBD-2024 snapshot.
- Checked global options. MERIT-FullBasin v1.1 contains 340,955 display outlines at 1 km² or larger, but its global archive is 6.4 GB and its current release terms require CC BY-NC 4.0 or ODbL 1.0, with ODbL required for commercial use. Lake-TopoCat covers lake-linked catchments over about 57% of global land and needs an upstream-source license review. Basin90m and HydroBASINS retain their previously documented dependency or licensing limitations.
- Played one MapGuesser Find the Feature sea round: Golfe du Lion, 0 points, 1,627 km miss, and a target-outline reveal. This is direct evidence for one sea prompt only; the site advertises 188 river features but river play was not tested. Pin placement plus outline/distance feedback is already a physical-feature mechanic, so the Watershed Match draft needs a downstream-relationship action.
- Decision: keep Watershed Match as a candidate and reframe it around identifying a downstream HUC or mainstem. Do not implement until one WBD/Mainstems snapshot pair is aligned and named/outlet quality, local bundle size and keyboard/touch rules are checked. Updated the source study, concept backlog, competitor catalog and mission log. No data, code or tests changed; no deployment occurred.

## 19 November 2026 — Watershed Match WBD-only prototype gate

- Found the USGS Hydrologic Geospatial Fabric's `wbd12_20250107` collection: 103,068 HUC12 features, with geometry, name, `ToHUC`, `HUType` and `HUMod`; the collection page links CC0 1.0 terms. The USGS WBD dictionary defines `ToHUC` as the naturally downstream unit receiving the majority of flow; standard exceptions include ocean, Canada, Mexico and closed basin.
- Sampled three bounding boxes near the Potomac, Columbia and Susquehanna. All 344 captured `ToHUC` targets shared an exact boundary segment with their source. After restricting source and target to unmodified subwatersheds and requiring two other adjacent unmodified subwatersheds with distinct names, 95 candidates remained. A later HUC8 audit found the Potomac-named box spans four drainage basins and corrected its player-facing label; the source study records the split.
- Decision: proceed with a small curated Free Play prototype from this WBD snapshot alone. No Mainstems join is needed for the initial relation puzzle. Keep it outside Daily; remove special outlet codes and review polygon size, answer labels, map readability, keyboard/touch controls and player comprehension. See [the updated source study](STUDIES/watershed-match-source-review.md).

## 19 November 2026 — Watershed Match prototype implementation

- Built a five-question Free Play set from 60 heuristic-screened source transitions and 118 polygons, sampled in Appalachian, Columbia and Susquehanna areas. The first area was initially called Potomac; a later HUC8 audit found that only 19 of its 31 questions are in the South Branch Potomac HUC8. The display and data label now says Appalachians. The asset carries a source checksum and attribution in the data manifest, and is precached for offline play.
- Added keyboard/touch answer buttons, saved selection and round progress, five-round scoring and replay. The reveal highlights `ToHUC` and draws a schematic link arrow, explicitly distinguished from a river trace. Daily remains excluded.
- Typecheck, lint, all 137 unit tests, production artifact validation and the focused desktop/mobile/offline Playwright suite (2/2) passed. Representative production-preview screens are saved under `artifacts/qa/product-quality/`. These checks do not measure the fairness of the full question pool or user learning; keep the three-system scope until editorial and player review.

## 19 November 2026 — Geography Connections content variety audit

- Compared the 96 authored country quartets across all 24 fixed boards, then checked all changed boards against every known named set, catalogue border, region, name pattern and selected data band. Before repair, exact answer quartets repeated across Easy/Medium/Hard, including three ASEAN variants that repeated the same four founders in multiple boards and a same-difficulty Visegrad/Nordic/ASEAN reuse pattern.
- Rotated subsets within the five-member ASEAN, Nordic, EEC and OPEC sets where the rest of the board allowed it; varied the Central America and Brazil-border sets; replaced the duplicate Visegrad group on Atlas 14 and recast Atlas 23. Changed finite membership labels to say “among” and give the full count for ASEAN, Nordic sovereign states and G7. Atlas 14 and Atlas 23 now use different combinations of map knowledge and sourced membership facts.
- The test audit now guarantees no exact answer quartet is repeated within a difficulty pool. Only three exact repeats remain across pools: the four Guinea-name countries (Atlas 01/24), Danube capital cities (Atlas 03/21), and Lake Chad shoreline states (Atlas 08/17). These facts have exactly four eligible members and are documented as exceptions. The automated audit finds no unassigned exact quartet; all broad overlap warnings are listed in the editorial guide.
- Typecheck, lint, all 140 unit tests, the production build (24 route snapshots, 21 sitemap URLs, 205 precached assets), and the sequential production-preview Connections browser suite passed. Playwright passed 7/7, including deterministic Atlas 14/23 board reveals, one-away feedback, keyboard and mobile dark-theme coverage.
- Directly exercised the revised Atlas 14 and Atlas 23 rounds in a production-preview browser and captured `artifacts/qa/product-quality/connections-atlas-14-revealed.png` and `connections-atlas-23-complete.png`. This verifies reveal text and interaction flow, not independent player understanding. Difficulty fairness, convincing decoys and replay interest still need blind player sessions; no deployment occurred.

## 19 November 2026 — Watershed Match map label spacing

- Rendered all 60 source-and-choice maps using the gameplay Albers projection and checked the four marker positions. Three frames had marker centers closer than the 38-unit badge spacing; the new screen-space layout separates them and links displaced badges to polygon centroids. The starting-area label is now a compact `S` badge.
- The final minimum marker gap is 38.25 viewBox units, with a maximum shift of 38 units. Unit coverage checks the full question pool; a production-preview browser regression captures the tightest Little River frame. Visual layout evidence is in `artifacts/qa/product-quality/watershed-match-marker-spacing.png`.
- Typecheck, lint, 141 unit tests, the production build/artifact audit and the three-test Watershed Match Playwright suite passed. This is map annotation evidence only; all 60 distractor pairs, polygon legibility and the majority-flow wording still need editorial/player review. No deployment occurred.

## 19 November 2026 — Watershed Match sample-area label audit

- Compared all 31 questions from the box initially labeled Potomac with the official HUC8 hierarchy. Nineteen are in HUC8 `02070001` (South Branch Potomac), two in `02080202` (Maury/James), six in `05020004` (Cheat/Monongahela), and four in `05050003` (Greenbrier/Kanawha). The [USGS hydrologic-unit descriptions](https://water.usgs.gov/GIS/huc_name.html) identify those distinct basin names and HUC8s. The old label overstated the sample's coverage.
- Renamed that sampling window to “Appalachians” in the game UI, generator and bundled question metadata. The 60 questions, answer IDs, choices, geometry and downstream facts are unchanged. The JSON hash and source manifest were updated; a regression test pins the four HUC8 counts. See the [Watershed Match source review](STUDIES/watershed-match-source-review.md).
- A static check found no repeated source/choice names within a question. The pool has 43 correct destination IDs; 15 appear in multiple questions (maximum three), while 50 deterministic five-round decks contained no duplicate destination. After the generator's stop words, 21 of 120 wrong-choice names share the correct choice's remaining token set. This identifies lexical similarity only; question fairness and player understanding remain unmeasured.
- Typecheck, lint, all 142 unit tests, production build/artifact validation and the focused Watershed Match Playwright suite (3/3) passed. The asset is 383,588 bytes (36,769 bytes at gzip level 9). It remains a limited Free Play sample outside Daily; no deployment occurred.

## 19 November 2026 — Projection Match nonvisual map descriptions

- The map-option buttons exposed only “Option A–D” to assistive technology, while the SVGs were hidden from the accessibility tree. Added concise descriptions of each map's outline and graticule to the button names; after checking, the accessible names also include the projection names. The four descriptions distinguish Equal Earth's curved meridians and straight parallels, Mercator's increasingly spaced latitude lines, evenly spaced equirectangular graticules, and the visible hemisphere in Orthographic.
- Checked the descriptions against [D3's projection reference](https://d3js.org/d3-geo/cylindrical) and USGS's [map-projection manual](https://pubs.usgs.gov/pp/1395/report.pdf) and [cylindrical-projections reference](https://pubs.usgs.gov/pp/1453/report.pdf). Browser role-name assertions confirm that all four choices are exposed before and after selection; this is an accessibility-tree check, not a physical screen-reader session.
- Typecheck, lint, all 143 unit tests, production build/artifact validation and the focused production-preview Projection Match browser test (1/1) passed. The game remains Free Play only; physical-device, screen-reader and player-comprehension review remain open. No deployment occurred.

## 19 November 2026 — Watershed Match first-read pilot and audit sync

- Prepared a 6–8 participant qualitative protocol for two ordinary Free Play sets. It records first-read task interpretation, question-level answer and confidence, map use, reveal interpretation, decoy concerns and replay interest. No participants were recruited and no response data were collected; the protocol does not authorize Daily eligibility.
- Added Watershed Match's source, rules, accessibility limits, data scope, offline behavior and open player-evidence gates to the 16-game engineering audit. Synchronized the current game count and rules, architecture note, gap analysis and artifact counts; the older integration handover remains a historical snapshot of its own branch.
- No game code, data or release state changed. The pilot remains limited to Free Play and has not been deployed.
- Traced the 21 exact post-stop-word distractor ties to ten shared hydronym groups across the Appalachian, Columbia and Susquehanna samples. Added a question-ID inventory for editorial follow-up, with instructions not to expose it or prime participants before play. No question content changed.
- Added the WBD HUC12 and age-profile datasets to the shared data-source guide; it now describes their fixed samples/years, transformations, manifest terms, offline behavior and limits alongside the existing source studies.

## Watershed Match nonvisual map positions — 19 November 2026

- Each answer button now has a nonvisual description of its polygon center relative to the blue starting-area center, using eight screen-relative directions or an overlap description. The map's decorative letter markers remain hidden from the accessibility tree; the letter and area name stay in the button's accessible name.
- Unit checks cover all three candidate positions in all 60 questions, all eight directions and overlapping centers. A focused browser assertion checks the accessible description. This confirms the browser accessibility tree only; screen-reader and physical-device use remain open.
- Typecheck, lint, full unit suite, production build/artifact audit and the focused Watershed Match browser suite passed. No source data or gameplay rules changed; the game remains outside Daily and has not been deployed.

## Capitals & Cities map-placement precision — 19 November 2026

- Reviewing the marker-first flow found that a map click stored an exact point but also copied two-decimal coordinates into the secondary keyboard inputs. Submission preferred those rounded fields, so the scored location and reveal marker could shift from the pin the player placed.
- Map submissions now retain the exact clicked point unless a player edits either coordinate field; explicit coordinate entry still takes precedence. The edit state is saved with Daily progress so a reload does not discard the player's coordinate choice.
- Added a production-preview regression asserting that a map pin's transform is unchanged after submission. The existing end-to-end city flow also passed with coordinates entered after map placement. Typecheck, lint, all 145 unit tests, production build/artifact validation and both focused browser checks passed. No player study or new mode was added; evaluate difficulty and reveal with new players before further mode work. No deployment occurred.

## Capitals & Cities map-placement player pilot — 19 November 2026

- Prepared a first-read protocol for 6–8 casual players using one ordinary ten-question City Location set. It checks task interpretation, map focus, pin placement, score understanding, reveal timing, coordinate-panel discovery and replay interest across desktop and touch input where recruitment permits.
- The moderator does not prime the secondary coordinate panel or change the normal quick-feedback timing. The record sheet omits submitted latitude/longitude and participant identity; the protocol does not authorize a mode or scoring change.
- No participants have been recruited and no responses have been collected. Next evidence is an actual session; the documented blind-coordinate idea remains conditional on players describing a distinct skill.

## Biomes Mosaic source and mechanic gate — 19 November 2026

- Verified RESOLVE Ecoregions 2017 in the Google Earth Engine catalog: 846 terrestrial ecoregions, 14 biomes, eight realms and CC BY 4.0. A public ArcGIS feature layer currently returns 847 distinct-ID polygons: the 14 named biome classes plus one separate `N/A` Rock and Ice feature. The mirror says its data is not versioned.
- The official dataset documentation warns that some polygons exceed one million vertices. Offline geometry therefore needs a pinned download, controlled generalization and bundle-size audit. The layer classifies terrestrial ecoregions and biodiversity assemblages; it should not be described simply as a vegetation or climate map.
- Source readiness improved, but a simple outline-identification or category-grouping loop would overlap existing Maproom games. No data was downloaded; implementation remains deferred until a distinct spatial action and learning goal are defined. See the [source review](STUDIES/biomes-mosaic-source-review.md).

## Plate Boundary Lab source gate — 19 November 2026

- Reviewed Peter Bird's PB2002 paper and the `fraxen/tectonicplates` conversion. PB2002 documents 6,048 points, 229 display segments, 5,819 steps and seven boundary classes; the conversion declares ODC-BY 1.0 and records a 2014 source download. The current public ArcGIS mirror is unversioned and lacks copyright metadata.
- The distinct gameplay hypothesis is inferring a broad boundary behavior from earthquake/volcano patterns before revealing the PB2002 class. USGS ComCat supports fixed date/magnitude/area queries in GeoJSON, but its global event parameters include contributions from many networks. No blanket redistribution claim was established for every contribution.
- Kept the candidate gated on a rights/provenance audit and a compact event-frame fairness review. No source data or game code was downloaded or changed. See the [source review](STUDIES/plate-boundary-lab-source-review.md).

## Plate Boundary Lab event-frame audit — 19 November 2026

- Queried four fixed 2010–2019 M4.5+ rectangles through the official USGS FDSN Event Web Service with `contributor=us`, then summarized event counts and depth bands in memory. The selected windows returned 3,285 events near the Japan trench, 48 near the San Andreas, 192 along the Mid-Atlantic ridge and 38 along the East Pacific Rise.
- Every event in the two transform/spreading examples was shallower than 70 km; the Japan sample also contained 3,247 shallow events out of 3,285. The count imbalance and overlapping shallow-depth pattern do not support a simple, fair boundary-class inference from these frames. These exploratory rectangles are not validated question areas.
- The contributor filter narrows provenance but does not replace a reuse-rights review of event fields and observations. Aggregate counts only were retained; no event data or gameplay code was added. The candidate remains deferred. See the [source review](STUDIES/plate-boundary-lab-source-review.md).

## Time-Zone Relay source and mechanic gate — 19 November 2026

- Verified the official GeoNames dump README: `cities15000.zip` includes place IDs, names, WGS84 points, population and IANA time-zone IDs. GeoNames applies CC BY 4.0, requires attribution, allows commercial use and describes the data as-is. IANA states that tzdb is public domain and its records change as governments alter local-time rules; timezone boundary polygons linked by IANA come from OSM and are ODbL.
- Source readiness is good for a pinned, curated offline city set, but it does not establish a game. Sorting local times would repeat Latitude Ladder/Population Pyramid; a direct clock conversion would be a thin quiz. Deferred implementation until a route/date-line action makes distinct geographic decisions and has deterministic, reviewable answers. See the [source and mechanic review](STUDIES/time-zone-relay-source-review.md).

## 19 November 2026 — Population Pyramid Sort optional cohort tables

- Added an optional native disclosure with the exact 17 cohort values to each anonymous pyramid profile. The table mirrors chart order and values, remains closed by default, and does not show country names or the 65+ indicator before checking. The current keyboard and touch reordering controls remain unchanged.
- Production-preview checks confirm the 17 table rows, hidden pre-check country names, desktop keyboard operation, mobile touch opening, dark-theme rendering and no horizontal page overflow. The table lets players compare precise values, so whether it helps explain the silhouettes or shifts attention to arithmetic still needs a player session.
- Typecheck, lint, production build/artifact validation and the focused browser suite passed (2/2). No data, scoring, Daily eligibility or deployment state changed.
