# Maproom game audit

Audit started 18 November 2026 and updated 19 November across all fourteen integrated game implementations, shared components, data limits, browser checks and documented manual play. This is an engineering and interaction review, not a player study or formal assistive-technology audit.

## Game-by-game review

### Find the country

- **Gameplay, rules and balance:** Players identify the prompted country directly on the map; there is no search field. Daily is eight questions; practice has finite, timed or unlimited sets and optional subdivisions. Standard/Extended geography pools avoid forcing political territory expansion into every session.
- **Feedback and replay:** Correct/wrong map states, a flag beside the country name and local result recording make a short round legible. The question advances automatically after brief feedback; missed-country review gives the player a reason to revisit weak areas.
- **Visual, mobile and accessibility:** The map is the primary interaction, with pan/zoom, neutral styling for non-selectable countries and enlarged hit areas for eligible small islands. Keyboard focus/selection and touch map controls are covered by product tests; visible outlines and focus states remain available. Progress is shown as segments, and feedback includes both icon/state and a spoken status.
- **Performance and geographic accuracy:** Country data loads with the route and ADM1 files load only for selected supported countries. Country and territory identities are curated; generalized Natural Earth boundaries and disputed boundary conventions remain limitations.

### Country Outline Quiz

- **Gameplay, rules and balance:** The player identifies a silhouette with a difficulty-scaled guess budget. A curated outline eligibility audit avoids tiny or dispersed shapes that would make questions arbitrary; Standard/Extended practice settings are balanced.
- **Feedback and replay:** Distance/direction and later position hints make misses informative; the answer is revealed when attempts run out. Practice uses a seeded pool and avoids repeating eligible silhouettes before exhaustion.
- **Visual, mobile and accessibility:** The isolated shape is prominent, answer search has a labeled field, and Enter can accept a suggestion before submitting. The baseline browser run exposed an intermittent second-Enter submission failure; `AutocompleteInput` now explicitly submits after a suggestion was accepted, and its regression test passes.
- **Performance and geographic accuracy:** Detailed 1:10m geometry loads only in this game. It is still generalized, not a legal boundary layer; fair silhouettes are inherently unavailable for some geographic records.

### Border route

- **Gameplay, rules and balance:** Build a land path between fixed endpoints. Players add intermediate countries in any order; a reciprocal-neighbor graph and breadth-first search determine whether the full selected set can be arranged into one continuous route. Every selected country is used once in the displayed path. The shortest route remains the scoring target, while longer valid routes are allowed.
- **Feedback and replay:** A disconnected set stays editable and receives a clear status; a valid set immediately shows the geographically ordered path and completes the round. Results state the route's border count and, for longer paths, the extra stops versus the shortest route. Hints name a country on a shortest route. Seeded endpoint pairs allow repeatable daily play and varied practice.
- **Visual, mobile and accessibility:** A map-centered view is paired with a compact bottom input dock and removable selected-country chips. Labeled autocomplete and map controls support keyboard and touch; the displayed route communicates geographic order even when entry order differed.
- **Performance and geographic accuracy:** Uses the small country catalog and world geometry. Border answers follow reciprocal land neighbors; maritime borders and contested claims are not represented.

### Flag Match

- **Gameplay, rules and balance:** Country-to-flag and flag-to-country directions plus typed and multiple-choice modes create meaningful variation. Distractors prefer the same continent, keeping the task challenging without turning it into a visual-guess lottery.
- **Feedback and replay:** Optional progressive reveal and missed-flag review make practice useful; a selected wrong answer and the correct option receive distinct visual states. Resolved questions advance automatically after brief feedback. Daily remains curated to eight questions.
- **Visual, mobile and accessibility:** Bundled vector flags are crisp at small sizes and the composition has dedicated mobile layouts. Buttons and text modes provide keyboard-accessible alternatives to visual recognition. A keyboard review found native-disabled answers dropped focus during timed feedback; multiple-choice now keeps its focused answer slot through the next flag, typed mode retains focus on its read-only input, and a segmented progress bar announces the round position.
- **Performance and geographic accuracy:** Assets ship locally, so the game has no external flag-service dependency. The catalog intentionally excludes duplicate flags for special geographic records; current national flags remain subject to source/catalog conventions.

### Geography grid

