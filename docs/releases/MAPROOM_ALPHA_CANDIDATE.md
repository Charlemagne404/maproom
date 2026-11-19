# Maproom Alpha Candidate

Prepared 19 November 2026 on `codex/maproom-alpha-candidate-20261119`.

## Candidate basis

- Starting point: `df183ec7d7fa722ae27f85f00de2403f84eb6b6f`, the verified tip of `codex/maproom-product-quality-20261119`.
- The starting commit descends from the integrated Maproom 2.0 baseline (`5465c034eefd8c365311ec256f1c2aec3425762a`). The alpha branch is based on the product-quality tip, not the earlier integration tip.
- Candidate branch: `codex/maproom-alpha-candidate-20261119`, pushed to `origin` for review with this report in its final commit. The candidate is not merged, activated, or deployed.

## Gameplay and product changes

### Historical Geography

The 20 selected CShapes snapshots cover 1886–2011. The previous inclusive ±100/50/25-year bands allowed a fixed 1949 guess to pass every Easy map. The candidate keeps the three difficulty levels and changes their tolerances to Easy ±20, Medium ±8, and Hard ±2 years. An exhaustive calculation over all 20 maps finds that the best fixed guess passes at most 8/20, 4/20, and 2/20 maps respectively; the best fixed-guess mean score is 359/1,000 on Easy and below 200/100 on Medium/Hard. The accepted range is shown to players. No dates or data were added.

Each map remains labeled as a Maproom-generated 31 December snapshot, not an archival map. Historical Geography stays in Free Play and outside Daily.

### Geography Connections

All 24 authored boards were audited for answer shape, fact membership, unassigned exact quartets, euro-area overlaps, and broad tile intersections. Editorial repairs to Atlas 02, 04, 11, 13, 22, and 23 replace verified euro-area and other exact alternatives with source-backed sets while preserving four groups, the difficulty tiers, one-away feedback, the four-mistake limit, and intentional decoys. The audit now reports no unassigned exact quartet and no euro-area advisory. Atlas 22 retains a seven-tile Europe overlap; Atlas 11 and 13 have another description for the same four intended tiles, not another tile selection. The board-by-board reasoning and remaining player-review caveat are in [`EDITORIAL.md`](../../src/games/connections/EDITORIAL.md).

### Specialized games

- **Map Projection Match:** A fresh-session review found the task and projection tradeoffs clear, with enough information to choose, useful incorrect-answer feedback, and a working replay. No gameplay change was needed.
- **Population Pyramid Sort:** A fresh-session review found the age-profile prompt, displayed cohort information, pairwise feedback, and replay understandable. Results previously counted only perfect rounds as correct answers despite awarding partial pairwise points. Results now report correct pairs out of 15, pairwise accuracy, and perfect rounds.
- **Watershed Match:** The polygon map does not show river channels or flow direction, so it cannot support an inferred flow-path answer. Copy now accurately frames the choice as matching a recorded USGS downstream link; the map caption explains its limited location-context role. It remains a limited, experimental Free Play pilot in the secondary Explore collection, outside Daily, with no dataset expansion.

### First-time journey and catalogue

The existing six-card Daily hierarchy, eight-game eligibility set, deterministic 28-day schedule, stable date keys, streaks, historical completion, and saved progress were preserved. Explore presents the 12 standard games and formats first, followed by a labeled Specialized collections section for Projection Match, Population Pyramid Sort, and Watershed Match. When unfiltered, the historical game remains in its separate attributed archive collection. Existing routes and all 16 registered games remain available; the homepage Free Play carousel still includes them.

In a fresh browser origin, the Daily heading (“Today’s puzzles”), “Six from the Daily rotation” caption and 0/6 progress counter make the available set and completion state explicit. Reviewed at desktop and 320px, the cards remained usable without an introductory screen, so the existing hierarchy and six challenges were retained.

Population Pyramid's result semantics and Watershed Match's first-read wording are the only specialized gameplay changes. No onboarding screen, Daily challenge, game, or click was added.

## Sixteen-game catalogue disposition

| Availability | Games |
| --- | --- |
| Daily rotation (8 eligible; 6 shown each date) | Find the country, Country Outline Quiz, Border route, Flag Match, Geography grid, Capitals & Cities, Riverways, Latitude Ladder |
| Core Explore catalogue (12 games) | Find the country, Country Outline Quiz, Border route, Flag Match, Geography grid, Capitals & Cities, Geography Connections, Higher or Lower, Neighbour Challenge, City Distance & Direction, Riverways, Latitude Ladder |
| Specialized Free Play collection, outside Daily | Map Projection Match, Population Pyramid Sort, Watershed Match (limited USGS pilot) |
| Separate historical collection, outside Daily | When Was This Map? / Historical Geography |

All 16 games retain their existing direct routes. The Explore count continues to include format variants as separate experiences.

## Daily, progress, and offline compatibility

No Daily eligibility, rotation version, epoch, challenge count, date key, streak logic, IndexedDB schema, or saved-progress migration was changed. Existing history and unfinished games remain stored in the same browser-local stores. Candidate browser checks cover six daily cards from the eight-game pool, scheduled launches, restoration of unfinished progress, previously completed history, a same-day offline reload, and cached historical, population, and watershed assets as documented.

