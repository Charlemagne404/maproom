# Mechanic library

Patterns distilled from the dated studies in [Deep dives](DEEP_DIVES/README.md). These are general design ideas, not instructions to reproduce another game's exact interface, clues, scoring, or content.

| Pattern | Where it appeared | Why it can work | Maproom use and guardrail |
| --- | --- | --- | --- |
| Progressive geographic feedback | Worldle, Flagle, Globle; varying levels in Country Outlines | A miss can still narrow the search and help a player form the next decision. | Riverways now reports the guessed line centre's distance and direction from the target centre, then gives a target-centre country after two misses. Label the measurement as centre-to-centre, not nearest river distance. |
| Route validity with quality feedback | Travle; related route modes in Geocore | Accepting multiple valid paths respects player reasoning; separately communicating optimality keeps challenge intact. | Preserve Border Route's arbitrary-order intermediate entry and distinguish a valid route from the shortest route. Do not require one memorized click sequence. |
| Intersecting criteria and rare answers | Teuteuf GeoGrid; Geocore grid/metric families | A board creates a compact set of choices in which each answer is constrained by two facts. | Geography Grid already has nine distinct answers and candidate-count feedback. Improve clue variety only when categories have clear definitions and data coverage. |
| Irreversible one-to-one allocation | Geozee | Every choice consumes a category that might fit a later answer, creating a visible planning trade-off; a best-allocation reveal can explain opportunity cost. | This tests one-to-one planning; Geography Grid tests two-clue intersections. Consider a separate strategy format if player evidence supports it; show formulas before commitment and keep the result total consistent with the displayed placements. |
| Carefully authored grouping and decoys | GeoConnections; official references to NYT Connections | A credible alternate quartet can feel unfair; good decoys share surface features without forming a second defensible solution. | Retain Maproom's fixed authored boards and fact audit. A slow audit is a tooling issue, not grounds for weakening the puzzle rule. |
| More than one input for the same knowledge | Geocore's typing, click, identification, pin, shape, estimate and sequence modes | Alternate inputs test different skills and can reach players who struggle with one interaction. | Add a format only when it changes the knowledge task; coordinates should remain secondary in city play. Keep keyboard and touch paths equivalent. |
| Spatial estimate, then reveal | TimeGuessr, WhenTaken and WhereTaken official play instructions | A player makes a commitment before seeing the ground truth, so the reveal can teach scale and location. | Existing Capitals & Cities placement and Distance & Direction already use estimates. Photo variants would add rights, attribution, storage and consent work. |
| Timed recall with visible coverage | Sporcle, Seterra, World Geography Games | A large set turns repeated answers into a personal knowledge benchmark. | Use only for explicit speed modes. Do not make speed the default for map games or imply that a timed percentage is geographic understanding. |
| Iterative ranking with positional partial credit | Worldly Rankings; Geocore Rank It | Each guess can preserve known placements while exposing which positions still need reconsideration. | Latitude Ladder and Population Pyramid Sort already compare ordered answers. Before adding multiple guesses or guess history, collect player evidence and ensure the feedback is available to keyboard and assistive-technology users. |
| Chronological comparison | Historicale and TimeGuessr | Placing evidence in time invites comparison; precise feedback can explain why two events are ordered. | Historical Geography should remain curated and should label reconstructions separately from archival photographs or maps. |
| Replay through curated variation | Travle daily/archive, Historicale's two modes, GeoGuessr's daily surface | A repeatable daily challenge and a broader practice path serve different needs. | Preserve deterministic Daily identities; let practice vary without changing an active or completed Daily answer. |
| Show the rule before the first decision | Geocore's per-mode tutorials; Maproom's setup summaries | The player can decide whether they understand the task before committing. | Keep current Free Play summaries and expose any new clue/scoring rule at the game, not only in settings. |

## Product principles

1. Feedback should correspond to a property the game actually measured.
2. A hint should narrow the problem without changing answer validity.
3. Multiple valid routes or classifications should remain valid unless the rule explicitly asks for one exact answer.
4. Variation should test a different skill, not simply rename an existing mode.
5. A reveal should explain the answer and its limitations, especially when data is generalized or dated.
6. The easiest input path should still be accessible by keyboard and touch.
