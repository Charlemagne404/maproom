# Daily System contract

## Date and schedule identity

`getDailyGameLineup` accepts one `YYYY-MM-DD` civil-date key. `DailyPage` continues to obtain that key from `usePuzzleDate(state.settings.timeZone)`, preserving the app's existing configured-timezone boundary and result-history key. Once the date string is produced, selection depends only on that key, the explicit eligibility list, and `DAILY_SCHEDULE_VERSION`; the timezone, player history, settings, random call order, and device are not selector inputs. The same key and schedule version therefore produce the same lineup for every player.

The schedule epoch is `2026-01-01`. Dates are treated as UTC calendar days for arithmetic, avoiding daylight-saving transitions. The timezone is used only by the existing date hook to decide which civil-date key is current.

## Rotation algorithm

The selector enumerates every six-game subset of the eligible pool once. A deterministic greedy ordering prioritizes short same-game runs, recent game exposure balance, lower overlap with yesterday's lineup, and less-repeated game pairs. A stable FNV-1a hash provides the final tie-break. The ordered subsets form a cycle; dates advance one subset at a time. This guarantees six distinct games per date, no exact lineup repeats inside a complete cycle, and mathematically equal exposure over that cycle. A second date-keyed hash shuffles the six card positions so alphabetical or registry order does not privilege the same game each day.

The current eight-game pool has `C(8, 6) = 28` lineups. Every lineup appears once per 28-day cycle and every eligible game appears 21 times. Over the 365 days from the schedule epoch, each game appears 273 or 274 times. A one-year distribution test checks this, as well as adjacent dates, duplicate IDs, and lineup recurrence.

The first full balancing window, in display order:

```text
2026-01-01  cities, countries, outlines, flags, routes, grid
2026-01-02  grid, outlines, latitude-ladder, rivers, flags, cities
2026-01-03  grid, cities, routes, rivers, countries, latitude-ladder
2026-01-04  outlines, latitude-ladder, flags, countries, routes, rivers
2026-01-05  cities, outlines, routes, latitude-ladder, grid, countries
2026-01-06  cities, countries, outlines, rivers, grid, flags
2026-01-07  flags, grid, cities, routes, rivers, latitude-ladder
2026-01-08  routes, grid, rivers, outlines, latitude-ladder, countries
2026-01-09  latitude-ladder, flags, countries, cities, outlines, routes
2026-01-10  rivers, latitude-ladder, cities, grid, flags, countries
2026-01-11  outlines, grid, routes, rivers, cities, flags
2026-01-12  outlines, rivers, flags, grid, latitude-ladder, countries
2026-01-13  cities, outlines, latitude-ladder, countries, routes, rivers
2026-01-14  countries, cities, flags, latitude-ladder, grid, routes
2026-01-15  countries, rivers, routes, cities, flags, outlines
2026-01-16  routes, flags, rivers, grid, latitude-ladder, outlines
2026-01-17  countries, cities, grid, outlines, latitude-ladder, rivers
2026-01-18  grid, cities, flags, routes, latitude-ladder, outlines
2026-01-19  cities, countries, rivers, routes, grid, flags
2026-01-20  routes, flags, cities, outlines, rivers, latitude-ladder
2026-01-21  outlines, routes, latitude-ladder, grid, flags, countries
2026-01-22  routes, rivers, countries, cities, grid, outlines
2026-01-23  grid, latitude-ladder, flags, cities, outlines, countries
2026-01-24  rivers, countries, cities, routes, latitude-ladder, flags
2026-01-25  rivers, cities, routes, latitude-ladder, grid, outlines
2026-01-26  flags, countries, outlines, routes, grid, rivers
2026-01-27  flags, cities, latitude-ladder, outlines, rivers, countries
2026-01-28  flags, grid, countries, latitude-ladder, routes, rivers
```

When the eligibility pool changes or the ordering algorithm changes, bump the schedule version and rerun the distribution analysis. Unknown game IDs are ineligible unless a reviewed eligibility entry opts them in. Historical Geography is not registered here and therefore remains excluded by default.

## Eligibility review

Eligible: Countries, Outlines, Border Route, Flag Study, Geography Grid, Capitals & Cities, Riverways, and Latitude Ladder. These use date-seeded or date-derived puzzle generation, reviewed or stable content pools, daily scoring/completion, and save their active daily progress.

Excluded: Geography Connections, Higher or Lower, Neighbour Challenge, and Distance & Direction. Their current generators are deterministic, but their active answer state is not persisted between visits. Adding them requires daily progress restoration before eligibility is enabled.

The eligibility list is separate from the game catalog. Adding a game to Explore does not opt it into the rotation. A future game can declare `eligible: false` with a review reason, then be explicitly enabled after deterministic generation, content variety, scoring, completion, and progress restoration pass review.

### Historical Geography contract

The proposed stable ID `historical-geography` and route `/games/historical-geography` fit the selector contract. `DailyGameEligibility` is `{ gameId: string, eligible: boolean, reason: string }`. An absent entry is ineligible; Historical Geography should be absent or have `eligible: false` until its content is reviewed. The selector also ignores IDs not yet present in the shared `GAME_IDS` type.

If Historical Geography is later enabled, it should use the shared `dailyPuzzleId(gameId, date)` and `dailyPuzzleSeed(gameId, date)` functions and the `gameId:date:version` identity contract. It should not introduce a separate random seed or a special puzzle-ID shape.

## Puzzle identity and persistence

Puzzle identities and seeds continue to come from the shared `dailyPuzzleId(gameId, date)` and `dailyPuzzleSeed(gameId, date)` functions. Their per-game puzzle versions and `GameId:date:version` contract are unchanged. Each generator uses that game's own seed, so adding another puzzle does not consume a shared random sequence.

No IndexedDB or localStorage migration is required. Daily completion is read from existing `GameResult` history by `(gameId, date, mode)`; the page counts only games selected for that date. Existing results and sessions are not deleted or rewritten. Statistics continue to count stored completed records and activity dates, so a different lineup does not reset a streak or reinterpret old history.

The Daily page's progress adapter is read-only over the existing app history. The shared persistence layer remains responsible for IndexedDB and localStorage fallback, import/export, and reset behavior.

## Offline behavior and integration handoff

Puzzle selection is local and deterministic. The service worker already caches same-origin `/data/` responses after a successful fetch, so reopening a Daily puzzle after its data loaded online uses the same date seed and cached content. A first-ever visit to a lazy dataset while already offline still requires that dataset to have been fetched earlier; guaranteeing that case needs the coordinator to add the relevant data files to the shared offline precache policy.

This branch does not edit shared game registration or persistence. Integration must update the catalog's Daily allowlist and `GamePage` eligibility guard to accept the eight IDs returned by this module. Historical Geography should remain absent or explicitly `eligible: false`. No shared schema migration is requested.
