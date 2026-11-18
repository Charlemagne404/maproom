# Maproom 2.0 final handover

- **Status date:** 19 November 2026
- **Integration branch:** `codex/maproom-2.0-integration-20261118`
- **Baseline:** `749047b3e17e306df0f9b7674e32a12e0df841e2`
- **Production:** not deployed or changed

## Integrated state

All six Maproom 2.0 workstreams are merged on the integration branch with no-fast-forward merge commits. The six source branches and worktrees remain intact. The original baseline worktree and `main` were left unchanged.

Maproom has 13 games. Six puzzles appear each day from a balanced eight-game Daily rotation. Historical Geography is available in Free Play and its Explore collection, and remains excluded from Daily. The daily guard, Riverways and Latitude Ladder launch paths, authored Connections boards, mobile map controls, homepage greetings and resume panel, SEO snapshots, offline artifact manifest, and CSP/Caddy template have been integrated. Historical map reuse is CC BY-NC-SA 4.0 and non-commercial.

## Validation

- Typecheck, lint, and the full unit suite passed: 23 files and 114 tests.
- Canonical production build passed: 2,205 modules, 21 route snapshots, 18 sitemap URLs, 197 precached assets, 198 regional packages, 20 historical maps; build ID `d89e9146dba248fc`.
- The one full Playwright run completed with 84 passed and 3 failed of 87. Those three test assumption failures were fixed, then each focused case passed (3/3). The full suite was not repeated. The final Historical Explore card sizing was checked by the product screenshot capture, which passed 1/1 at desktop and mobile sizes in both themes.
- Artifact/CSP hashes and an isolated local Caddy 2.11.4 route/404/cache smoke check passed. The production host was not accessed.

Exact commands, merge commits, evidence, and limits are listed in the [integration report](parallel-development/INTEGRATION_REPORT.md).

## Host-side release requirements

The candidate is ready for deployment review; no application integration blocker remains. Deployment itself still requires an operator to stage the reviewed integration commit at `/home/charlie/maproom`, rebuild and review `dist/`, inspect the current host Caddyfile, and run the finalizer through the approved host process. The finalizer uses `sudo`, validates Caddy, prepares `/srv/maproom/releases/`, switches `/srv/maproom/current`, and checks origin/public URLs. It was not run. The last host observation, from 17 November 2026, is not current deployment evidence.

## Remaining validation limits

No physical phone/tablet or trackpad testing, broad assistive-technology review, moderated play, or hosted performance run was available. Local browser emulation and automated checks passed for the covered routes and states. These follow-up checks do not block the integration candidate.
