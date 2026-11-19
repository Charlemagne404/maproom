# Maproom gap analysis

This comparison builds on the dated thirteen-game [engineering audit](../../GAME_AUDIT.md), the existing [research notes](../../GAME_RESEARCH.md), and the public-play studies in this folder. It is not a player study. Browser self-play verifies that a flow works; it cannot establish that players find it fun or fair.

## Current strengths

- Maproom already spans map selection, silhouettes, flags, route construction, grids, grouped logic, city placement, comparisons, river traces, ordering and historical maps.
- Daily puzzle identity, Free Play settings, saved sessions, offline data and reusable result flows are established.
- Country Outlines already gives distance, direction and later regional clues. Latitude Ladder has accessible move controls and a post-submit map/coordinate reveal.
- Geography Grid rejects unsolvable boards. Geography Connections keeps its 24 boards authored, seeded and uniqueness-audited rather than inventing arbitrary category combinations at runtime.
- Keyboard, touch, mobile layouts, dark theme and browser accessibility coverage have accumulated. The current browser baseline passed 87/87 tests; physical-device and human play evidence still matter.

## Game-by-game comparison

| Maproom game | Existing strength | Highest-value gap to investigate | Current disposition |
| --- | --- | --- | --- |
| Find the country | Quick map-selection round, region modes, missed-country review. | One wrong click resolves the question; test whether an optional multi-guess mode would add useful reasoning without slowing Daily. | Backlog; don't change default one-click Daily flow without player evidence. |
| Country Outlines | Fairness-screened silhouettes, rotating option, distance/direction, progressive region hints. | Perceived difficulty can differ from data-derived difficulty; collect completion/attempt data in moderated play. | User research. |
| Border Route | Accepts intermediate entries in any order and validates a complete border path. | Distinguish valid longer routes from shortest-route performance in the explanation and score. | Existing behavior is strong; inspect with players before changing score. |
| Flag Study | Text and choice formats, progressive reveal option, missed-flag review. | Validate whether tile-by-tile reveal meaningfully changes recognition difficulty across flag designs. | Backlog/research. |
| Geography Grid | Nine two-criterion intersections, solvable generation, count and duplicate feedback. | Expand category variety only with explicit rule definitions and source-backed coverage; current first-read and 240-board selector issues were already addressed. | Top research priority after Riverways. |
| Capitals & Cities | Typing, identification and marker placement; distance-based scoring. | Make marker-first play a deliberate format with a clear pin action and a calibrated reveal, while keeping coordinate entry secondary. | Existing marker interaction is in place; gather user evidence before a new format. |
| Geography Connections | Authored country groups, four-mistake limit, one-away feedback, solved explanations. | Preserve authorship and standards while making test-time ambiguity audits cheap enough for regular content work. | Audit optimization implemented; no board content changed. |
| Higher or Lower | Population, area and density comparison with close calls and streaks. | Explore sourceable metrics and confidence estimates; avoid mixing incomparable years or vague rankings. | Research; no data expansion approved. |
| Neighbour Challenge | Select the complete reciprocal land-neighbor set. | Improve learning from missing/extra selections while keeping full-set recall distinct from a route task. | Backlog. |
| Distance & Direction | City comparisons support distance, latitude and longitude reasoning. | Improve difficulty calibration and reveal interpretation without replacing the core choice interaction with coordinates. | Backlog. |
| Riverways | Trace a generalized watercourse and name it; local data and replay. | Before this review, wrong guesses gave little information until a late location clue. | **Implemented:** line-centre distance/direction on each miss, plus target-centre country after two misses. |
| Latitude Ladder | Reorder cities on either axis; exact-position score and post-submit map. | Test whether difficulty should be controlled by regional scope or by city spacing, using players rather than arbitrary labels. | Backlog. |
| Historical Geography | Curated dated boundary reconstructions, citations and explicit license disclosure. | Present a stronger secondary timeline/sequence challenge only if the underlying dated maps can be compared fairly. | Research; stays outside Daily. |

## First improvement: Riverways feedback

**Problem.** A player could enter an unrelated river and receive generic wrong-answer feedback. A geography game should turn a miss into a useful next decision.

**Evidence.** A live Worldle round returned a distance and direction after a miss; Flagle also exposed proximity-style feedback. In the Maproom baseline, Riverways had six attempts but its late clue was not a usable spatial comparison between the submitted river and the target.

**Change.** Compare the great-circle positions of the two calculated line centres. Round the distance to 50 km and report a compass direction except when the centres are within 25 km. On the second miss, add the country containing the target line centre. The interface states that this is centre-to-centre distance, not the shortest distance between two river courses.

**Geographic guardrail.** Natural Earth river centerlines are generalized. A multi-segment feature's calculated centre is a compact clue point; it does not represent the source, mouth, nearest point, flow direction, or true hydrographic network. The target-centre country is located against the same bundled generalized country geometry. This clue is intentionally modest and disclosed in the game copy.

**Validation.** Unit tests cover direction, 50 km rounding, close centres, country containment, and all 134 authored river questions. A production-preview browser test submits two distinct wrong rivers, verifies both feedback steps, reloads the saved round, and completes it. Physical-device, assistive-technology and player-preference tests remain outstanding.
