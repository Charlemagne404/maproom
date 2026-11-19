# Maproom gap analysis

This comparison builds on the fifteen-game [engineering audit](../../GAME_AUDIT.md), the existing [research notes](../../GAME_RESEARCH.md), and the public-play studies in this folder. It is not a player study. Browser self-play verifies that a flow works; it cannot establish that players find it fun or fair.

## Current strengths

- Maproom already spans map selection, silhouettes, flags, route construction, grids, grouped logic, city placement, comparisons, river traces, ordering, historical maps and projection tradeoffs.
- Daily puzzle identity, Free Play settings, saved sessions, offline data and reusable result flows are established.
- Country Outlines already gives distance, direction and later regional clues. Latitude Ladder has accessible move controls and a post-submit map/coordinate reveal.
- Population Pyramid Sort adds demographic data interpretation through comparable, mirrored cohort profiles; its visual readability and reveal value still need player evidence.
- Geography Grid rejects unsolvable boards. Geography Connections keeps its 24 boards authored, seeded and uniqueness-audited rather than inventing arbitrary category combinations at runtime.
- Keyboard, touch, mobile layouts, dark theme and browser accessibility coverage have accumulated. The current browser baseline passed 87/87 tests; physical-device and human play evidence still matter.

## Game-by-game comparison

| Maproom game | Existing strength | Highest-value gap to investigate | Current disposition |
| --- | --- | --- | --- |
| Find the country | Quick map-selection round, region modes, missed-country review. | Compare the one-click loop with a slower spatial-reasoning practice option without slowing Daily. | **Optional Free Play prototype implemented:** four map guesses with rounded centre-distance and direction feedback; one-click default and Daily unchanged. Player clarity and round-length comparison remains open. |
| Country Outlines | Fairness-screened silhouettes, rotating option, distance/direction, progressive region hints. | Perceived difficulty can differ from data-derived difficulty; collect completion/attempt data in moderated play. | Offline 12-item pilot instrument and counterbalanced protocol ready; collect 6–12 player sessions before changing tiers. No human evidence yet. |
| Border Route | Accepts intermediate entries in any order and validates a complete border path. | Check whether players understand route length compared with the shortest benchmark. | **Implemented:** results state both border counts and any extra stops; player comprehension remains unmeasured. |
| Flag Study | Text and choice formats, progressive reveal option, missed-flag review. | Validate whether tile-by-tile reveal meaningfully changes recognition difficulty across flag designs. | Backlog/research. |
| Geography Grid | Nine two-criterion intersections, solvable generation, count and duplicate feedback. | Learn whether more clue-pair variety improves perceived replay without making rounds harder to parse. | **Generator-level change:** Free Play now yields 371 distinct row/column pairs in 240 boards; human repetition and difficulty remain unmeasured. |
| Capitals & Cities | Typing, identification and marker placement; distance-based scoring. | Make marker-first play a deliberate format with a clear pin action and a calibrated reveal, while keeping coordinate entry secondary. | Existing marker interaction is in place; gather user evidence before a new format. |
| Geography Connections | Authored country groups, four-mistake limit, one-away feedback, solved explanations. | Measure whether the authored categories feel fair and their difficulty tiers match first-read play. | Static audit and content repair: no exact quartet repeats within a tier; three cross-tier repeats remain for four-member source facts. Larger finite memberships use explicit “among” labels. A [blinded review protocol](STUDIES/connections-content-review.md) is ready; human difficulty and decoy review remains open. |
| Higher or Lower | Population, area and density comparison with close calls and streaks. | Explore sourceable metrics and confidence estimates; avoid mixing incomparable years or vague rankings. | **Implemented in Free Play:** 2023 WDI life expectancy at birth is explicit in years, uses its own absolute-gap tiers, and has no fallback; Daily remains unchanged. |
| Neighbour Challenge | Select the complete reciprocal land-neighbor set. | Check whether named set-difference feedback helps players correct a later attempt. | **Implemented:** results name matched, missed and extra countries; player learning remains unmeasured. |
| Distance & Direction | City comparisons support distance, latitude and longitude reasoning. | Validate generated difficulty and completion with players, then tune from observed answer patterns while preserving the two-choice input. | **Generator calibration implemented:** Close coordinate gaps are now bounded below 4°, unique question keys include the origin, and short decks are disclosed. Human completion and answer performance remain open. |
| Riverways | Trace a generalized watercourse and name it; local data and replay. | Learn whether the disclosed generalized-line clue helps without implying shortest-course distance. | **Implemented and data-audited:** the current clue uniquely identifies 77.5% of exhaustive Hard-pool first-miss cases; first-read comprehension and perceived fairness remain unmeasured. See the [feedback audit](STUDIES/riverways-feedback-audit.md). |
| Latitude Ladder | Reorder cities on either axis; exact-position score and post-submit map. | Test whether difficulty should be controlled by regional scope or by city spacing, using players rather than arbitrary labels. | Backlog. |
| Historical Geography | Curated dated boundary reconstructions, citations and explicit license disclosure. | Test whether players can order visually distinct snapshots and learn from the timeline reveal. | **Free Play prototype:** six seeded three-map sequences use existing snapshots at least 22 years apart, Earlier/Later controls and a sourced chronological reveal. Visual differences were screened from the bundled maps; player clarity remains unmeasured and Daily stays unchanged. |
| Map Projection Match | Four rendered world projections tied to concrete mapping tasks, with a property and tradeoff reveal. | Check whether people can recognize the purpose of each projection from the map and concise task text. | **Implemented:** four seeded Free Play tasks use bundled geometry and D3; comprehension and difficulty remain unmeasured. |
| Population Pyramid Sort | Three anonymous cohort profiles are ordered by the share aged 65+, with narrower pair gaps across five rounds. | Check whether players can infer the 65+ ordering from the full silhouette and whether the answer reveal makes the demographic comparison satisfying. | **Implemented:** 194 2023 WDI profiles, pairwise scoring, save/restore, and offline support; human clarity, pacing and visible-reveal needs remain unmeasured. |