- **Gameplay, rules and balance:** Nine intersections combine two country facts and require nine distinct answers. A runtime generator checks candidate counts and searches for a complete assignment, which prevents unsolvable boards. Free Play includes expanded geographic, demographic and political criteria; the curated Daily pool and its puzzle identity remain unchanged. Scarcity tiers reward narrower crossings without claiming to measure answer popularity.
- **Feedback and replay:** The selected crossing opens a focused answer popover showing possible-answer count. After an entry, each row and column criterion is marked as fitting or not fitting, and duplicate countries are identified. Replay advances to another practice set; Standard or Extended country eligibility is selectable in setup.
- **Visual, mobile and accessibility:** Compact cells and clue headers work in a responsive grid. Production-preview review at 320px and 390px found no horizontal overflow; clue labels wrap compactly, and the selected-square panel repeats the active clues at larger type. Text labels and keyboard-operable answer controls are necessary because color alone is not enough to identify a clue category. The board exposes table, row, header and cell semantics rather than promising an arrow-key grid interaction; its counter announces the full “n of 9 squares filled” phrase, and invalid-answer feedback has a single live alert in the selected-square panel.
- **Performance and geographic accuracy:** Generation uses the local country facts and rejects under/over-constrained boards. Population is a 2023 estimate, area follows the catalog, and capital-coordinate clues require known coordinates.

### Capitals & cities

- **Gameplay, rules and balance:** The game combines capital recall, city placement and city identification, with region, population and length controls in practice. These formats serve different skills rather than repeating one multiple-choice loop.
- **Feedback and replay:** Typed answers accept aliases; map placement scores by great-circle distance, and city identification limits choices to the marked city's country. Resolved questions advance automatically after brief feedback. Daily mixes six questions across the modes.
- **Visual, mobile and accessibility:** Map placement is the primary interaction; a compact map dock provides a marker action and coordinate entry in a collapsed secondary panel. Answer choices and text entry work with a keyboard. City suggestions collapse repeated normalized names within a country; country context and map markers remain important when place names repeat. Segmented progress and immediate map feedback clarify a round without a generic Next button.
- **Performance and geographic accuracy:** The city file is lazy-loaded. It is derived from GeoNames cities500 and is not exhaustive; national capital name/coordinate completeness varies by territory. Free Play city questions and identification choices omit historical, abandoned, destroyed and section records, while Daily keeps its established pool and generation path.

### Geography Connections

- **Gameplay, rules and balance:** Find four groups among sixteen countries. Difficulty changes category specificity, and generation checks for unique defensible groupings. Free Play setup now explains selecting countries in groups of four and the four-mistake limit before the player starts. This has stronger deduction than a plain country quiz.
- **Feedback and replay:** Solved rows explain their relationship; “one away” feedback helps without naming the missing members. Errors have a bounded cost and four mistakes end the board. Seeded practice provides new groupings.
- **Visual, mobile and accessibility:** The tile board is direct and touchable; explanatory group rows preserve the learning result. The selected-country count is announced as players choose tiles, and shared segmented progress tracks groups solved. Four columns compress on small screens, so the responsive two-column layout is important.
- **Performance and geographic accuracy:** Boards are generated from local country attributes with ambiguity checks. The current taxonomy groups countries, not cities or physical features, and depends on catalog facts such as subregion and borders.

### Higher or Lower

- **Gameplay, rules and balance:** Compare population, area or density. Standard and Close Calls change challenge; missing values are excluded rather than guessed. A streak bonus keeps repeated play engaging.
- **Feedback and replay:** The comparison appears after a choice with sourced values, and finite/unlimited modes give different session lengths. Results record completed rounds and score.
- **Visual, mobile and accessibility:** Two large country choices make the action clear. Keyboard choice, labels and responsive stacking support different input modes and narrow screens. During feedback, the chosen side stays focused through the reveal; the next comparison follows automatically after a short result pause.
- **Performance and geographic accuracy:** All facts are local and no extra map asset is required. Population is the World Bank 2023 observation, area is catalogued, and density is derived; the game should not imply those are live values.

### Neighbour Challenge

- **Gameplay, rules and balance:** Select the full reciprocal land-neighbor set. Minimum-neighbor practice makes the task less trivial; extra selections lose points, so players must balance recall with restraint.
- **Feedback and replay:** Checking reports matched, missed and extra counts, then names each matched, missed and extra country so the player can learn the set difference. Multiple rounds, continent scope and a timer create useful practice variety without changing the core rule.
- **Visual, mobile and accessibility:** Search chips and map selection provide complementary inputs. Neighbor labels and map feedback stay synchronized; text entry is important where the target has no map outline. Checking the complete set remains a deliberate game action, then the next target follows automatically after feedback. In timed Free Play, the countdown uses a quiet timer role; round score and untimed selection count remain announced separately.
- **Performance and geographic accuracy:** Uses the same small adjacency graph as Border Route. It intentionally omits maritime connections and does not decide disputed borders.

