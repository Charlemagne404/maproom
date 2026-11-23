# Maproom final maintenance and release readiness

- **Status date:** 23 November 2026
- **Recommended release branch:** `codex/maproom-final-ui-polish-20261123`
- **Branch tip before this pass:** `9ff3859d0ef54013dc766232386bc84959803fdd`
- **Working tree:** maintenance changes are present in `/home/charlie/maproom-worktrees/final-ui-polish` and are uncommitted.

## Current implementation

The source catalogue contains **18 registered games**, shown as 23 game and format cards in Explore. Daily selects six games from its explicit eight-game allowlist. The historical collection has three games: When Was This Map?, Historical Flags, and Historical States & Empires. When Was This Map? keeps 20 CShapes-derived snapshots available for version-1 saved sessions and uses 41 curated Cliopatria atlas views for current play; Historical States & Empires uses those 41 atlas views, and Historical Flags has 20 cited original drawings. CShapes remains CC BY-NC-SA 4.0; the atlas views and flag artwork are CC BY 4.0. These are reconstructions and illustrations, not archival map scans. The separate terms and limitations are in [DATA_SOURCES.md](DATA_SOURCES.md).

The implementation source of truth is `src/games/catalog.ts` plus the exhaustive lazy component registry in `src/games/components.tsx`. Current loading and registration details are in [ARCHITECTURE.md](ARCHITECTURE.md); the exact game and Daily counts are in [GAME_RULES.md](GAME_RULES.md).

## Git and release recommendation

On 23 November, `git ls-remote --symref origin HEAD` resolved the remote default branch to `codex/maproom-2.0-baseline-20261118` at `749047b3e17e306df0f9b7674e32a12e0df841e2`. The candidate branch `codex/maproom-final-ui-polish-20261123` was at `9ff3859d0ef54013dc766232386bc84959803fdd`, equal to its remote tracking ref before this pass and **82 commits ahead** of the remote default. Local `main` is at `d63f2dd9e7c88a04ca642c9cb2e9f849e6a4312b`; `origin/main` is gone, and the candidate is 92 commits ahead of that local ref.

The final UI polish branch is the latest integrated implementation among the checked refs and is the recommended canonical source for release review. It is not the GitHub default branch, and it has not been merged, pushed, or promoted by this pass. No force-push or repository setting change was made.

## Changes in this maintenance pass

- Increased the Find the Country mobile map stage with a game-specific viewport height: 480px at 390×844 and a 280px minimum at 320×568. The horizontal map controls stay inside the viewport with 44px touch targets. The map stage and controls fit in the first viewport; the remaining page overflow is 64px and 105px respectively, primarily the footer.
- Added a Playwright regression for both phone sizes. It checks the stage bounds, map-control visibility and touch behavior, zoom/reset, and page height. Generated captures were inspected at both sizes. The 390×844 light and dark reference screenshots in `e2e/mobile/screenshots/` were refreshed; 320×568 captures are in the ignored QA artifacts under `artifacts/qa/maps-gameplay-ux/`.
- Renamed the two 390×844 screenshots that had `desktop` in their filenames and updated their only repository reference. Their filenames now identify mobile dimensions and light theme.
- Added `.github/workflows/ci.yml`. It uses Node.js 22, `npm ci`, and the existing typecheck, lint, unit-test, and production-build scripts.
- Corrected README and architecture counts and historical-data descriptions, updated deployment status, and labeled older release, integration, mission, and game-audit documents as historical snapshots. The earlier integration handover was retained at `docs/releases/MAPROOM_2_0_INTEGRATION_HANDOVER.md`.

No scoring, puzzle generation, game registration, Daily eligibility, or persistence behavior changed.

## Validation

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — **157 tests passed across 30 files**.
- `npm run build` — passed: 2,224 modules, 26 route snapshots, 23 sitemap URLs, 210 precached assets, 198 regional packages, 20 legacy maps, 41 atlas maps, and 20 historical flags. Candidate build ID: `aeb67635b3a41d85`.
- Full production-preview Playwright suite — **102/102 passed** with one worker. Coverage includes setup for all 18 games, map interaction, persistence and Daily migration, navigation, light/dark themes, mobile, offline reopening, SEO routes, and data loading. The test port was temporarily changed because port 4173 was occupied by a preview in a separate worktree; that process was left running and the temporary configuration was removed.
- Focused Find the Country browser check — passed at 390×844 and 320×568. The controls remained visible and touch-operable; the mobile map screenshot captures were inspected.
- `git diff --check` and a final Git status review are the last repository checks for this pass.

## Production comparison

The public site at `https://maproom.continental-hub.com` responded during this check. Every one of the 23 sitemap routes returned HTTP 200 with a route title and heading. The public precache manifest reports build ID `6324042ecb9d4d5c` and 210 assets. A manifest comparison found 185 asset URLs shared with the local candidate, 25 production-only fingerprinted URLs, and 25 candidate-only fingerprinted URLs; all 210 production asset URLs returned HTTP 200. The candidate's 210 assets passed the local artifact validator. The candidate build ID `aeb67635b3a41d85` differs from production's `6324042ecb9d4d5c`; the public manifest does not expose a Git SHA, so the precise deployed commit is not verifiable from the endpoint. The previous UI handover records deployed release `1.2.0-70f045842062` at the start of that work; that remains the last documented source identification.

The live Find the Country page still has the earlier tall, vertically controlled mobile map layout: stage heights were 582px at 390×844 and 470px at 320×568, with document heights of 983px and 871px. A live 390×844 smoke check confirmed map zoom, dark-theme toggle, and Back to Explore navigation, with no page errors. The candidate now uses shorter viewport-aware stages and horizontal controls while keeping the map and controls reachable. The public route set and assets are present, but production does not yet contain this candidate layout. No production deployment, production host login, Caddy change, or DNS change occurred.

## Manual follow-up

- The GitHub Actions workflow will run after these changes are pushed to a branch or opened as a pull request; no hosted workflow run occurred in this local pass.
- A release operator must review the candidate and choose whether to promote it to the repository default or deploy it. This pass left the remote default unchanged and did not deploy.
- The production Git SHA cannot be confirmed from its public manifest. Physical-device and manual assistive-technology checks were not performed; automated browser emulation and keyboard tests passed.
