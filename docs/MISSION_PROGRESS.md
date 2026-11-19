# Maproom expansion mission progress

Updated 19 November 2026. Work was performed in `/home/charlie/maproom-worktrees/product-quality` on `codex/maproom-product-quality-20261119`; authorized checkpoints have been pushed to that branch. No deployment, publishing, infrastructure or production-data action was performed.

## Baseline and preserved workspace

- Original baseline: `/home/charlie/maproom`, branch `codex/maproom-daily-gameplay-corrections`; active mission worktree: `/home/charlie/maproom-worktrees/product-quality`, branch `codex/maproom-product-quality-20261119`.
- The worktree already contained the Free Play setup overlay, route transitions and other UI/game changes. They were inspected and preserved; no reset or cleanup discarded them.
- At baseline, `npm run typecheck`, `npm run lint`, `npm test` (62 tests across 9 files) and `npm run build` passed.
- The baseline full Playwright run passed 40 of 41 tests. The remaining keyboard regression reproduced inconsistently after autocomplete accepted a suggestion in Country Outlines: the next Enter sometimes did not submit. The shared autocomplete now tracks that accepted label and submits on the following Enter. The focused regression plus adjacent outline test passed 2/2.

## Completed in this mission

- Audited the ten original games and recorded gameplay, rules, balance, feedback, replay, visual/mobile/accessibility, performance and geographic-data findings in [GAME_AUDIT.md](GAME_AUDIT.md).
- Reviewed GeoGuessr, Seterra, Worldle, Travle, Globle, TimeGuessr and City Guesser, along with current React, Vite, MDN, WCAG and Playwright primary documentation. Observations and project-specific recommendations are separated in [GAME_RESEARCH.md](GAME_RESEARCH.md).
- Evaluated 30 game concepts across originality, replayability, implementation effort, data readiness, presentation/mobile fit and overlap in [GAME_CONCEPTS.md](GAME_CONCEPTS.md).
- Added an exhaustive lazy game-component registry separate from the metadata catalog, aligned the stable ID union with the 12 game entries, and preserved the six-game daily allowlist. The catalog test verifies matching IDs, unique routes and unchanged daily membership.
- Added two Free Play games: Riverways (guess a highlighted Natural Earth river line) and Latitude Ladder (order five GeoNames cities north–south or west–east). Both use shared settings, session persistence, scoring/results and replay paths.
- Added a pinned Natural Earth 1:50m river source and 148 named generalized centerlines; the optional file is validated and fetched only when Riverways opens. Source and generated-asset hashes are recorded in the data manifest.
- Added pure puzzle tests, river data integrity checks, and architecture/rules/source docs. River questions group by normalized English names and remove ambiguous aliases.
- Fixed the new-game Explore card spans at desktop and tablet sizes. Browser coverage checks each new card's width and derives library totals from the shared catalog.
- Extended browser coverage for keyboard reorder, saved Latitude Ladder order, Riverways guess restoration, dark mode, touch and replay.

## Validation complete

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 70 tests across 11 files.
- `npm run build` passed, including strict TypeScript compilation and the offline manifest build.
- The complete production-preview Playwright suite passed: 44/44 tests. This includes setup, original game regressions, offline navigation, both new games and mobile/touch flows.
- Focused post-build checks passed for all 8 setup/new-game/product-overhaul browser tests, including desktop/mobile Explore card widths and light/dark captures.
- `git diff --check` passed. The branch remains uncommitted and local.

## Accessibility follow-up — 18 November 2026

- Interactive country maps now use a single Tab stop. Arrow keys move to the nearest region in the requested screen direction; Enter/Space select, Home/End move to the first/last region, and the map describes these keys to assistive technology. When a map is zoomed to a target or route, initial focus starts on that visible focus country instead of an offscreen feature. Country search remains available as a text alternative.
- Shared answer autocomplete now exposes an editable combobox and listbox. DOM focus stays in the input, `aria-activedescendant` follows arrow-key navigation, suggestion rows are skipped by Tab, Enter preserves the existing accept-then-submit flow, and Escape closes the list.
- Added browser coverage for map tab order, visible initial focus, spatial navigation and selection, plus combobox focus, active-option announcements, Escape, Tab, and the existing outline Enter sequence. Updated a Free Play settings test to wait for the launch focus transfer before sending keyboard input.
- Latest validation passed: typecheck, lint, all 70 unit tests, production build, and the complete production-preview Playwright suite (46/46). The browser suite was rerun after fixing synchronization gaps in the new keyboard tests and the existing settings test.
- This remains browser keyboard/semantics validation. Manual screen-reader and voice-control review is still outstanding.

## Grid and Connections first-read follow-up — 18 November 2026

- Browser review confirmed that the Grid setup offered 240 generated boards under the same “Regions & geographic facts” label. The board selector was removed; Free Play now exposes the meaningful Standard/Extended country-pool choice, and Replay continues to advance to a fresh board.
- Free Play setup now displays each game's short rule summary. Grid explains the nine distinct-country row/column intersections, while Connections explains selecting groups of four and the four-mistake limit. Grid repeats its rule above the board.
- A live Easy Connections round was completed in the browser with zero mistakes. Each solved group displayed its label and explanation, the result showed 4/4 and 1,000 points, and Replay opened a different set of sixteen countries. This was a self-play check, not independent player research.
- Added a Playwright check for both setup summaries, the remaining Grid setting, and each game's first gameplay state. Updated the rules and game-audit docs to match the UI.
- Validation passed: typecheck, lint, all 70 unit tests, production build, focused setup suite (5/5), and the complete production-preview Playwright suite (47/47). Browser screenshots and DOM review confirmed both setup panels fit the inspected 600 × 660 viewport.
- The browser review was a heuristic inspection, not a moderated player study. Observe players to see whether the new copy reduces first-read confusion; manual screen-reader and voice-control review is also outstanding.

## Grid and Connections progress announcements — 18 November 2026

- The visible “x of 9” Grid counter and “x of 4 selected” Connections counter were not live regions. Both now expose polite, atomic status updates so keyboard and screen-reader players can follow progress without moving focus.
- Extended browser coverage to verify every Grid fill count and a Connections tile selection through the status role. An initial test queried the status content as its accessible name; the captured AX tree showed the live text was present, so the assertion now checks status text directly.
- Latest validation passed: typecheck, lint, all 70 unit tests, production build, and the two focused production-preview browser checks. The full 47-test browser suite passed immediately before this small status-announcement change; it has not been rerun afterward.

## Grid table semantics — 18 November 2026