### Distance & Direction

- **Gameplay, rules and balance:** Compare cities by distance from an origin, latitude or signed longitude. Population thresholds and Close Calls tune the question set while preserving coordinate reasoning.
- **Feedback and replay:** The answer is hidden until a selection; feedback then reveals coordinates, distance and bearing. Streak scoring and finite/unlimited formats support repeat practice.
- **Visual, mobile and accessibility:** Large choice cards, keyboard selection and responsive stacking make the comparison usable without precision map input. The selected side and reveal state remain visible during brief feedback before the next pair appears automatically. Revealed coordinates use explicit N/S and E/W hemisphere cues. In timed Free Play, the countdown uses a quiet timer role outside the polite score/streak announcements.
- **Performance and geographic accuracy:** Loads an order-preserving subset of places with population at least 50,000 and uses a Haversine great-circle calculation. Free Play comparisons omit historical, abandoned, destroyed and section records; coverage and population thresholds still follow the GeoNames-derived bundled file.

### Riverways

- **Gameplay, rules and balance:** Identify a highlighted river from six distinct guesses. Free Play offers three pools by Natural Earth scale rank. A wrong answer compares the calculated centres of the guessed and highlighted generalized lines, rounded to the nearest 50 km with compass direction; this is not shortest-course distance. After two misses, the game adds the country containing the target line's calculated centre. A correct answer scores from 1,000 down to a 200-point floor.
- **Feedback and replay:** Each wrong river name yields a spatially meaningful distance and direction, while the second miss also adds a country clue. Repeated river guesses do not consume attempts. The correct river is revealed on the last miss, and Free Play replay advances a seeded shuffle before repeating a pool. An unfinished guess is saved for resumption.
- **Visual, mobile and accessibility:** The orange line is the visual puzzle; the accessible autocomplete provides a text answer path and the map has a descriptive name. Attempt count, guess feedback and completion are exposed as status text. The map itself is not a separately navigable river-line control; screen-reader players use the name-entry path.
- **Performance and geographic accuracy:** The 148-feature optional data file loads only when Riverways opens. Natural Earth centerlines are generalized named features, not a complete hydrology or navigation layer; aliases and center-point country hints can be incomplete.

### Latitude Ladder

- **Gameplay, rules and balance:** Order five cities north–south or west–east, with the axis selected in Free Play setup. Each city in its exact position earns 200 points. The pool can be global or continental and uses places with population of at least 100,000.
- **Feedback and replay:** Every round scores against the correct positions, then shows signed coordinates and all five map locations. Free Play replay samples a new seeded city order, and the current order and scope are resumable.
- **Visual, mobile and accessibility:** Dedicated earlier/later buttons make reordering operable with touch and keyboard without drag. Each control names its city and direction; the ordered list and check result are available as text. The result map supplements the coordinate reveal.
- **Performance and geographic accuracy:** Loads the 12,405-record major-city subset rather than the full 34,456-place gazetteer. Coverage derives from GeoNames cities500, filtered to the population floor; it is not a complete city register.

### When Was This Map? — Historical Geography

- **Gameplay, rules and balance:** Enter the year shown by a large, unlabeled political map. Easy/Medium/Hard use inclusive tolerances of 100/50/25 years. The accepted interval appears in the result, and a linear distance score gives 1,000 at the exact year and zero at twice the tolerance. A seeded shuffle shows every map once before wrapping; the current pack contains 20 distinct years from 1886 to 2011.
- **Feedback and replay:** Submission reveals the year, signed distance in years, whether the guess was within range, a short historical note and expandable citations and license terms. The shared results dialog records the score; replay advances to another map and session progress is stored through the existing local session service.
- **Visual, mobile and accessibility:** The year input is labeled and keyboard-submittable; the map has alternative text, status text, visible focus styles and a responsive entry layout. Reveal and map transitions honor reduced-motion preference. Dark theme changes the surrounding controls and panels; the generated map itself remains a warm paper palette in both themes. No physical-device or formal assistive-technology review has yet been performed.
- **Performance and geographic accuracy:** The game lazily loads one manifest and only the current local SVG; successful `/data/` requests use the existing service-worker cache for later offline use. CShapes 2.1 gives generalized international boundaries and dependent territories, not subnational geography, every front line or a complete record of contested/de facto borders. Every displayed year is a 31 December snapshot, not an archival publication date. The data and derived maps are CC BY-NC-SA 4.0: noncommercial use only, attribution and ShareAlike required. Unit, browser, production-artifact and offline checks cover tolerance boundaries, deterministic variety, source disclosure, manifest completeness and asset hashes.