The service worker precaches compiled application assets, including all 16 lazy game chunks. Optional datasets and individual historical maps are cached after successful same-origin online requests; first-time offline access still requires a prior fetch, as documented in [`OPERATIONS.md`](../OPERATIONS.md).

## Validation

| Check | Candidate result |
| --- | --- |
| Typecheck | Passed |
| Lint | Passed |
| Unit suite | 148 tests passed across 29 files |
| Canonical production build and artifact validator | Passed; 2,219 modules, 24 route snapshots, 21 sitemap URLs, 206 precached assets, 198 regional packages, 20 historical maps |
| Browser regression suite | 100/100 passed with one worker across two batches. After the final Explore filtered-results adjustment, the affected homepage/library journey test passed again (1/1). The first runner process passed 80 tests, then was interrupted with exit 143 and no assertion failures; a continuation ran the remaining 20 successfully. |
| Geography Grid touch regression | Previous full baseline stopped with two failures at the order-sensitive mobile touch case. Controlled candidate rerun passed 3/3; the final one-worker suite also exercises it. |
| Accessibility checks | Candidate suite includes keyboard navigation, focus transfer, live feedback, touch targets, and text/non-text contrast across both themes. Browser checks are not a substitute for physical-device or assistive-technology testing. |
| Visual review | Fresh-storage review covered the Daily homepage and Explore. Inspected desktop and mobile screenshots for Daily, Explore, Connections, Historical Geography, country maps, all three specialized games, and tablet map layouts; the 320px and 390px mobile views, landscape tablet, tablet, light, and dark states were covered. No material overflow, overlap, clipping, or unreadable control was found in the reviewed captures. |

The initial product-quality Playwright run did not complete: it was interrupted at test 45/100, and the Geography Grid touch case failed twice in that incomplete run. The failure was investigated with a repeated isolated candidate run rather than hidden or skipped. In the final candidate regression, the first one-worker Playwright process was interrupted at test 80/100 (exit 143); the remaining 20 tests passed in a one-worker continuation. Together, the sequential batches covered all 100 tests with no assertion failures.

## Assets, sources, and licensing

The production artifact validator confirms that every precache reference exists, the service-worker cache identity matches the precache manifest, all route snapshots and canonical metadata are present, the sitemap matches the deployment hostname, the inline theme bootstrap matches the Caddy CSP hash, and the population, watershed, regional-geography, and historical-map manifests match their bundled hashes and counts.

Historical assets remain derived from CShapes 2.1, attributed to the six listed ETH Zürich authors, and licensed CC BY-NC-SA 4.0. The source data are not redistributed; all 20 generated SVGs retain attribution, adaptation terms, date/context metadata, and asset hashes. **The historical map pack is restricted to non-commercial use, with attribution and ShareAlike required. Commercial use or monetization requires separate rights or a reviewed replacement source.** The population age-profile source is World Bank WDI under CC BY 4.0 with World Bank dataset terms; the limited USGS WBD sample records CC0 terms and USGS attribution. Existing Natural Earth, country-catalogue, city, and regional-package license evidence remains in the data manifest and notices.

## Remaining issues

- No moderated or independent player sessions were available. The perceived difficulty of the historical bands, Connections decoys, Projection Match, and Population Pyramid remains unmeasured. The Watershed pilot remains particularly limited because its geography does not visualize flow.
- Browser runs used local Chromium. Physical phones/tablets, platform-specific browsers, screen readers, voice control, and performance on low-end devices were not independently tested.
- Production host state, current Caddy configuration, DNS, certificates, public URLs, and hosted performance remain unverified. No live service, Caddyfile, DNS record, or host configuration was accessed or changed during this mission.

## Deployment requirements and release gates

The canonical finalizer is hard-coded for the repository at `/home/charlie/maproom` and build at that checkout's `dist/`. Before activation, an operator must stage this exact branch/commit in the canonical path, rerun the documented checks and build, review the generated artifacts, and inspect the current host Caddyfile and service state. The finalizer requires root through `sudo`, the active Caddy service and `caddy` group, creates an immutable release under `/srv/maproom/releases/`, switches `/srv/maproom/current`, may install the marked Caddy block after validation and backup, and checks the local TLS origin and public HTTPS endpoints. It intentionally refuses to replace a differing marked block. It was not run.

The candidate's updated Caddy template includes all three specialized routes. The repository template and build artifacts were checked locally; the production host template and live behavior were not verified. Do not treat historical host observations in older handover documents as current deployment evidence.

**Blocking before public activation:** stage and review the candidate in the canonical checkout; verify current host/Caddy compatibility; then perform the operator-approved finalization and live-origin/public-route checks. Commercial use is blocked until CShapes rights are changed or separately cleared.

**Non-blocking for human release review:** independent player research and physical-device/assistive-technology checks remain open and should inform later alpha iteration. Watershed Match remains explicitly experimental, small-sample, Free Play only.

## Recommendation

The candidate preserves the integrated product-quality work, corrects the deterministic Historical Geography midpoint exploit and verified Connections alternatives, improves Population Pyramid results and Watershed first-read framing, and keeps all 16 games and Daily progress available. Subject to the non-commercial CShapes restriction and the unverified host-side deployment gates above, it is ready for human release review. It is not evidence of a live deployment or a substitute for operator approval of activation.