- The Geography Grid was marked up as an interactive ARIA grid but did not implement arrow-key cell navigation. Its cells are independent buttons in a clue table, so the structure now uses table, header-row, row-header, and cell semantics; the visual layout is unchanged.
- Checked the W3C APG patterns: [table](https://www.w3.org/WAI/ARIA/apg/patterns/table/) is the static tabular pattern whose contained controls stay in the page tab order, while [grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) provides directional cell navigation. With only nine independent answer buttons, the table pattern fits the interaction and avoids claiming unsupported shortcuts.
- Browser coverage verifies the table name and its four rows, four column headers, three row headers, and nine cells. A live browser review confirmed the table structure and retained responsive layout.
- The focused game check also activates a Grid cell with Enter and selects a Connections tile with Space, then verifies both controls update their announced state.
- Production-preview screenshots at 320px and 390px confirmed that the 3×3 table stays within the viewport; the selected-square panel repeats its row and column clues at larger type. The labels are compact at 320px but remain visible, so no layout change was justified.
- Latest validation passed: typecheck, lint, all 70 unit tests, production build, and the two focused production-preview checks for Grid and Connections setup/progress plus full Grid gameplay. The earlier full suite passed 47/47 before these small status/semantics follow-ups; it has not been rerun afterward.

## Performance reconnaissance — 18 November 2026

- The production build reports 88.5 kB gzip for the entry JavaScript and 121.4 kB gzip for the shared stylesheet; the home page also requests the 9.7 kB gzip `d3-geo` chunk and a 27.9 kB gzip shared session chunk. The rendered home asset inventory showed 4 scripts, 1 stylesheet, 8 font files, 4 images and 53 inline SVGs.
- The in-app browser integration itself does not expose network timing or `window.performance`, but the Playwright Chromium harness does. Local fresh-context measurements are available now; they are unthrottled headless Vite-preview evidence, not hosted production or field-user core-web-vitals data.
- At the initial bundle inspection, no optimization was justified from sizes alone. A later comparison found that `Shell` eagerly imported the game page, which caused the home route to preload `sessionCompatibility` (82.7 kB raw / 28.0 kB gzip) and `d3-geo` (25.7 kB / 9.7 kB gzip). Initial JavaScript measured about 126.7 kB gzip including the entry and runtime. These are build figures, not browser timing results.
- `GamePage` is now lazy-loaded when a game is selected. The production output no longer module-preloads the game-page or `d3-geo` chunks from the home route; measured initial JavaScript is about 112.2 kB gzip, a 14.5 kB / 11.4% reduction. The shared CSS remains about 121.4 kB gzip. Keep hosted cold-load and network measurement as the next performance evidence gap.

## Riverways play and static-map accessibility follow-up — 18 November 2026

- Production-preview self-play completed a medium Riverways round in one guess for 1,000 points, then opened a fresh second round with Replay. A separate Latitude Ladder round used the move buttons to order five cities north-to-south and earned 5/5 for 1,000 points. Both are agent self-play checks, not independent player research.
- The browser accessibility tree exposed 259 static country paths as generic “Unlabelled map region” images in Riverways, adding no useful control or answer information. `GeoMap` now hides static paths from the accessibility tree when feature names are intentionally suppressed; the map keeps its named summary, and interactive country paths keep their button names and keyboard behavior. A follow-up browser check confirmed the updated map summary and controls remain exposed without those country-path nodes.
- Added a browser assertion that the Riverways map summary remains available and generic path images are absent. Validation passed: typecheck, lint, all 70 unit tests, production build and the complete production-preview Playwright suite (47/47).
- This uses browser accessibility-tree inspection, not a screen-reader session. Manual screen-reader and voice-control review remains outstanding.

## City settlement data cleanup — 18 November 2026

- A manual Latitude Ladder round surfaced “Skhidni Kvartaly” as a card. Its bundled GeoNames record has feature code `PPLX`, population 102,500 and coordinates in Ukraine; GeoNames defines `PPLX` as a section of a populated place, not a whole settlement. The same official feature-code catalogue identifies `PPLH`, `PPLQ` and `PPLW` as historical, abandoned and destroyed places. Across those four codes, the bundle contains 828 records meeting the 50,000 threshold and 420 meeting Latitude Ladder's 100,000 threshold. ([GeoNames feature codes](https://www.geonames.org/export/codes.html))
- A shared eligibility helper now omits these records from Latitude Ladder, Capitals & cities Free Play question and identification-choice pools, and Distance & Direction Free Play comparisons. Daily Capitals & cities retains its prior question and suggestion pool; the bundled GeoNames data stays intact. A unit test covers included whole-settlement records and each excluded feature code.
- Updated the game audit, rules, data-source and concept notes. Validation passed typecheck, lint, all 72 unit tests, and production build. The full Playwright suite passed 48/48 before the final Distance mode guard; after that guard, the production build and four focused browser checks passed (Latitude Ladder, Daily restoration, Distance & Direction, and Capitals & cities).

## Existing-game live review — 18 November 2026

- A production-preview 10-question Higher or Lower population round completed at 10/10 for 1,350 points. Each answer showed both 2023 values and higher/lower labels, while the live streak and question count advanced. Result copy names the data year and offers another round.
- A source scan confirmed that game feedback and errors use status/alert regions across the game modules. This is a code and browser-tree check only; it does not demonstrate speech output or voice-control behavior.
- No gameplay change was justified by this self-play check. Independent player feedback and manual assistive-technology review remain the next high-value evidence gaps.

## Reduced-motion browser coverage — 18 November 2026

- Added a reduced-motion Playwright test that emulates the user preference, checks sub-millisecond setup and answer animations, and verifies setup-close and game-entry focus transfer plus answer status feedback.
- The first setup-suite run exposed a timing gap in an existing Grid keyboard test: it sent Enter before the launch animation-frame focus transfer, so focus returned to the game container. The test now waits for that documented focus target before moving to its cell. The setup suite then passed 6/6.
- This verifies browser preference handling and focus semantics; it still does not replace screen-reader speech or voice-control testing. The full production-preview suite later passed 48/48 in the city settlement cleanup milestone below.

## Keyboard focus across game transitions — 18 November 2026

- Closing Free Play setup from Explore returns focus to the card that opened it; setup opened from a direct URL returns focus to the main content. Browser coverage checks close-button, Escape and backdrop dismissal.
- Higher or Lower answer cards now use `aria-disabled` during the timed reveal, so keyboard focus remains on the chosen side and carries to that side of the next comparison. Flag Study uses the same pattern for multiple-choice answers, with stable answer-slot keys across questions. Typed Flag Study answers keep the focused input read-only during feedback; submitting from the Answer button returns focus to the input before it locks.
- Distance & Direction moves focus from the selected city to “Next comparison”, then to the first city choice after that button advances the round.
- Added Playwright assertions for each focus transition. The city-identification browser fixture now chooses a whole-settlement answer with a unique name within its country, matching the current `PPLH`/`PPLQ`/`PPLW`/`PPLX` exclusion and avoiding ambiguous duplicate names such as Abilene, Kansas and Abilene, Texas.
- Manual browser keyboard review confirmed visible focus in Flag Study’s image choices and typed input and both Distance & Direction transitions. This remains browser-level validation, not manual screen-reader or voice-control testing.
- Validation passed: typecheck, lint, all 72 unit tests, production build, five focused browser regressions and the complete production-preview Playwright suite (48/48). `git diff --check` passed.

## Capitals & Cities answer focus — 18 November 2026

- Live browser review found that submitting a city answer left keyboard focus on the now-disabled input while the “Next place” action appeared. Capitals & Cities now moves focus to that action after an answer and to the new question heading after advancing; this applies across its answer formats.
- Extended the Capitals & Cities browser test to check the “Next place” and question-heading transitions. Manual browser keyboard review confirmed both transitions during city identification.
- Stabilized the Connections setup keyboard test after full-suite runs exposed a race: starting Free Play schedules focus to the game playfield on the next animation frame. The test now waits for that intended launch focus before moving to a tile and pressing Space.
- Validation passed: typecheck, lint, all 72 unit tests, production build, the Capitals & Cities browser test, five repeated Connections setup checks, the complete production-preview Playwright suite (48/48), and `git diff --check`.
- This is browser keyboard and accessibility-tree validation, not a manual screen-reader or voice-control review.

## City identification suggestions — 18 November 2026

- A source/data review found 1,172 repeated city-name groups within countries in the current whole-settlement pool. The identification autocomplete showed duplicate labels with the same country detail, even though the answer is accepted by normalized city name.
- City identification suggestions now show one entry per normalized name and country, using the highest-population record as the representative. Same-named cities in different countries remain separate. A unit test covers duplicate names, accent/punctuation normalization, and country scoping.
- Stabilized Free Play browser setup by waiting for focus to settle within the game playfield before keyboard tests move focus to specific controls. This covers the game container and game-specific targets within it.
- Validation passed: typecheck, lint, all 73 unit tests, production build, focused keyboard regressions, the complete production-preview Playwright suite (48/48), and `git diff --check`.

## Coordinate hemisphere cues — 18 November 2026

- A live Distance & Direction round exposed coordinates as signed decimals without N/S/E/W, which makes the negative values less readable. The origin and revealed city cards now include explicit hemispheres.
- Extracted a shared coordinate formatter and used it in Distance & Direction and Latitude Ladder, preserving their two-decimal and one-decimal precision respectively. Tests cover north/south, east/west, zero, and precision.
- The production-preview round showed `24.00° N, 90.42° E`, `25.48° S, 30.97° E`, and `20.72° N, 103.39° W` in the result cards. This keeps the sign convention visible without requiring players to infer it.
- Validation passed: typecheck, lint, all 75 unit tests, production build, the complete production-preview Playwright suite (48/48), and `git diff --check`.

## Neighbour Challenge answer focus — 18 November 2026

- Live play showed that checking a neighbor set removed the focused “Check neighbors” control and left focus on the page. The next-country action now receives focus after feedback appears; advancing moves focus to the next prompt heading.
- Extended the complete-neighbor-set browser regression to assert both focus transitions while solving all five targets.
- A production-preview keyboard round confirmed that Enter on “Check neighbors” moves focus to “Next country”, and Enter on that action moves it to the next prompt heading.
- Validation passed: typecheck, lint, all 75 unit tests, production build, the five-round Neighbour Challenge browser regression, and `git diff --check`.

## Lazy game route and setup transition — 18 November 2026

- Moved the game route page behind a React lazy boundary in `Shell`; Vite no longer module-preloads `d3-geo` or game-page dependencies on the Explore/daily shell. The production bundle reduced initial JavaScript by about 14.5 kB gzip (11.4%) while keeping all game modules individually lazy.
- Setup navigation used a fixed 260 ms timer that could run before the browser dispatched the 250 ms panel animation-end event on a later frame. The URL handoff now follows the actual entrance `animationend`, with a fallback timer for missing events and a short reduced-motion fallback. Browser coverage records the URL at animation end and confirms it is still Explore before the background route transition.
- A full-suite run surfaced one intermittent launch-focus miss after the game page split. Playfield focus now runs from a post-commit layout effect after the selected route is revealed; the Distance & Direction focus regression then passed three consecutive repetitions.
- Production-preview review confirmed Explore opens the setup dialog, the URL transitions to the selected game after the entrance, and Start opens the game. The six-test setup suite passed, covering all Free Play launches, daily bypass, direct links, history, reduced motion and mobile dark mode.
- Final validation passed: typecheck, lint, all 75 unit tests, production build, the complete Playwright suite (48/48), and `git diff --check`.

## Country Identification answer focus — 18 November 2026

- Keyboard review found that answering on the map or search left focus behind while the “Next place” action appeared. Focus now moves to that action after feedback, and pressing it moves focus to the next question heading. Infinite practice uses the same transition when a deck cycles.
- Extended the ten-question Free Play browser flow to assert the first answer and advance transitions. The production-preview Chromium regression passed, and manual keyboard play confirmed focus on “Next place” followed by a visible focus outline on the new prompt heading.
- Added a 375 × 667 browser check that confirms both focus targets remain inside the viewport; it passed without additional scrolling changes.
- Validation passed: typecheck, lint, all 75 unit tests, production build, both focused Country Identification regressions, the complete production-preview Playwright suite (49/49), and `git diff --check`.
- This validates browser keyboard focus only; manual screen-reader and voice-control review remains outstanding.

## Route-specific geography loading — 18 November 2026

- Resource profiling found that every game route fetched `/data/countries.geojson` (2,325,947 transferred bytes locally) and the `d3-geo` chunk, including Flags, Geography Grid, Connections, Higher or Lower, and Distance & Direction, whose components only use country facts. Distance & Direction also loads its city gazetteer, which its comparison pool requires.
- Added an explicit `requiresCountryGeometry` field to every catalog entry. `loadGeography(false)` now loads the shared country catalog without boundaries; map games retain the full data. TopoJSON conversion and region winding normalization are dynamically imported only for subdivision requests, which removes the region-only processing code from mapless game routes.
- Added unit coverage for catalog-only loading and later geometry loading, and a browser test proving that the five fact-based games do not request boundaries while Find the country still does.
- A three-run, fresh-context local Chromium profile measured these transfers: Flags 416,217 bytes, Grid 414,911, Higher or Lower 412,525, and Distance & Direction 2,418,266; each reported zero country-geometry and zero `d3-geo` bytes. Find the country still loaded 2,325,947 geometry bytes and 9,919 `d3-geo` bytes. Earlier local samples for the four mapless routes included those same two resources; their absence saves about 2.34 MB per route before any hosted compression. Route totals vary with selected media and are not production transfer guarantees.
- Home/Explore remained free of map geometry. Median local headless FCP/LCP was 112/168 ms on Home and 152/152 ms on Explore; these synthetic timings are recorded for comparison, not as user-experience benchmarks.
- In a separate cache-disabled, synthetic 1.6 Mbps / 150 ms run, the setup “Start free play” action became available after 2,907 ms on Flags and 14,716 ms on Find the country. This is a cross-game comparison, not a controlled before/after test, but it shows how the required map dataset affects setup readiness under constrained transfer.
- Validation passed: typecheck, lint, all 78 unit tests, production build, focused loader/catalogue tests, focused route-resource Playwright check, and the complete production-preview Playwright suite (50/50).
- The route-specific loading finding has now been validated by the complete suite, not only the focused resource check.

## Compact city comparison data — 18 November 2026

- Distance & Direction has a minimum population setting of 50,000 and Latitude Ladder requires 100,000. Their shared 34,456-place file included seats below those floors that these games never select.
- Added an order-preserving derived file of 12,405 places at or above 50,000 for those two games. It reduces the JSON from 8,536,689 to 3,217,076 raw bytes. The full city file remains unchanged for Capitals & Cities and the existing Daily generation path.
- Updated the reproducible geography builder, checksums, coverage count, deployment artifact checks and city loader. Unit and browser coverage now checks exact subset equivalence, cached loading, and which file each city game requests.
- A production-preview Playwright check confirmed Distance & Direction and Latitude Ladder request `cities-major.json`, while Capitals & Cities continues to request `cities.json`. The compact file is 3,217,076 raw bytes; Node zlib gzip-size estimates are 811,564 bytes for the compact file and 2,003,590 for the full file, saving 1,192,026 compressed bytes per comparison-game fetch. This compression estimate is not a hosted-server measurement.

- Validation passed: typecheck, lint, all 81 unit tests, production build, focused city-file browser check, complete production-preview Playwright suite (51/51), and `git diff --check`.


## Shared-border map geometry — 18 November 2026

- Measured TopoJSON conversion of both gameplay boundary layers. The 259-feature 1:50m world layer shrinks from 2,325,647 to 949,903 raw bytes; the 269-feature 1:10m outline layer shrinks from 12,455,019 to 4,549,345. Node zlib gzip-size estimates fall from 838,805 to 338,264 bytes and from 4,400,991 to 1,497,112 bytes respectively. These are local file compression estimates, not hosted response measurements.
- With 1e6 coordinate quantization, conversion retained every feature type and all 99,884 world-layer and 548,055 outline-layer coordinate vertices. Maximum observed rounding was 0.00018° longitude and 0.000087° latitude.
- Replaced the runtime GeoJSON assets with quantized TopoJSON, decoded through the existing `topojson-client` dependency only when map geometry is needed. Updated data builders, illustration generation, outline-catalogue tooling, deployment artifact checks and browser fixtures; the country metadata catalog and game identities are unchanged.
- In three fresh Chromium contexts with service workers blocked and synthetic 1.6 Mbps / 150 ms conditions, the Find the country setup action became available at 4,904, 4,887 and 4,873 ms (median 4,887 ms); median FCP was 1,568 ms. The TopoJSON body was 949,903 bytes and browser `transferSize` was 338,564 bytes per run. The earlier GeoJSON readiness result was one 14,716 ms sample under the same nominal throttle, so this is indicative local evidence, not hosted or field performance.
- Validation passed: TopoJSON integrity and existing geography/unit suites (81/81), typecheck, lint, production build, focused browser checks for map, outlines, Cyprus and Riverways (5/5), and the complete production-preview Playwright suite (51/51). `git diff --check` passed.

## Offline lazy-data recovery — 18 November 2026

- The existing service-worker browser check only reopened Explore after going offline. It did not demonstrate that the app could reopen a game whose map or game-specific dataset had been fetched lazily.
- Extended the production-preview check to open Find the country, Country outlines, Distance & Direction and Riverways while online, confirm their world TopoJSON, detailed outline TopoJSON, compact city and river data were cached, then reload all four game routes offline and verify their map or comparison controls render. Explore remains covered after those routes.
- The focused production-preview service-worker check passed (1/1), followed by the complete production-preview Playwright suite (51/51). This validates Chromium's service-worker cache behavior for these datasets; it does not cover every country-specific subdivision package or physical-device storage limits.

## Rendered text contrast — 18 November 2026

- A Chromium contrast scan found small muted labels and accent-colored text below the WCAG 2.2 AA text thresholds. The light and dark themes now use dedicated accent text colors and stronger muted text, while retaining the existing orange accent for decorative fills. Border Route's start index and labels on its dark route tray also received theme-specific colors.
- Added a production-preview Playwright regression that checks rendered text and empty input placeholders on Home, Explore, Settings, Data, and the setup and active views of all 12 Free Play games in both themes. It composites solid ancestor backgrounds and excludes hidden content, disabled controls, and text over image backgrounds; the brand dot is excluded as logotype text. The scan found no remaining failures outside that logotype.
- Visually reviewed production-preview screenshots of Explore, Geography Grid, Distance & Direction, and Border Route in both themes. Validation passed: typecheck, lint, all 81 unit tests, production build, the contrast regression (1/1), the complete production-preview Playwright suite (52/52), and `git diff --check`.
- This is a browser-based text contrast check, not a complete WCAG audit. Sampled form-control and map-focus contrast is recorded below; broader graphics, screen readers, voice control, and physical-device behavior still need separate review. WCAG 2.2 SC 1.4.3 specifies [4.5:1 for normal text and 3:1 for large text](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Interactive names and Data loading announcements — 18 November 2026

- A Chromium accessibility-tree review covered Home, Explore, Settings, Data, and active Free Play views for all 12 games. It found repeated favorite-button names on game-format cards and repeated source/license links on Data. It found no unnamed interactive controls. Shared header/footer Explore links were excluded from duplicate-name reporting because they intentionally lead to the same route.
- Favorite controls now identify their game and, where needed, the format or Home section. Data source/license links name the relevant provider. Data’s manifest and country-coverage loading messages now use status semantics, and its load failure uses alert semantics.
- Browser regressions check unique names across Home and Explore favorites and Data source links, including after a favorite-state change. A delayed network-failure case checks that Data’s loading status is exposed before its alert.
- Validation passed: TypeScript production build, lint, all 81 unit tests, the three affected-flow production-preview browser tests (3/3), and `git diff --check`. The latest full production-preview suite before these follow-up edits passed 52/52.
- This is browser accessibility-tree and automated interaction coverage. Targeted Orca speech-output checks are recorded below; system voice-control use remains untested.

## Form and map-focus non-text contrast — 18 November 2026

- A computed-style scan found that visible search, answer and coordinate fields, native selects and custom switches relied on low-contrast surface-divider colors for their boundaries in both themes. Added dedicated light/dark control-edge colors; switch tracks and thumbs now remain distinguishable in both checked states.
- Keyboard focus on an interactive map country previously reused the mid-orange accent fill, which did not separate clearly enough from light map land. The focus state now uses the theme's stronger accent text color. A browser check compares the focused country fill with a normal neighboring land fill at the settled color, and verifies a minimum 3:1 ratio.
- Added a production-preview regression for Explore, Settings, Data, Find the country setup/answer controls and its game-settings switch. It checks both themes, both states of the switches, and the map's keyboard-focus fill. The test passed three repeated runs. Visually reviewed production screenshots of Settings and keyboard-focused Find the country in light and dark themes.
- Validation passed: TypeScript production build, lint, all 81 unit tests, the repeated non-text contrast check (3/3), the complete production-preview Playwright suite (54/54), and `git diff --check`.
- This checks sampled form boundaries, switch indicators and one interactive map-focus treatment; it is not a complete audit of every graphical object or interface state. WCAG 2.2 SC 1.4.11 requires at least 3:1 for visual information needed to identify applicable controls and meaningful graphics against adjacent colors, with stated exceptions ([W3C understanding](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).

## Orca speech output and Data loading recovery — 18 November 2026

- Ran Orca 46.1 against visible Chrome and Firefox 160 production-preview sessions. Keyboard Tab navigation produced speech for the format-specific favorite (“Add Flag study (Identify the country) to favorites toggle button not pressed”) and the first source link (“License and source details for Natural Earth 1:50m Admin 0 Countries link”).
- Firefox did not announce the Data page’s loading messages when they were already populated during initial render. The page now keeps empty polite status regions in the DOM and fills them only if data is still loading after one second. On a controlled five-second manifest delay, Orca/Firefox spoke “Reading source manifest…” and “Loading country coverage…” before the request failed.
- A failed packaged-data load now explains that sources and coverage are unavailable, keeps the coverage section visible, and replaces its spinner with a coverage error. Orca/Firefox spoke the alert and the changed coverage status. A delayed-failure Playwright regression checks the loading and final error states.
- In Geography Connections Free Play, keyboard Tab/Enter selected two tiles after launching the setup. Orca/Chrome spoke each tile's toggle state and the live “1 of 4 countries selected” and “2 of 4 countries selected” updates; the browser state matched both counts.
- Validation passed: TypeScript production build, lint, all 81 unit tests, the two focused Data-page production-preview checks (2/2, including the normal coverage view), and `git diff --check`. The full production-preview suite last passed 54/54 before this Data-page follow-up and has not been rerun since it.
- This is generated speech/dispatch evidence from one desktop screen reader and two browsers, not a human listening assessment or a complete screen-reader review. Voice control, braille output, other assistive technologies and physical-device behavior remain untested.

## Geography Grid errors, progress and results — 18 November 2026

- An invalid answer was exposed twice as an alert: once beside its table cell and again in the selected-square panel. The cell copy remains visible for orientation, while the selected-square panel is now the only live alert.
- The progress counter now exposes one polite, atomic status with the full “n of 9 squares filled” phrase. The visual number and “of 9” fragment are hidden from assistive technology so the status is not reduced to a bare digit or repeated. The uppercase styling is scoped to the visible fragment; the full text remains normal case.
- A browser regression checks one alert for an invalid answer, unchanged progress, and a complete nine-answer round using distinct countries from real intersections. It also checks each progress update and the results state.
- In the visible browser, a valid first answer produced the full status text and a following invalid answer produced one alert while progress stayed at 1 of 9. A manually completed round opened “Every crossing has a place.” with focus on “Play again”; Tab wrapped through the dialog, Escape returned focus to “View results,” and reopening returned focus to “Play again.” The results screen was also visually reviewed.
- Validation passed after the final CSS selector refinement: lint, production build (including TypeScript), all 81 unit tests, the focused Geography Grid Playwright test (1/1), and the existing focused Flag Free Play results-dialog regression (1/1). That Flag test covers Tab wrapping, Escape, focus restoration, reopening and replay. The last full production-preview suite passed 54/54 before the Data and Grid accessibility follow-ups and has not been rerun since.
- A preceding visible-Chrome Orca run spoke “1 OF 9 SQUARES FILLED” once. After the case-styling refinement, the in-app browser accessibility tree shows “1 of 9 squares filled” and computed `text-transform: none`; the current Orca debug session did not capture speech from that in-app tab, so the final spoken casing remains unconfirmed. These are generated speech/dispatch checks, not human listening assessment.

## Map keyboard focus spot-check — 18 November 2026

- In Find the country Free Play, keyboard Tab moved from Game settings into one roving map stop. Right moved focus from Zimbabwe to Mozambique, matching the map's spoken-keyboard instructions. The browser exposed 191 named country controls, plus the labeled search input and map controls.
- The focused Mozambique path remained the sole country path with `tabindex="0"`; its fill and contrasting stroke were visible in the reviewed screenshot. No answer was submitted, so this spot-check did not change game progress.
- This is browser accessibility-tree and keyboard evidence. The in-app browser did not produce Orca speech-output entries for this session, and voice control, human listening, physical devices and other assistive technologies remain untested.

## Quiet timed countdowns — 18 November 2026

- Distance & Direction and Neighbour Challenge previously placed their one-second countdown inside an `aria-live="polite"` container. The countdown now has a named `timer` role outside live regions; score and streak remain polite updates, and Neighbour Challenge keeps its untimed selection count as a separate status. WAI-ARIA 1.2 gives `timer` an implicit `aria-live="off"` value ([specification](https://www.w3.org/TR/wai-aria-1.2/#timer)).
- The focused browser regression enables the timed mode in each game, checks the visible countdown and accessible name, and verifies that no polite live region contains it. It also checks that two separate polite score/status regions remain.
- Validation passed: lint, production build (including TypeScript), all 81 unit tests, the two existing Neighbor and Distance gameplay regressions (2/2), and the focused timed-countdown regression (1/1). The visible production-preview browser showed the timer in Distance; the browser accessibility tree exposed “Time remaining” with no live-region ancestor in both games.
- This confirms the markup and browser accessibility tree, not Orca speech output or human listening. The full production-preview suite has not been rerun since the Data, Grid and timed-countdown follow-ups.

## Remaining opportunities

- No new game was added to Daily; first gather play evidence for difficulty and replay quality.
- Riverways is limited by Natural Earth's generalized named centerlines; it is not a complete watercourse or navigation product.
- Latitude Ladder inherits GeoNames cities500 coverage and the 100,000-population question threshold.
- Broader assistive-technology validation remains: final Orca speech confirmation for the Grid counter after its casing fix, screen-reader review across the remaining map-heavy games, voice control, braille, human listening, physical-device performance and wider non-text contrast.

## Finalization and handover — 18 November 2026

- Closed the continuous-development loop without starting another game, feature or research project. Reviewed the current catalog/component registration, all twelve game flows and rules, Daily allowlist and puzzle versions, session persistence/migrations, lazy geography loading, data builders and manifests, service-worker caching, route transitions, mobile layouts, theme behavior and the existing audit/research/concept documentation.
- Expanded [GAME_AUDIT.md](GAME_AUDIT.md) to assess all twelve games, including Riverways and Latitude Ladder. Updated research/backlog status to distinguish completed games from proposals. Corrected `docs/OPERATIONS.md` to describe the actual IndexedDB v2 stores and session mirror. Added a concise [final handover](FINAL_HANDOVER.md) and refreshed README/deployment notes with the current local-candidate and last-known-host boundaries.
- The review found two closeout defects and fixed both: the dark-theme Geography Grid “Add place” label fell to 3.99:1 on the hover surface, so the muted label now uses a contrast-safe color; the deployment artifact gate omitted `data/rivers.json`, so Riverways' required data is now checked before release preparation. The corrected full-route contrast test and artifact verification passed.
- Final checks passed on the final source: `npx tsc --project tsconfig.app.json --pretty false`; `npm run typecheck`; `npm run lint`; `npm test` (15 files, 81/81 tests); and `npm run e2e` (fresh production build plus the complete Playwright suite, 55/55, including setup and gameplay flows for all twelve games, Daily restoration, persistence, mobile, light/dark themes, and offline reopening).
- The fresh production build compiled 2,181 modules and generated an offline manifest with 188 assets, build ID `8c6d30cd0ebace64`. A separate read-only artifact check passed for the application shell, compiled JS/CSS, all 15 required static files, every precached asset, eight dataset/catalog checksums and all 198 first-level-boundary package checksums. `bash -n scripts/finalize-deployment.sh`, `git diff --check`, and a trailing-whitespace check over untracked files passed.
- The first closeout browser run exposed the Grid contrast regression (54/55); the fix was followed by a passing focused contrast check and a complete final 55/55 rerun. No failures were skipped or weakened.
- Git remains on `codex/maproom-daily-gameplay-corrections` at `cc5d1fc`. No commit was created. The current state has 54 changed tracked files and 35 untracked files. The baseline record confirms that setup-overlay and route-transition WIP predated this mission; many current files mix that WIP with later mission work, and no baseline patch was captured. Changes therefore remain together rather than risk discarding or misattributing them. Generated data and illustrations are intentional.
- No deployment, push, publication, `sudo` command, production change or host readiness check was performed. Local build and deployment artifacts are valid; Caddy, host permissions, origin and public endpoints remain unverified in this finalization. The last documented read-only host observation is from 17 November 2026 and is historical, not a live status check.
- The continuous-development mission is closed at this handover. Future work should start with moderated player evidence, remaining assistive-technology review and physical-device/hosted performance measurement; deferred game concepts are not an approved roadmap.

## User-directed UX and gameplay refinement — 18 November 2026

- Continued with the user's comprehensive refinement brief while preserving the mixed local WIP. The scope remains the twelve existing games: no new game, Daily rotation change, stable ID/route change, progress reset, commit, push, deployment, publication, `sudo`, or production infrastructure change was made.
- Refined the homepage and navigation around stable visit greetings, clearer resume context, context-aware return links, lighter utility hover states, and a viewport-wide Play Anytime section. Corrected root-level horizontal clipping while preserving the carousel's own horizontal scroll.
- Kept the shared setup overlay and improved the map-focused play layouts: larger responsive map stages, compact map docks for relevant controls, map pan/zoom and framing, and game-specific layouts that do not add text entry where map interaction is the challenge.
- Find the country is map-only, supports small selectable islands, preserves neutral countries outside the answer pool, and shows a flag/name with visual correctness feedback before automatic progression. Border Route accepts an unordered collection of intermediate countries and uses the reciprocal adjacency graph to find a valid displayed route. Flag Study marks selected/correct answers and automatically advances after feedback. Capitals & Cities makes map placement primary and keeps coordinate entry in a collapsed secondary panel.
- Geography Grid Free Play has an expanded, documented criterion pool, two-clue answer feedback, and an explicit North Macedonia/UN M49 regression; the original Daily pool and versioned identity remain unchanged. The external GeoGrid review and primary UN/EU sources are documented in [GAME_RESEARCH.md](GAME_RESEARCH.md).
- Shared segmented progress and answer feedback are used where they suit each game's round model. Necessary player actions remain for whole-set games such as Neighbour Challenge and Latitude Ladder; the audit records the difference between those actions and generic per-question Next buttons. The suggested Blind coordinates interaction is documented as a future mode concept inside Capitals & Cities, not implemented or selected work.
- Final browser follow-up made Neighbour Challenge's duplicate and target-selection notices visible to players and assistive technology, kept Grid autocomplete options inside the answer panel, and tuned the mobile Grid board to fit its viewport. Timing and focus assertions now follow Higher or Lower's 1.75-second advance and question-heading focus.
- Updated [GAME_AUDIT.md](GAME_AUDIT.md), [GAME_RULES.md](GAME_RULES.md), [GAME_RESEARCH.md](GAME_RESEARCH.md), [GAME_CONCEPTS.md](GAME_CONCEPTS.md), and [FINAL_HANDOVER.md](FINAL_HANDOVER.md) to reflect the current product and distinguish implemented changes from concepts.
- Final validation passed: `npm run typecheck`, `npm run lint`, `npm test` (15 files, 85/85 tests), a fresh production build (2,183 modules; 188 precached assets; build ID `a492d9c43da55dae`), and the complete production-preview Playwright suite (55/55 in 9.2 minutes). No tests were skipped or weakened.
- Artifact validation passed for the application shell, compiled bundles, 14 required static files, all 188 precached assets, eight data/catalog checksums, world/outline TopoJSON (259/269 features), and all 198 indexed regional packages with their checksums and feature counts. `git diff --check`, `bash -n scripts/finalize-deployment.sh`, and a trailing-whitespace scan across 37 untracked paths also passed.
- Git remains on `codex/maproom-daily-gameplay-corrections` at `cc5d1fc`; no commit was created. The current mixed working tree contains 56 changed tracked paths (54 modified and two deleted) plus 37 untracked paths. Two tracked GeoJSON assets were replaced by the validated TopoJSON files; the remaining local WIP is preserved together because several files contain mixed pre-existing and mission changes.
- No push, deployment, publication, `sudo` command, production change, or host-readiness check was performed. Browser evidence is local Chromium at responsive viewport sizes; physical-device performance, moderated player evidence, and broad screen-reader/voice-control/human-listening review remain open.
- Browser evidence is local Chromium and responsive viewport testing, including home/navigation/setup and representative map/game screens in both themes. This does not establish physical-device behavior, moderated player results, or broad screen-reader, voice-control and human listening compatibility.

## Product-quality mission checkpoint — 19 November 2026

- This checkpoint is isolated to `/home/charlie/maproom-worktrees/product-quality`, branch `codex/maproom-product-quality-20261119`, starting from `5465c034eefd8c365311ec256f1c2aec3425762a`. The original `/home/charlie/maproom` checkout and integration branch were left untouched.
- Read-only baseline validation passed typecheck, lint, build, and the full production-preview browser suite (87/87, one worker). The baseline unit suite was 113/114 because one exhaustive Connections fact audit exceeded the standard five-second test timeout.
- Created [the competitive-landscape research library](research/competitive-landscape/README.md): current competitor catalog, 15 deep dives, mechanics, a 13-game gap analysis, ranked existing-game backlog, decisions, a research log, and 32 future-game candidates. Research records direct play separately from official descriptions, consent/login/access limits, and unverified claims.
- Riverways now gives rounded centre-to-centre distance and compass direction after every wrong river, then identifies the target centre's country after the second miss. Settings explain the generalized-line measure and its limit. The six-guess rule, score, Daily identity and source data were not changed.
- Connections fact audits now compare rules against the 16 tiles on a board, preserving exact alternate-quartet and ambiguity checks while avoiding repeated full-catalog scans.
- Geography Grid's expanded Free Play pool now samples categories based on their accepted-board usage. Deterministic measurement retains 240 boards, raises distinct row/column clue pairs from 345 to 371, and reduces P90 intersection size from 32 to 27. Maximum category appearances changed from 76 to 77; this is a modest pool-variety improvement, not proof of even balance or human-perceived replay value. Daily generation remains on its existing path.
- Validation passed: full unit suite (117/117), typecheck, lint, production build, focused Riverways and Geography Grid production-preview tests (1/1 each), and manual local-browser review of both river miss clues and saved progress. The Grid browser flow filled all nine cells from valid category intersections and completed successfully.
- Checkpoint `0bb0dd8` is committed and pushed to `codex/maproom-product-quality-20261119`. No deployment or production change occurred. Continue the broader quality mission on this branch; this checkpoint is not final completion.

## Border Route route-quality results — 19 November 2026

- Border Route results now state how many borders the accepted route uses and the shortest route's border count. A longer valid route also reports its extra intermediate stops; the game still accepts arbitrary-order country sets and valid detours.
- The unit tests cover shortest/longer route wording and a valid detour through a real adjacency graph. The production-preview regression completed a shortest route and verified its comparison and existing 900-point hint-adjusted score.
- Validation passed: full unit suite (119/119), typecheck, lint, production build, and the focused Border Route Playwright test (1/1). This is engineering/self-play evidence; player comprehension remains open.
- This follow-up is ready for a mission-branch checkpoint. No deployment or production action was performed.

## Neighbour Challenge feedback — 19 November 2026

- The check result previously reported matched/missed/extra counts and the full answer list, but hid the selected countries. It now names the found, missed and incorrect countries, helping a player see the specific set difference after the check.
- Expanded the browser flow to submit one missing neighbor and one valid non-neighbor, verify both names in the reveal, then complete the remaining four rounds exactly. The final score summary correctly reports four of five exact sets.
- Validation passed: full unit suite (119/119), typecheck, lint, production build, and the focused Neighbour Challenge production-preview test (1/1). Desktop and 390px screenshots show the named lists wrap within the feedback panel; the browser check found no horizontal overflow. This confirms the feedback flow, not later player recall.
- The updated gap analysis and ranked backlog record the change. No deployment or production action was performed.

## Map Projection Match — 19 November 2026

- Added **Map Projection Match** as the fourteenth game at `/games/projection-match`. Each seeded Free Play set presents Equal Earth, Mercator, Equirectangular and Orthographic once each, asks players to match a concrete mapping task to one rendered map, and explains a strength and limitation after each answer. It scores 250 points per correct answer across four tasks and saves selection, answers and task progress for resumption.
- The new maps render the existing Natural Earth country geometry with the installed `d3-geo` projection library. USGS and D3 primary references inform the educational copy; no new data files, runtime dependencies or third-party services were added. The new game remains outside the explicit eight-game Daily allowlist.
- Registered the stable game ID, catalog entry, lazy component, artwork, SEO route and production-artifact checks. Updated the current rules, audit, architecture, deployment, research and competitor-gap records. The integration-branch handover remains an accurate record of its earlier 13-game baseline.
- Validation passed: unit suite (121/121), typecheck, lint, production build (22 route snapshots, 19 indexable sitemap URLs, 200 precached assets), and focused production-preview browser checks (4/4) for map rendering, keyboard selection/focus, saved feedback after reload, four-task completion, replay, 390px touch, dark theme, route metadata and sitemap coverage.
- Desktop and 390px mobile screenshots are available at `artifacts/qa/product-quality/map-projection-match-desktop.png` and `artifacts/qa/product-quality/map-projection-match-mobile.png`. These visual and self-play checks do not measure whether new players understand the prompts or find four tasks appropriately challenging. No deployment or production change occurred.

## Flag Match progressive reveal balance — 19 November 2026

- The old reveal always uncovered the left third first, giving hoist-side details a consistent early advantage. Practice now covers the flag with three equal-width slices and uses a seeded round order to distribute first reveals evenly; after two misses, two slices are visible, and the third miss reveals the answer. Daily behavior remains unchanged because progressive reveal is a Free Play setting.
- A deterministic 50-question sample from each Standard and Extended flag pool balances first-slice positions with a maximum count difference of one. A mixed sample of similar tricolor flags and complex/asymmetric designs also balances 10 first reveals 4/3/3. The production-preview browser check confirmed the three displayed slices have equal width (within 0.1 CSS pixels) and that the first and second misses expose one and two slices.
- Validation passed: typecheck, lint, full unit suite (122/122), production build/artifact validation, and the focused Flag Match production-preview test (1/1). These checks measure spatial coverage and assignment balance; they cannot establish whether clues feel equally informative or whether large color fields dominate human recognition. Player review remains open. No deployment or production change occurred.

## Find the country multi-guess practice — 19 November 2026

- Reused the Worldle field note's observed distance/direction clue, leaving out its percentage because the scale was not verified. Added an optional Free Play mode for world and continent country scopes: four map guesses, approximate catalog-centre distance rounded to 50 km, direction from the guess to the target, red map feedback for tried countries, and 100/75/50/25 points for correct answers by attempt. The one-click setting remains the default; Daily and subdivision practice remain unchanged.
- Unit tests cover the compass direction, 50 km rounding, close-centre and missing-coordinate copy, attempt limit and score schedule. The production-preview browser flow leaves the prompt active after a miss, completes on a second guess, checks a four-miss answer reveal, verifies mobile width and dark theme, and saves a screenshot of first-miss feedback. Existing one-click completion and narrow-screen focus tests pass.
- Production build/artifact validation, typecheck, lint and the full unit suite passed. Player comparisons of clarity and round length remain open; the new mode is a practice prototype, not a Daily recommendation. No deployment or production change occurred.

## Higher or Lower source and coverage audit — 19 November 2026

- Compared five World Bank World Development Indicators series at the exact 2023 observation year against Maproom's Standard (195) and Extended (243) country identities. Coverage, positive-value counts, possible pair totals under the existing Standard and Close ratio bands, API source notes and candidate limitations are documented in [GAME_RESEARCH.md](GAME_RESEARCH.md).
- Life expectancy is the strongest source candidate for a separate content review (194/195 Standard and 215/243 Extended observations; 17,506 and 21,469 possible close pairs respectively). No new metric or data was approved or added.
- Corrected the Higher or Lower result copy and source documentation: population uses the 2023 World Bank series when available and country-catalog fallback otherwise; area is from the country catalog and has no recorded observation year. Comparison, scoring and data files are unchanged. No deployment occurred.

## Distance & Direction pair calibration — 19 November 2026

- Deterministic sampling found that coordinate Close calls had no upper bound: the old 100-question samples had median gaps up to 20.31° latitude and 82.57° longitude. Close coordinate comparisons now stay from 0.35° to below the 4° Standard threshold; distance ratios remain 1.01–1.35 for Close and at least 1.25 for Standard.
- Comparison identity now includes the origin plus the unordered answer pair, allowing a different origin to create a distinct question while preventing exact repeats. Regions with fewer than three eligible current cities at the chosen population threshold no longer appear in the selector. If a requested finite round still has fewer unique questions, the game names the available count and offers settings that can broaden the pool.
- Five-seed World samples produced all 20 requested questions per configuration; correct-answer keys landed on the left 45–60% of the time across 100-question samples. A 50-question audit found six constrained Oceania/1-million/Close decks with 13 distance, 32 latitude or 4 longitude questions. These are generator measurements only; player completion and accuracy remain unknown.
- The two-choice interaction remains unchanged. Validation passed: full unit suite 125/125, lint, production build/artifact validation (22 route snapshots, 19 sitemap URLs, 200 precached assets), and two focused production-preview browser checks. No deployment occurred.

## Historical Geography sequence and Country Outlines pilot — 19 November 2026

- Added a Free Play “Order three maps” format to When Was This Map? Six seeded groups use existing CShapes snapshots at least 22 years apart. Earlier/Later controls support keyboard and touch reordering; score covers the three pairwise relations; results reveal the dated and cited timeline. The existing year-guess mode, progress persistence and Daily eligibility remain unchanged.
- Screened all 20 bundled historical maps in a contact sheet and chose wide date intervals because neighboring modern maps can be subtle. Inspected desktop and mobile screenshots. The layout stacks on mobile; this visual and self-play review does not establish comprehension or perceived challenge.
- Prepared [a 12-outline pilot protocol](research/competitive-landscape/STUDIES/country-outlines-difficulty.md) and an offline HTML instrument with a fixed Easy/Medium/Hard sample, three counterbalanced orders, anonymous response fields, one-answer locking, delayed correctness reveal and explicit CSV export. The browser walkthrough completed all items and checked the generated export. The instrument was reviewed on desktop and mobile; no player sessions or responses exist, and no tier thresholds changed.
- Validation passed: unit suite 127/127, typecheck, lint, production build (22 route snapshots, 19 indexable sitemap URLs, 201 precached assets, all 20 historical maps checked), and Historical Geography browser suite 6/6 with one worker. Screenshots: `artifacts/qa/product-quality/historical-sequence-desktop.png`, `historical-sequence-mobile-dark.png`, `country-outline-study-desktop.png`, and `country-outline-study-mobile.png`.
- Backlog rank 14 now needs 6–12 casual player sessions; rank 15's prototype needs human clarity/difficulty review. No deployment occurred.

## Geocore Geo Puzzle follow-up — 19 November 2026

- Played one guest round of Geo Puzzle: Countries. The observed setup used 20 pieces from a 197-country world pool, an unlabeled map and a horizontal shape tray. Drag or select-and-tap placement, a geographic hint, distance feedback for a miss, and a green snap reveal were directly observed; the session placed Bulgaria correctly and stopped at 1/20. Keyboard arrow/Enter instructions appeared in the accessibility tree, but a successful keyboard placement was not tested.
- The later same-day Play-page view showed 169 games (the earlier capture showed 168); the 85-mode Classic catalog is a separate surface. Updated the dated competitor record with both observations.
- Deferred Country Mosaic because its current loop would duplicate the observed competitor puzzle. No Maproom code or data changed. Remaining top work requires human player sessions or physical-device access; research can continue with source audits for a genuinely distinct candidate.

## Climate Twins source review — 19 November 2026

- WorldClim 2.1 offers about 1 km monthly surfaces, but its current license does not permit redistribution or commercial use without prior permission. The public CCKP S3 archive has 1991–2020 CRU TS 4.09 monthly temperature/precipitation files at 0.5°; the current collection page says 4.07 and indexed metadata says 4.08.
- In the 12,405-record `cities-major.json` sample, 11,577 current whole settlements remained after the city-game filter. 11,559 had all months in their nearest cell; 18 cells were masked. There were 6,344 valid cells, 2,003 shared cells containing 7,218 records, and 6,330 unique profiles after rounding monthly temperature to 1°C and precipitation to 10 mm. The 179 capital-marked records in this 50,000+ subset had data and gave 178 distinct profiles; Brazzaville and Kinshasa collide. The later full-catalog audit below supersedes this capital count for Climate Twins.
- The CRU TS files remain held because their embedded license, CCKP metadata and AWS Registry conflict, and the archive/index still show versions 4.07, 4.08 and 4.09. WorldClim remains unsuitable without permission.
- A separate CCKP ERA5 1991–2020 monthly climatology is available on a 0.25° grid. Its World Bank dataset record says CC BY 4.0; the CCKP download terms also add mandatory dispute-resolution and attribution requirements. Downloaded and inspected the temperature and precipitation NetCDFs in `/tmp`; units are °C and mm/month. Recorded SHA-256 hashes in the source study.
- Rechecked the full `cities.json` pool: 241 GeoNames capital-marked records have complete ERA5 values, with 237 unique profiles at 1°C/10 mm rounding. Natural Earth 1:10m point-in-polygon screening for city and nearest grid center, plus a current GeoNames DEM screen below 1,000 m, leaves 127 unique candidates across six continents. The current GeoNames dump matched the relevant city fields in Maproom's pinned 16 November source snapshot; its hash and limitations are in the study.
- Decision: keep Climate Twins as a candidate and use the CCKP ERA5 source path only with explicit attribution, its additional terms and nearest-grid-cell wording. A direct Copernicus ECV alternative uses CC BY 4.0 but needs CDS login. No climate data or dependency was added to the project. See the [source review](research/competitive-landscape/STUDIES/climate-twins-source-review.md), [ERA5 collection](https://worldbank.github.io/climateknowledgeportal/docs/collections/era5-x0.25.html), [World Bank dataset record](https://datacatalog.worldbank.org/search/dataset/0065626/climate-change-knowledge-portal-observed-climate-data-era5-0-25-degree), and [CCKP download terms](https://climateknowledgeportal.worldbank.org/download-data).

## Higher or Lower life-expectancy measure — 19 November 2026

- Reviewed this backlog item as a human-geography outcome comparison distinct from area and density. WDI `SP.DYN.LE00.IN` provides a 2023 estimate for 194/195 Standard identities and 215/243 Extended identities, with CC BY 4.0 listed by the indicator page. Its meaning and source are shown in game; missing values are excluded without fallback.
- Added Free Play comparisons with absolute year-gap tiers: 1 to under 4 years for Close calls and at least 4 years for Standard. These ranges provide 3,962 and 13,258 possible pairs in the Standard world pool, respectively, and at least 20 pairs in each tier across every continent. A short-pool notice discloses when a requested 50-question round has fewer available pairs.
- Daily remains on its existing population, area and density measures. Country data, source manifest, game rules and ranked backlog are updated. Player review is still needed before considering the measure for Daily.

## Latitude Ladder spacing audit and browser regression — 19 November 2026

- Audited the current 5-city sampler against the 5,870 eligible cities with population of at least 100,000. In 20,000 random samples per scope and axis, the closest adjacent coordinate gap was under 0.25° in 7.6% of World north–south rounds, 25.4% of Europe north–south rounds, and 28.4% of Oceania west–east rounds. Spacing differs substantially by axis and region; longitude degrees also cover different ground distances at different latitudes. The full distributions and method are in the competitive research log. Generator samples do not establish perceived difficulty, so no thresholds changed; collect player ordering accuracy first.
- The first sequential full browser run passed 92/93 tests; one strict selector matched both Country Map switches after the multi-guess option was added. Scoped it to the labeled “60-second speed round” control, then reran the focused contrast case and the complete single-worker suite. The contrast case passed in both themes, its helper still checks every visible switch, and the full suite passed 93/93. The life-expectancy flow passed in both full runs. No deployment occurred.

## Population Pyramid Sort — 19 November 2026

- The participant-dependent top backlog items remain open, so I moved to a distinct human-geography game with public, year-matched source data. Direct World Bank API metadata showed age bands are percentages of each sex's population; the implementation weights them by male/female totals before visualizing shares of total population. The separately sourced WDI 65+ share agrees with the profile's 65+ cohort sum to within 0.00008 percentage points.
- Added 194 complete 2023 Standard country profiles from 37 WDI series (the Vatican City identity has no complete observation and is omitted without fallback). The API reports a 11 November 2026 update; World Bank WDI identifies the underlying age-estimate source as UN World Population Prospects 2024, with CC BY 4.0 data terms. The profile bundle is ~63 KB, attributed in the data manifest, and precached for offline installation.
- Implemented five Free Play rounds, with two adjacent ordering gaps per round narrowing through 8–18, 6–14, 4–10, 2.5–7, and 1–4 percentage points. A later direct recount against the current generator supersedes the initial candidate estimates: the first-round pool is 31,699; rounds 2–5 average 83,843, 114,174, 84,425 and 86,173 eligible triples across 150 seeded sets after country-reuse exclusions. A round awards 100 points for each correctly ordered pair. Keyboard and touch Earlier/Later controls avoid drag-only input; checked answers reveal country names and values; order/progress persists and replay advances to a new seeded set. Daily eligibility is unchanged.
- Updated the game catalog, visual card, routes, SEO snapshots, offline cache, artifact validation, source study, idea backlog and mission log. The next product step is a first-read/replay player review; generator gap bands are not presented as human-validated difficulty.
- Visual inspection covered light-theme desktop, dark-theme mobile, and a checked-result state (`artifacts/qa/product-quality/population-pyramid-desktop.png`, `population-pyramid-mobile-dark.png`, and `population-pyramid-reveal.png`).
- Validation passed: all unit tests (134/134 across 28 files), typecheck, lint, production build/artifact validation (23 route snapshots, 20 sitemap URLs, 203 precached assets, 198 regional packages), and the full single-worker production-preview browser suite (95/95). The focused new-game browser cases also pass for ordering, restore, replay, themes, touch, and offline startup. No deployment occurred.

## Watershed Match source follow-up — 19 November 2026

- Revisited the unresolved HydroBASINS source gate. Its official product uses the HydroSHEDS v1 license, whose software distribution terms require an end-user license and prohibit standalone redistribution; Maproom does not bundle that source.
- Identified Basin90m as a possible alternative. GFZ's data description labels it CC BY 4.0 and describes 667,629 basins larger than 50 km², each paired with a longest river channel. Its published method uses HydroBASINS boundaries to partition the SRTM DEM into 130 processing segments, leaving a source-license dependency question before redistribution.
- The 90 m SRTM DEM covers 60°N to 56°S, and the paper says systems intersecting 60°N were removed. The listed Basin90m attributes do not document parent/child IDs, and the authors caution that false rivers were not manually removed, especially in flat or heavily modified areas. This is a promising source candidate, not an approval to bundle or an implementation decision.
- Next research step: clarify whether the HydroBASINS processing dependency affects Basin90m redistribution, then inspect a small Basin90m sample for named-river matches and usable flow topology. No new data was downloaded or added, and no deployment occurred.

## Population Pyramid Sort audit update — 19 November 2026

- Reviewed the current implementation against the full game-audit categories: objective and scoring, five-round pacing, answer feedback, replay and persistence, visual chart, keyboard/touch controls, assistive table, source coverage, and Daily separation. The code and browser evidence support those implementation claims; they do not establish that the visual clue is intuitive or the gap sequence feels fair.
- Updated the game-by-game audit and comparative gap analysis to include Population Pyramid Sort, correcting both from fourteen to fifteen registered games. Recorded the open question of whether an optional visible cohort table would help players connect the silhouettes to the 65+ ordering.
- Next product-quality step remains a first-read/replay session with players, including a direct question about whether the final reveal explains how each profile led to its rank. No game behavior changed in this audit-only update.

## Population Pyramid Sort seed coverage audit — 19 November 2026

- Recounted valid triples from the checked-in 194 profiles using the current generator's inclusive adjacent-gap rules. The first-round pool contains 31,699 triples. Across 150 seeds with set index zero and no country reuse within a set, rounds 2–5 contained 81,911–87,279 (mean 83,843), 111,045–118,519 (mean 114,174), 81,220–89,733 (mean 84,425), and 81,711–92,481 (mean 86,173) triples. This corrects the smaller initial counts recorded above.
- In those 150 complete sets, all 194 profiles appeared at least once across the 2,250 profile slots; per-country selection count ranged from 3 to 34 (median 11, 90th percentile 19). An exploratory 50-seed comparison of uniform valid-triple, uniform-country-anchor and inverse-candidate-degree selection found no lower country-count dispersion for either alternative. The current sampler therefore remains unchanged; no conclusion about human-perceived replay variety follows from these generator measurements.
- The exact method, per-round pool ranges, and limits are in [the Population Pyramid Sort study](research/competitive-landscape/STUDIES/population-pyramid-sort.md). No code or game behavior changed.

## Terrain Profile summit source pilot — 19 November 2026

- Reviewed NOAA ETOPO 2022 (global 15-arc-second surface grid, CC0), USGS SRTM (public domain, some voids and higher-latitude resolution changes), and GeoNames (CC BY 4.0 peak/pass names and coordinates, with no accuracy warranty or per-record provenance for its elevation field).
- Sampled four summit coordinates with the public SRTM30m point API and compared them with government or national-mapping references. The raster samples were 27–143 m lower; GeoNames' integer elevation values were close in these four examples. This small sample is not a global accuracy estimate, and SRTM cell values should not be used as official summit heights.
- The candidate remains research-only. A curated set of published heights may be viable, but the next gate is to assemble more globally varied peaks with one authoritative height citation each and measure the ordering-gap pool. Validate passes separately. The source record and values are in the [Terrain Profile study](research/competitive-landscape/STUDIES/terrain-profile-source-review.md).
- No raster tiles or game data were added. No code, tests, or deployment changed.

## Terrain Profile distinctness review — 19 November 2026

- Reviewed the Geospatial Information Authority of Japan's 1,003-mountain list and terms. The 31 March 2026 source gives each mountain's highest point and elevation; its 3D record page exposes coordinates and measurement type. Four prominent peaks include adjacent height differences of 0, 3, and 10 m, so a sort game would need explicit tie and near-tie handling. GSI is a viable attributed Japan-only source but does not supply cross-section profiles. Only selected HTML records were checked; the 1,003-row file was not parsed.
- Checked the proposed order-by-height mechanic against Maproom's Latitude Ladder and Population Pyramid Sort, and official catalog descriptions for Geocore Rank It, Higher Ground and Guess the Height and Worldly Rankings. The current concept adds too little new player action, so it is deferred; source viability alone does not justify implementation.
- No code or data changed. No tests or deployment were run. Sources, access labels and the decision are recorded in the [Terrain Profile study](research/competitive-landscape/STUDIES/terrain-profile-source-review.md).

## Worldly Rankings live practice — 19 November 2026

- Completed a public six-country GDP puzzle in three guesses. Position feedback improved from 2/6 to 4/6 to 6/6; tap-to-swap worked. The result displayed each GDP figure but did not show its source or year.
- The round exposed guess-history buttons and a prompt to revisit earlier guesses; restore behavior and drag were not tested. Country rows appeared as generic text in the browser accessibility tree, so keyboard and assistive-technology operation remain unverified.
- Added the observation and limits to the [Worldly Rankings deep dive](research/competitive-landscape/DEEP_DIVES/worldly-rankings.md) and mechanic library. This direct-play sample supports the decision to defer another Maproom order-by-number game.

## Watershed Match source and gameplay review — 19 November 2026

- Identified a public-domain U.S. source path in the official WBD 2024 snapshot and the CC0 USGS Mainstems v3.1 release. WBD is complete through HUC12 for the United States and includes nested HUC codes and downstream-unit relationships. Its unit boundaries must be described accurately: a HUC12 may be one portion of a larger river's upstream drainage.
- Found a snapshot-alignment issue before any implementation: Mainstems v3.1 uses a January 2025 final-WBD snapshot, while the official WBD 2024 snapshot is a different static product. The two geometries and crosswalk coverage need to be reconciled. Mainstems' display summary is simplified and should not be treated as analysis geometry.
- Reviewed the global MERIT-FullBasin v1.1 alternative (340,955 display outlines at 1 km² or more, 6.4 GB global archive, current CC BY-NC 4.0 or ODbL terms) and Lake-TopoCat (lake-linked basins covering about 57% of land). Neither is a ready-to-bundle worldwide solution for this game.
- Played one MapGuesser Find the Feature round. A Golfe du Lion sea prompt used pin placement, then revealed the target outline and a 1,627 km distance; the submitted guess scored zero. Its advertised pool includes 188 rivers, but no river round was played. This evidence and Riverways' existing river-name loop make a second map-pin river quiz too similar.
- Decision: keep Watershed Match as a candidate, reframed around choosing the downstream hydrologic unit or mainstem. Before coding, align one source snapshot pair, audit names/outlets, estimate asset size, and specify keyboard and touch behavior. See the [source and gameplay review](research/competitive-landscape/STUDIES/watershed-match-source-review.md) and [MapGuesser deep dive](research/competitive-landscape/DEEP_DIVES/mapguesser-feature.md). No implementation, data asset, tests or deployment changed.

## Watershed Match single-source data audit — 19 November 2026

- Found the USGS Hydrologic Geospatial Fabric's 2025 HUC12 collection (`wbd12_20250107`), which provides polygons and `ToHUC` in one CC0 1.0 API collection. The USGS data dictionary defines `ToHUC` as the downstream unit that naturally receives the majority of flow; special values cover ocean, Canada, Mexico and closed basins.
- Sampled three local bounding boxes, originally labeled Potomac, Columbia and Susquehanna: 379 unique HUC12 features. Of 344 links with both source and target in the sampled geometry, all 344 share an exact polygon-boundary segment; 334 sources have at least three adjacent HUC12 choices. Requiring source and target `HUType=S`, `HUMod=NM`, and two other adjacent unmodified subwatersheds with distinct names leaves 95 prototype candidates. A later audit found the first box spans four basins; its game label was corrected to Appalachians.
- The single-source path avoids reconciling Mainstems' final-WBD crosswalk against WBD 2024. Use only numeric HUC12 `ToHUC` links initially, curate/inspect the shapes, simplify and size the offline bundle, and keep the game outside Daily. The updated [source study](research/competitive-landscape/STUDIES/watershed-match-source-review.md) records the query areas and limits. No game code or asset has been added yet.

## Watershed Match Free Play prototype — 19 November 2026

- Implemented the catalog route, a seeded five-question map round, downstream reveal, 100-point scoring, saved progress/restore, replay and accessible keyboard/touch answer buttons. Daily eligibility remains explicitly false.
- Built a bundled CC0 sample from the USGS `wbd12_20250107` collection: 60 questions across an Appalachian sample window (31), Columbia (22) and Susquehanna (7), with 118 HUC12 polygons. A later HUC8 audit established that the Appalachian window contains 19 South Branch Potomac, 2 James, 6 Monongahela and 4 Greenbrier questions; the prior Potomac label was too narrow. The JSON hash and manifest were updated with the corrected metadata.
- The answer reveal highlights the recorded `ToHUC` destination and draws a schematic relation arrow, clearly labeled as not a river trace. No river lines or complete downstream network are bundled.
- Production-preview Playwright checks passed 4/4 for the five-round scoring/replay flow, presence of all three sample areas, keyboard selection, saved selection, 390 px mobile layout, dark theme, SEO sitemap and offline restore. Screenshots: `artifacts/qa/product-quality/watershed-match-desktop.png`, `watershed-match-reveal.png` and `watershed-match-mobile-dark.png`.
- Typecheck, lint, full unit suite (137/137), production build/artifact validation and `git diff --check` passed. The first full 97-case Playwright run passed 94; two failures were stale route-count/label assertions and are fixed. A separate Geography Grid touch assertion failed only in the full run and passed in the 4-case focused rerun, so it remains a possible flaky/order-dependent check. The screens and loop are verified; the heuristic-selected question pool and its learning value still need editorial and player review. No deployment occurred.

## Geography Connections authored-board variety — 19 November 2026

- Audited all 24 fixed boards for repeated exact country quartets and overlaps with known country facts. Rotated valid subsets in ASEAN, Nordic, EEC and OPEC membership groups, diversified the Brazil-border and Central America quartets, and revised Atlas 14 and Atlas 23 to remove repeated same-difficulty answers. Larger finite group labels now state “among” and the full group size where appropriate.
- Added regression tests for unique quartets within each difficulty, the three documented cross-difficulty repeats, exact board facts and membership label counts. All 140 unit tests pass across 29 files, with typecheck and lint green.
- The three remaining repeats are constrained four-member facts: Guinea-name countries (Atlas 01/24), Danube capitals (Atlas 03/21), and Lake Chad shore countries (Atlas 08/17). Updated the authoring guide's overlap inventory; no unassigned exact alternative quartet remains.
- The production build passed with 24 route snapshots, 21 sitemap URLs and 205 precached assets. The sequential Connections Playwright suite passed 7/7, including deterministic Atlas 14/23 reveals, one-away feedback, keyboard, mobile dark theme and reduced motion. The Nordic subset, France-border clue, G7 subset, India-border group and result flow rendered as authored; screenshots are `artifacts/qa/product-quality/connections-atlas-14-revealed.png` and `connections-atlas-23-complete.png`. Human difficulty, decoy fairness and replay interest remain open; no player study occurred and no deployment happened.

## Riverways clue signal audit — 19 November 2026

- Exhaustively enumerated every possible target and distinct wrong guess across the three bundled pools, then counted unguessed target rivers matching the same clue signature. Current 50 km/eight-way first-miss clues uniquely identify 83.2% of Easy, 82.1% of Medium and 77.5% of Hard cases; after the second miss plus target-centre country the unique rates are 94.3%, 96.8% and 96.9%.
- Compared 100, 250 and 500 km rounding and four-way cardinal directions. In Hard, first-miss uniqueness falls to 37.6% at 250 km/eight-way and 20.8% at 500 km/eight-way. These figures describe combinatorial information in the finite data, not player comprehension, likely guesses or perceived difficulty. No clue precision or gameplay rule changed.
- Added the method, sensitivity table and a 6–8 person qualitative player-study protocol to the [Riverways feedback audit](research/competitive-landscape/STUDIES/riverways-feedback-audit.md). The next open evidence item is independent player response. Documentation-only update; no product code, tests, asset or deployment changed.

## Geography Connections blinded review protocol — 19 November 2026

- Prepared a 6–8 person qualitative protocol for the 24 authored boards. Each participant reviews six boards, two per overall difficulty pool; the facilitator records solve order, time, mistakes, one-away events, alternate groupings, ratings and explanation clarity.
- The facilitator keeps the intended difficulty private and withholds answer labels and overlap notes until the normal reveal. The protocol tracks Atlas set coverage so repeated or unseen boards can be followed up. This makes the player review ready to run but supplies no participant evidence; no product code, tests, data or deployment changed.

## Climate Twins source terms review — 19 November 2026

- Follow-up review of the current World Bank/CCKP download terms found that they claim to apply to use of the dataset and derived presentations, with additional mandatory mediation/arbitration and attribution requirements. The two CCKP ERA5 files had already been downloaded and used for the earlier technical feasibility audit before this terms review; the applicability/status of that prior use is unresolved.
- No CCKP-derived profile or game asset is bundled, and no further CCKP use was undertaken. Climate Twins remains a candidate but product work is deferred until the earlier use and terms are resolved or another source path is verified. Direct Copernicus ECV access was not available for this follow-up. See the [source study](research/competitive-landscape/STUDIES/climate-twins-source-review.md) and [World Bank terms](https://climateknowledgeportal.worldbank.org/download-data). No code, tests, data asset or deployment changed.

## Watershed Match map label spacing — 19 November 2026

- Reviewed all 60 source-and-choice frames with the gameplay Albers projection. Three frames had marker centers closer than the 38-unit badge spacing. The map now separates those badges with centroid connectors, and marks the starting area with a compact `S`; the measured final minimum gap is 38.25 units and maximum shift is 38 units.
- Added a full-pool layout regression and a deterministic production-preview browser check of the tightest Little River frame. The screenshot is `artifacts/qa/product-quality/watershed-match-marker-spacing.png`. Typecheck, lint, all 141 unit tests, production build/artifact validation and the Watershed Match Playwright suite (3/3) passed.
- This is an annotation repair, not an editorial approval: the name-based distractors, small polygon legibility and player understanding of the majority-flow rule still need review. The pilot remains Free Play only and outside Daily. No deployment occurred.

## Watershed Match sample-area label audit — 19 November 2026

- The first bounding box had been called Potomac, but its 31 questions occupy four HUC8 basins: 19 South Branch Potomac (`02070001`), 2 Maury/James (`02080202`), 6 Cheat/Monongahela (`05020004`), and 4 Greenbrier/Kanawha (`05050003`). The official USGS HUC descriptions confirmed the basin names.
- Changed the label to “Appalachians” in the game, generator, question data and source manifest without changing the 60 source/answer/choice records or their geometries. Added a regression check for the HUC8 split. The browser's sampled-region expectation now uses the corrected name.
- Static content checks found no repeated source/choice names within any question. The 60-question pool contains 43 distinct correct HUC12 destinations; 15 recur elsewhere (maximum three uses), while the five-round deck avoids duplicate destinations across 50 tested seeds. Twenty-one of 120 wrong-choice labels share the correct label's remaining token set after the generator's stop words; this is a lexical signal only, not evidence of human fairness.
- Typecheck, lint, all 142 unit tests, production build/artifact validation and the three-test Watershed Match Playwright suite passed. The 60-question, 118-polygon asset is 383,588 bytes (36,769 bytes with gzip level 9). It remains a Free Play sample, outside Daily, and has not been deployed.

## Map Projection Match nonvisual map descriptions — 19 November 2026

- The map SVGs were hidden from screen readers, and each choice button was named only “Option A–D.” Added distinct nonvisual map descriptions for the Equal Earth outline and graticule, Mercator latitude spacing, equirectangular graticule, and Orthographic visible hemisphere. After checking, the accessible button names also include each projection's name.
- Checked the descriptions against D3's projection reference and USGS projection references; added unit and production-preview browser assertions for the accessible names before and after checking. Browser tests verify the accessibility tree names, not a physical screen-reader session.
- Typecheck, lint, all 143 unit tests, production build/artifact validation (24 route snapshots, 21 sitemap URLs, 205 precached assets) and the focused Projection Match Playwright flow (1/1) passed. Actual assistive-technology and player comprehension remain open; the game stays outside Daily. No deployment occurred.

## Watershed Match player pilot and current-docs audit — 19 November 2026

- Prepared a qualitative first-read protocol for 6–8 casual players playing two normal five-question Free Play sets. It records task interpretation, question-level answers/confidence, map and reveal understanding, decoy fairness and replay interest without collecting identifying or recording data. No sessions have been run.
- Added Watershed Match to the current engineering audit and game rules; synchronized current reference counts to 16 games, 24 route snapshots and 21 sitemap URLs. The architecture, gap-analysis and selected-concept status now describe the limited WBD pilot and link the protocol. The earlier integration handover remains a historical record of its own branch.
- Traced the 21 wrong-choice labels with exact remaining token-set matches to ten shared waterbody-name groups, and added their question IDs to the moderator source review. The inventory is not presented to participants and no question content was changed.
- Added the Watershed Match and Population Pyramid source/method summaries to `DATA_SOURCES.md`, including their CC0/CC BY terms, fixed coverage, transformations, offline behavior and limits.
- These are documentation and study-preparation changes only. No code, data, Daily eligibility or deployment state changed. The game remains outside Daily pending editorial and player review.

## Watershed Match nonvisual map positions — 19 November 2026

- Added nonvisual descriptions to answer buttons locating each candidate polygon center in one of eight screen-relative directions from the blue starting-area center; coincident centers are described as overlapping. The letter and candidate name remain the accessible button name, while the decorative marker SVG remains hidden.
- Added full-pool unit coverage for all 180 candidate positions across 60 questions, all eight direction sectors and overlapping centers. Added a production-preview browser assertion for the accessible description. This is browser-tree verification, not a physical screen-reader review.
- Typecheck, lint, all 145 unit tests, production build/artifact validation and the focused Watershed Match Playwright suite passed. No source data or gameplay rules changed; the game remains outside Daily and has not been deployed.

## Capitals & Cities map-placement precision — 19 November 2026

- Fixed scoring to use the exact point selected on the map instead of the two-decimal coordinate text synchronized for keyboard access. Editing either coordinate input still uses the entered pair; that edit state is included in Daily progress restoration.
- Added a production-preview check that the guess marker does not shift after map submission. The existing city end-to-end flow also passed when explicit coordinates replace a prior map pin. Typecheck, lint, all 145 unit tests, production build/artifact validation and both focused browser checks passed.
- New-player evaluation of map focus, score bands and the result reveal remains open. No game mode or source data changed; the game remains in its current Daily/free-play formats and has not been deployed.

## Capitals & Cities placement pilot protocol — 19 November 2026

- Prepared a concise 6–8 person first-read study for one normal ten-question City Location Free Play set. It covers task comprehension, map focus, pin correction, score interpretation, fast reveal timing, coordinate-panel discovery and replay interest, with desktop/touch input noted.
- The protocol avoids priming the coordinate option, does not collect names or submitted coordinates, and does not treat a small convenience sample as score-calibration evidence. No participants have been recruited and no responses have been collected.
- Updated the study index, game audit, backlog and blind-coordinate concept note. No gameplay code, source data, Daily rules or deployment state changed.

## Biomes Mosaic source and mechanic gate — 19 November 2026

- Verified RESOLVE's 2017 source and terms: 846 terrestrial ecoregions, 14 biome classes, eight realms and CC BY 4.0. The current public polygon mirror returns one additional Rock and Ice feature outside those 14 biome classes; it is not versioned. The official source warns of polygons with more than one million vertices.
- Compared this with the public-domain USGS World Terrestrial Ecosystems alternative. RESOLVE is the more direct broad-biome classification, but its complex polygons need a pinned source snapshot and simplification audit before offline use.
- Kept the candidate gated: outline naming would repeat Country Outlines, and biome grouping would repeat Connections. No data or code changed; first define and review a distinct spatial action and learning goal.

## Plate Boundary Lab source gate — 19 November 2026

- Checked the PB2002 scientific paper and the ODC-BY 1.0 conversion, which include seven boundary-step classes and detailed segment geometry. The current ArcGIS mirror has no stable version metadata, so it is not selected as the app's source.
- USGS ComCat can provide dated GeoJSON event queries, but its event parameters are contributed by worldwide seismic networks. A fixed offline sample needs a contribution/redistribution review and a question-by-question fairness audit before bundling.
- Kept Plate Boundary Lab as a candidate. Its pattern-inference action could be distinct, but no game was implemented and no source data changed.

## Population Pyramid Sort scoring clarity — 19 November 2026

- A production-preview screen review found that round feedback explained pairwise scoring, but the score panel said only “exact” and did not show the 1,500-point set maximum. The scoring rule is now stated before play, the running score is shown out of 1,500, and the counter names perfect rounds.
- Updated the game audit, improvement backlog and source/rules review. Focused production-preview browser checks passed on desktop and 390px mobile, including dark mode, saved ordering, replay and offline loading. Screenshots: `artifacts/qa/product-quality/population-pyramid-desktop.png` and `population-pyramid-mobile-dark.png`.
- Typecheck, lint, production build and artifact validation passed. The five-round rules, scoring, source data and Daily eligibility are unchanged; the game remains outside Daily and has not been deployed. Independent player comprehension remains unmeasured.

## Plate Boundary Lab event-frame audit — 19 November 2026

- Queried four fixed 2010–2019 M4.5+ rectangles through USGS FDSN with `contributor=us`; only event counts and depth-band summaries were retained. The Japan window had 3,285 events, San Andreas 48, Mid-Atlantic Ridge 192 and East Pacific Rise 38. All events in the selected transform/spreading windows were shallower than 70 km.
- These exploratory frames do not establish a fair event-pattern clue or solve per-event reuse rights. Kept the game gated, recorded the evidence in the source study, research log and decision table, and deferred implementation. No event records or app data were saved.

## Time-Zone Relay source and mechanic gate — 19 November 2026

- Verified GeoNames city records include coordinates and IANA time-zone IDs under CC BY 4.0; the IANA time-zone database is public domain, while its rules change with government decisions. Exact timezone polygons would add an ODbL boundary dataset.
- The city/time-zone data can be bundled, but sorting clocks repeats current ordering games and a single conversion question uses the map weakly. Deferred implementation until a route/date-line action offers distinct, fair decisions with pinned time-zone rules. See the source review and decision log.

## Population Pyramid Sort optional age-band table — 19 November 2026

- Added a collapsed, keyboard-operable table disclosure to each anonymous profile. It exposes the same 17 male/female population-share cohorts as the bars, rounded to 0.1 percentage point, and keeps country names and the 65+ result hidden until checking. Sighted players can expand the same rounded cohort table exposed to screen readers; its effect on the silhouette-reading task remains a player-study question.
- Updated the game rules, source study, game audit, gap analysis and backlog. Browser checks cover table rows, answer-name hiding, keyboard activation, mobile touch, dark theme and no page-width overflow. Visual review: `artifacts/qa/product-quality/population-pyramid-cohort-table.png` and `population-pyramid-mobile-dark.png`.
- Typecheck, lint, production build/artifact validation (24 route snapshots, 21 sitemap URLs, 205 precached assets) and the focused Population Pyramid Playwright suite (2/2) passed. The game remains Free Play only and has not been deployed.

## Population Pyramid Sort target-reading hint — 19 November 2026

- Added a pre-answer instruction to combine the male and female shares in the four oldest bands, 65–69 through 80+, to estimate each profile's 65+ share. This makes the relationship between the chart and the named target explicit without revealing country identities or the checked 65+ result.
- Updated the rules, audit, gap analysis, backlog and source study. Focused browser assertions cover the hint before play on desktop and mobile; responsive inspection checks that the added copy does not cause page overflow. Player comprehension remains unmeasured.
- The game remains outside Daily and has not been deployed.

## Population Pyramid Sort table rounding clarification — 19 November 2026

- Direct Free Play revealed that the one-decimal age-band rows can sum to a different value than the displayed 65+ result because that result uses unrounded shares. The old screen-reader caption and supporting docs called the table values exact.
- Kept the one-decimal display and added a note beside the open table explaining the rounding; corrected the accessible chart caption and research/rules documentation. This clarifies the existing math without changing the ordering target, score or data.
- The focused production-preview test now asserts the rounding note on desktop and mobile and captures the open table in both layouts. Screenshots are retained at `artifacts/qa/product-quality/population-pyramid-cohort-table.png` and `population-pyramid-mobile-dark-table.png`; player comprehension of the note still needs independent review. The game remains Free Play only and has not been deployed.

## Reorder keyboard focus across three games — 19 November 2026

- A desktop keyboard check showed that moving a profile to the first position disabled the focused Earlier button and left focus on the page body. The same endpoint pattern existed in Latitude Ladder and Historical Geography sequence mode. A shared focus helper now follows each moved item and selects its opposite enabled control when the preferred direction becomes unavailable.
- Production-preview browser checks cover endpoint fallback and continued focus during an interior move in all three games. Lint, production build/artifact validation and the three relevant Playwright files passed (12/12). No scores, ordering rules, source data or Daily eligibility changed; no deployment occurred.

## Geography Connections Atlas 04 developer self-play — 19 November 2026

- A fixed-seed direct-play pass submitted Finland, France, Ireland and the Netherlands as euro-area members; Atlas 04 returned “No match.” The current official European Union list includes all four. An island-country guess returned “One away,” matching three countries in the authored “end in land” answer. Screenshots are retained in the [study evidence folder](research/competitive-landscape/STUDIES/evidence/).
- This indicated a possible exact alternate connection that the current known-fact audit does not cover; it is not independent-player evidence. Corrected Atlas 04's stale internal editorial note. No puzzle groups or gameplay rules changed. The first study update prioritized Atlas 04; a later whole-library scan expanded that list as recorded below.
- Focused Connections content validation passed (10/10).

## Geography Connections euro-area overlap audit — 19 November 2026

- Compared the 24 authored tile sets against the EU's current 21-country euro-area list: Atlas 02, 04, 13 and 23 contain exact unassigned euro-area quartets; Atlas 11 and 22 contain five members. Atlas 19 and 24 already use their matching four countries as an authored EEC-founding-state group. The official list includes Bulgaria as a euro-area member since 2026.
- Updated the editorial guide, game audit, backlog and blinded-study priorities. This extends the developer self-play lead; it does not establish player salience. No puzzle answers or audit behavior changed. Review the prioritized boards with independent players before edits.

## Geography Connections advisory fact audit — 19 November 2026

- Added the current EU euro-area list as a source-backed advisory fact set. The audit now reports exact and five-member matches separately from hard uniqueness failures, preserving the authored boards while making the review candidates visible.
- Added a regression check for the four exact candidates and two larger overlaps; the intended EEC-founding groups on Atlas 19 and 24 are not flagged. Focused Connections validation passed (11/11), lint passed, and production build/artifact validation passed (24 route snapshots, 21 sitemap URLs, 206 precached assets). Independent player review remains the gate before changing any answer group.

## Riverways trace visibility — 19 November 2026

- A direct Medium Free Play round showed that a short far-northern trace was difficult to inspect at world scale and moved out of view after a centre-anchored zoom. After dragging it back into view, the path measured about 10 × 1 pixels at 1.4× zoom. Two wrong guesses gave centre-distance/direction clues and then the Russia centre-country clue.
- Added a dark 5px casing under the orange 3px trace and told players they can drag to pan and use +/− to zoom. Answer pools, clue calculations, attempts and scoring remain unchanged. This is developer self-play, not the human comprehension study; the 6–8 participant review remains open.
- Production build and artifact validation, lint, and the focused Riverways/touch browser cases passed (2/2). The production-preview checks cover the line casing and core widths, decorative accessibility state, pan instruction, guess feedback, saved progress and mobile dark-mode play. No deployment occurred.

## Map Projection Match constant-heading course comparison — 19 November 2026

- Developer Free Play reached the constant-heading prompt and showed that the four map options contained only land and graticules; no course was drawn. NOAA's Office of Coast Survey and USGS state that a Mercator chart renders a constant-course rhumb line straight, though it is generally not the shortest route.
- Added the same amber route to all four map views for this task. The Mercator option keeps it straight while the other projections curve it, making the map comparison part of the decision. Accessible option descriptions report the same straight/curved distinction, and the prompt says the route is shared across the views.
- A geometry test verifies collinearity on Mercator and curvature on the other projections. Typecheck, lint and production build passed; the focused production-preview Playwright case passed (1/1). Desktop and 390px dark-mode screenshots are retained in `docs/research/competitive-landscape/STUDIES/evidence/`. This is a self-play-driven clarity change, not participant evidence; player comprehension and physical/assistive-technology review remain open. The game stays outside Daily; no deployment occurred.

## Participant availability checkpoint — 19 November 2026

- The user reports that no independent participants are available yet. Prepared study protocols remain unrun; do not treat developer self-play or static audits as participant evidence. Continue with useful source, content and implementation work that does not depend on recruitment.

## Watershed Match source-link and projected-extent audit — 19 November 2026

- Queried the three fixed boxes against the official USGS 2025 HUC12 collection. All 60 bundled `answerId` values match their source records' `ToHUC`; source/answer types remain `S`/`NM`, source sample labels match, and all 118 bundled names match current collection records. Added a read-only repeatable check at `npm run data:watersheds:audit`.
- Projected all 240 source/choice shape instances with the gameplay Albers USA fit. The smallest bounding-box width is 48.0 and the smallest height is 66.1 viewBox units; the smallest projected area is 1,198 viewBox². This is a static extent check, not evidence of responsive legibility or human fairness.
- No question or geometry changed. Manual name/decoy review and the 6–8 player first-read pilot remain open; no participants are available yet. Keep the prototype outside Daily and do not deploy it.
