# Country Outlines difficulty study

**Status:** protocol prepared; no participants or response data collected. Do not change the curated tiers from this document alone.

## Question

Do players experience the current Easy, Medium and Hard silhouette samples in the expected order, and are any targets unexpectedly ambiguous or unfamiliar?

The study begins with uncued shape recognition. It measures the outline signal without the game's distance, direction and regional clues. It cannot, by itself, validate the full game loop or its attempt budgets. If the uncued sample exposes a tier reversal, follow with a second round in the actual game before changing tiers or thresholds.

## Pilot plan

- Recruit 6–12 casual geography-game players. Treat the pilot as descriptive; it is too small for significance claims or population estimates.
- Give a neutral prompt: “Name the country shown by each outline. You have one answer per map. You will see the answers after all twelve.” Do not show tier names, hints or feedback while answers are in progress.
- Use the Standard pool, World scope, unrotated standalone silhouettes, and the same fitted 2:1 game viewBox for all items. Preserve the app's outline geometry and do not add labels, borders, flags or neighbouring-country context.
- Assign participants in rotation to orders A, B and C. Keep the target names and tier labels out of the participant view. Do not permit browsing or answer lookups during the twelve items.
- Record an anonymous participant code only. Do not collect names, contact details, precise location, audio or video. Participation is voluntary; stop if a participant wants to stop.

## Fixed sample

The sample contains one target from each of four broad regions in each tier. It is balanced for a small pilot, not representative of every outline type or geography.

| Current tier (moderator only) | Asia | Africa | North America | Oceania |
| --- | --- | --- | --- | --- |
| Easy | AFG · Afghanistan | DZA · Algeria | CUB · Cuba | AUS · Australia |
| Medium | ARM · Armenia | AGO · Angola | BLZ · Belize | PNG · Papua New Guinea |
| Hard | BHR · Bahrain | DJI · Djibouti | BRB · Barbados | SLB · Solomon Islands |

Each code is in the current Standard outline pool, has detailed bundled geometry, and is curated in the matching tier by `src/games/outlines/playability.mjs`. The sample deliberately includes islands and compact shapes in the harder tier, so their response pattern should be reviewed separately from familiarity.

## Counterbalanced orders

Use the assigned order exactly. Each order rotates the same twelve targets so no tier or listed region consistently occupies the same early position.

- **A:** AFG, AGO, BHR, CUB, BLZ, DJI, AUS, PNG, SLB, DZA, ARM, BRB
- **B:** BLZ, DJI, AUS, PNG, SLB, DZA, ARM, BRB, AFG, AGO, BHR, CUB
- **C:** SLB, DZA, ARM, BRB, AFG, AGO, BHR, CUB, BLZ, DJI, AUS, PNG

## Recording sheet

Use one row per target. Record the first answer only; accept recognized country names and common spelling variants. Measure elapsed time from the silhouette appearing to the first submitted answer. After locking that answer, ask the participant to rate confidence and prior outline familiarity before continuing; show no correctness feedback until all twelve answers have been recorded.

| Participant | Order | Item position | Target code (moderator) | First answer | Correct (0/1) | Seconds | Confidence (1–5) | Familiarity before study (1–5) |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | ---: |
| P__ | A/B/C | 1–12 |  |  |  |  |  |  |

At the end, reveal the answers and ask one open question: “Which outlines felt unclear or unfair, and what made them difficult?” Record a short anonymized note without identifying details.

## Readout and decision rule

For each tier, report first-answer accuracy out of 4, median response time, median confidence, and the target-level results. Show participant counts and raw denominators. Keep familiarity visible alongside outcomes; do not treat a familiar outline as proof that the shape itself is easy.

Look for repeated reversals rather than one miss. A tier deserves review if at least two targets in it are repeatedly easier or harder than targets in an adjacent tier, or if participants independently flag the same outline as ambiguous. Inspect the geometry and the full hint/attempt loop before changing a tier. Do not infer an optimal difficulty threshold, statistical fairness, or global player performance from this pilot.

## Remaining work

The [offline stimulus and capture tool](country-outlines-difficulty.html) embeds the twelve reviewed Natural Earth outlines, presents the assigned counterbalanced order, keeps answers and tiers hidden until the final item, and downloads the completed responses as CSV. Rebuild it after a sample or source change with `node scripts/research/build-country-outline-study.mjs`. It uses no network, analytics, cookies or browser storage; downloading the CSV is an explicit facilitator action.

The actual player sessions remain outstanding. No threshold change is approved.
