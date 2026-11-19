# Maproom expansion mission progress

Updated 18 November 2026. All changes remain local. No remote push, deployment, publishing, infrastructure or production-data action was performed.

## Baseline and preserved workspace

- Repository: `/home/charlie/maproom`, branch `codex/maproom-daily-gameplay-corrections`.
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
