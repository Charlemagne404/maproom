# Maproom 2.0 integration report

> **Historical integration snapshot.** Counts and branch state below describe the 19 November 2026 integration. Current release information is in the [current final handover](../FINAL_HANDOVER.md).

**Date:** 19 November 2026

**Integration branch:** `codex/maproom-2.0-integration-20261118`

**Baseline:** `749047b3e17e306df0f9b7674e32a12e0df841e2`

**Production:** unchanged; no deployment was performed.

## Six workstreams merged

Each source branch was merged with a no-fast-forward merge. All six source branches and their worktrees remain intact. The baseline worktree remains on the baseline commit; this work has not been merged into `main`.

| Workstream | Source branch | Merge commit |
| --- | --- | --- |
| Geography Connections | `codex/maproom-2.0-connections-20261118` | `7a14775f9cafaf666ac83a8397f1b82158cafeed` |
| Historical Geography | `codex/maproom-2.0-historical-20261118` | `21f264991562ed2c4f261f33c17cefde88380111` |
| Daily System | `codex/maproom-2.0-daily-20261118` | `a6fbb57a3fbb53530f089d353067e73e99446009` |
| Maps & Gameplay UX | `codex/maproom-2.0-maps-20261118` | `3d7728e912e79062baf315b2397c5f0b1e9faae6` |
| Website Fundamentals | `codex/maproom-2.0-web-20261118` | `c493eac86516f4718074568d2ceae86145ee5a5b` |
| Mobile Experience | `codex/maproom-2.0-mobile-20261118` | `0174351b9b73193606388bd535464fb4d584024c` |

## Integrated functionality

- The catalog and lazy route registry contain 13 games, with stable game IDs and routes. Historical Geography is available in Free Play and through its secondary Explore collection. It stays explicitly excluded from Daily.
- Daily presents six puzzles from an explicit pool of eight eligible games. Its deterministic 28-day rotation gives each eligible game 21 appearances; over 365 days counts differ by at most one (273 or 274). Riverways and Latitude Ladder launch through Daily. The Daily guard excludes Connections, Higher or Lower, Neighbour Challenge, Distance & Direction, and Historical Geography.
- Date-seeded greetings and the Pick Up Thread card identify the saved game, mode, progress, and resume action.
- Geography Connections tests use authored puzzle boards rather than the removed generic solver assumptions.
- Historical Geography has dedicated browser coverage for Explore and direct launch, difficulty bounds, incorrect guesses, sources and license attribution, replay, responsive/dark/reduced-motion display, and cached offline resume. Its 20 generated CShapes 2.1 map snapshots are attributed and labeled CC BY-NC-SA 4.0, non-commercial use.
- Maps and mobile changes cover map pan/zoom, touch interactions, map-only scroll containment, safe areas, and responsive controls. `index.html` now declares `viewport-fit=cover`. A stacking defect that let the country map obscure its settings toolbar was corrected.
- SEO generation includes 21 route snapshots and 18 indexable sitemap URLs. The repository-owned Caddy template serves route snapshots, preserves a real 404 response, sets route/data and fingerprinted-asset cache policies, and permits the exact inline-theme CSP hash without script `unsafe-inline`.

## Verification evidence

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | Passed: 23 files, 114 tests |
| Canonical `npm run build` | Passed: 2,205 modules; build ID `d89e9146dba248fc` |
| Build artifact validator | Passed: 21 route snapshots, 18 sitemap URLs, 197 precached assets, 198 regional packages, 20 historical maps, data and CSP hashes |
| Full Playwright suite, sequential, one worker | One run: 84 passed, 3 failed, 87 total |
| Focused reruns of the three failing browser cases | Passed: 3/3 after correcting test assumptions for date stability, a renamed route-map dock, and the updated sitemap count |
| Product screenshot capture after Historical card layout fix | Passed: 1/1 at desktop and mobile sizes, both themes; includes the Historical Explore card width assertion |
| Local offline/artifact and Caddy smoke checks | Passed: required generated assets and cache references validate; isolated Caddy 2.11.4 returned route-specific snapshots and a true 404, with the intended cache and CSP behavior |
| `git diff --check`, `bash -n scripts/finalize-deployment.sh` | Passed |

The three failures in the single full Playwright run were test-harness expectations, not observed application regressions. They were each corrected and passed in focused reruns. In keeping with the requested verification limit, the full 87-test browser suite was not run a second time after those corrections. The final CSS sizing adjustment was built and covered by the focused product screenshot capture.

## Release boundary and remaining limits

The integration branch is a validated release candidate; it has not been activated. The live production Caddyfile, current release symlink, DNS, certificates, public origin, and hosted performance were not checked during integration. The last host observation is from 17 November 2026 and is historical only.

Before any deployment, an operator must stage the reviewed integration commit in `/home/charlie/maproom`, run the canonical build there, review the current host Caddy configuration, and follow the approved host procedure. The finalizer expects the repository and `dist/` at that path. If the existing managed Caddy block differs from the reviewed block in `scripts/finalize-deployment.sh`, it requires operator review. Running the finalizer requires host access and `sudo`; it was not run. No production, DNS, or main-branch changes were made.

Physical-device testing, broader assistive-technology review, hosted performance, and moderated player evidence remain future validation. They are not code integration blockers. Historical Geography must remain non-commercial unless its data rights change.