### Map Projection Match

- **Gameplay, rules and balance:** Four task prompts ask players to choose between Equal Earth, Mercator, Equirectangular and Orthographic. Each four-question Free Play set uses every projection once in a seeded order, earns 250 points per correct answer, and stays outside Daily while prompt clarity and difficulty are evaluated.
- **Feedback and replay:** Checking a choice names the best-matching projection and explains its defining property and a material tradeoff. The next task advances explicitly; answers and the current task are saved for resumption, and replay shuffles the four tasks for a new set.
- **Visual, mobile and accessibility:** Each option is a keyboard-operable button containing a small rendered world map and graticule. The four-up desktop layout becomes a two-by-two grid on narrow screens. Option letters remain available before selection; projection names and correct/incorrect states appear after checking. Focus moves to the feedback and next task; production-preview checks cover keyboard selection, 390px touch play and overflow. Broader screen-reader and assistive-technology review remains outstanding.
- **Performance and geographic accuracy:** The four projections use the bundled Natural Earth country geometry and the existing `d3-geo` dependency; no additional data service or asset is needed. Each projection preserves different properties and none preserves every property of a globe. The simplified prompts describe common use cases, not universal best-projection rules.

## Shared findings and changes from this mission

- The original ten games already used shared session/result paths, reusable settings, local persistence and a curated daily allowlist. Riverways, Latitude Ladder, Historical Geography and Map Projection Match keep those boundaries through independent puzzle modules rather than a universal game engine.
- Game metadata and setup formats now live in one catalog, while a separate exhaustive lazy component registry owns the UI imports. Adding a Free Play game can no longer require editing unrelated navigation switches and the registry is checked against the stable ID union.
- The baseline browser suite found the autocomplete Enter edge case in Country Outlines. The shared input now remembers an accepted label and submits on the next Enter, preserving the familiar two-step keyboard action. Targeted regression tests cover it.
- Interactive country maps now expose a single Tab stop. Arrow keys move focus to the nearest country in that screen direction; Enter and Space select it, and Home/End move to the first/last country. An associated instruction gives these controls to assistive technology. Keyboard selection and the one-stop tab order have browser coverage.
- Game metadata records whether a game needs world boundary geometry. Flags, Geography Grid, Connections, Higher or Lower, and Distance & Direction skip the unused 1:50m world map. Playwright resource checks confirm those routes omit both the 2.33 MB local GeoJSON response and the map-only `d3-geo` chunk.
- Shared answer autocomplete now exposes the editable combobox/listbox pattern. Focus stays in the input while `aria-activedescendant` tracks the arrow-key selection; suggestion rows do not add Tab stops, and Escape closes the popup. Mouse selection and the existing two-Enter outline flow remain covered.
- The existing uncommitted setup overlay and route-transition work was preserved. Riverways and Latitude Ladder use its shared settings portal and keep their own game-specific controls.
- This review found a data-eligibility issue across the three city-oriented Free Play games: GeoNames section and non-current-place records could appear as whole current settlements. A shared feature-code filter now excludes those records from Capitals & cities, Distance & Direction and Latitude Ladder Free Play pools while preserving the six-game Daily generation path. Their remaining limits—catalog coverage, generalized boundaries, source years and taxonomy—are recorded above and in the data documentation.

## Follow-up priorities

1. Run moderated play sessions for Geography Grid, Geography Connections, Riverways and Latitude Ladder to measure first-read clarity, difficulty and replay interest; existing self-play is not independent player evidence.
2. Continue assistive-technology review, especially the final spoken casing of the Grid counter and screen-reader operation of map-heavy games. Voice control, braille, human listening and other assistive technologies remain untested.
3. Measure cold-load, storage and touch behavior on physical mobile devices and on a hosted connection; current performance evidence is local Chromium evidence.
4. Revisit country population questions only when a new, versioned source year is deliberately adopted. Keep speculative physical-geography concepts conditional on data, license and pedagogical review.

## Integration verification

Historical Geography is registered in the shared catalog and lazy component registry, linked as a secondary Explore collection, available by direct route, and explicitly excluded from Daily with a review reason. Riverways and Latitude Ladder are eligible in Daily. The eight-game allowlist remains explicit; Connections, Higher or Lower, Neighbour Challenge, Distance & Direction, and Historical Geography remain excluded. See [the integration report](parallel-development/INTEGRATION_REPORT.md) for final integrated checks, host routing behavior and test evidence.