## First improvement: Riverways feedback

**Problem.** A player could enter an unrelated river and receive generic wrong-answer feedback. A geography game should turn a miss into a useful next decision.

**Evidence.** A live Worldle round returned a distance and direction after a miss; Flagle also exposed proximity-style feedback. In the Maproom baseline, Riverways had six attempts but its late clue was not a usable spatial comparison between the submitted river and the target.

**Change.** Compare the great-circle positions of the two calculated line centres. Round the distance to 50 km and report a compass direction except when the centres are within 25 km. On the second miss, add the country containing the target line centre. The interface states that this is centre-to-centre distance, not the shortest distance between two river courses.

**Geographic guardrail.** Natural Earth river centerlines are generalized. A multi-segment feature's calculated centre is a compact clue point; it does not represent the source, mouth, nearest point, flow direction, or true hydrographic network. The target-centre country is located against the same bundled generalized country geometry. This clue is intentionally modest and disclosed in the game copy.

**Validation.** Unit tests cover direction, 50 km rounding, close centres, country containment, and all 134 authored river questions. A production-preview browser test submits two distinct wrong rivers, verifies both feedback steps, reloads the saved round, and completes it. Physical-device, assistive-technology and player-preference tests remain outstanding.

**Signal audit (19 November 2026).** Exhaustive comparison of bundled clue signatures shows that the current 50 km/eight-way setting is highly discriminating, while coarser alternatives leave more candidate rivers after the first miss. The audit does not model player comprehension or guessing. No tuning decision is justified without the moderated sessions in the [study note](STUDIES/riverways-feedback-audit.md).

## Follow-up improvements

### Border Route result comparison

The existing game accepted longer valid routes and scored their extra borders, but the results dialog showed only the path and points. It now states the chosen border count and shortest-path count, including how many additional intermediate stops the route used. Tests cover the shortest wording, a valid longer route on a graph fixture, the existing shortest-route score, and its production-preview results.

### Neighbour Challenge set-difference feedback

The old check state reported how many neighbors matched, were missed, or were extra, then hid the selected set. It showed the full correct list but did not identify which names belonged in the missed and incorrect counts. Results now list the found, missed and extra countries explicitly. The browser regression submits one missing neighbor and one valid non-neighbor, verifies both names, then completes the remaining four exact rounds. This confirms the feedback flow, not that players remember the correction later.

### Map Projection Match

Map Projection Match adds a visual map-reading action that was missing from the existing library: choose a projection from four rendered options based on a practical mapping task. A four-question seeded Free Play set covers Equal Earth, Mercator, Equirectangular and Orthographic once each. The prompt copy follows USGS guidance about projection properties and limitations; no flat map is presented as preserving every property. The maps use bundled Natural Earth geometry and `d3-geo`, with no new external data. The game stays outside Daily. Unit and production-preview browser checks verify task variety, feedback, saved progress, completion and replay; human understanding remains unmeasured.

### Find the country multi-guess practice

**Problem.** Find the country asked the player to select the named country once. An incorrect click ended that question immediately, leaving no spatial decision for the next attempt.

**Evidence.** In a live Worldle sample, an incorrect guess returned distance and direction. The displayed percentage could not be interpreted, so it was not reused. This supports adding a concrete next-step clue while keeping Maproom's map selection as the primary action.

**Change.** Free Play can opt into four map guesses for country scopes. Each miss marks the guessed country and reports approximate catalog-centre distance rounded to 50 km plus direction from that country to the target. Correct answers earn 100/75/50/25 points by attempt; four misses reveal the answer. The fast one-click default, Daily questions and subdivision practice remain unchanged. No proximity percentage is shown.

**Validation.** Unit tests cover distance rounding, direction, missing coordinate fallback and attempt scoring. Production-preview browser checks complete a two-guess answer and a four-miss round, confirm the question remains active after early misses, and check the mobile layout and dark theme. Existing one-click gameplay and focus tests also pass. The screenshot of the first-miss feedback is stored at `artifacts/qa/product-quality/find-country-multi-guess-first-miss.png`. These checks establish flow and presentation, not that players enjoy the slower mode or understand the clue; compare both modes in player sessions before any Daily change.
