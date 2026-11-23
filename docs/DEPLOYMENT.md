# Deployment

## Current release boundary

The recommended release source is `codex/maproom-final-ui-polish-20261123`, currently at source commit `9ff3859d0ef54013dc766232386bc84959803fdd` plus the uncommitted maintenance changes recorded in the [current final handover](FINAL_HANDOVER.md). On 23 November, the remote default branch resolved to `codex/maproom-2.0-baseline-20261118` at `749047b3e17e306df0f9b7674e32a12e0df841e2`; the candidate is 82 commits ahead. Local `main` is a separate older ref at `d63f2dd9e7c88a04ca642c9cb2e9f849e6a4312b`, with its upstream gone; the candidate is 92 commits ahead of it. No merge, push, force-push, or GitHub default-branch change was performed.

The public HTTPS site was reachable. All 23 routes in its sitemap returned HTTP 200 with a title and heading. The deployed `/precache-manifest.json` reports build `6324042ecb9d4d5c` and 210 assets. The public manifest does not expose a Git SHA, so the precise deployed source commit cannot be established from the endpoint. The preceding [UI handover](releases/MAPROOM_FINAL_UI_POLISH.md) recorded release `1.2.0-70f045842062` as deployed when that work began; treat this as the last documented source identification, not a fresh SHA verification.

The locally built candidate reports build `aeb67635b3a41d85`, also with 210 assets. Its build ID differs from production. In mobile Chromium, production's Find the Country stage measured 582px at 390×844 and 470px at 320×568, with vertically stacked controls and document heights of 983px and 871px. The candidate's game-specific layout measures 480px and 280px, keeps the horizontal 44px controls and map in the first viewport, and has short overall page overrun for the footer (64px and 105px). Production therefore does not yet contain the candidate's mobile layout. These checks did not inspect the production host, Caddy configuration, or DNS.

The latest recorded host-side symlink check was dated 17 November 2026. It found `/srv/maproom/current` pointing to `/srv/maproom/releases/1.2.0-dac85cc7b547`, with `1.1.0-cb626ad2bedd` retained for rollback. This remains historical host evidence, not a current production status.

## Build and artifacts

Run the pipeline from the reviewed checkout:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright test --workers=1
```

The build generates route HTML snapshots, `sitemap.xml`, `robots.txt`, and `precache-manifest.json`, then runs `scripts/validate-production-artifacts.mjs`. For this candidate, validation checks required shell/data assets, 26 route snapshots, 23 sitemap URLs, every precache reference and the matching service-worker build ID, lazy chunks and stable routes for all 18 games, source-data hashes, all 198 regional package hashes, all 20 legacy CShapes maps, all 41 Cliopatria atlas maps, all 20 historical flag artworks, the viewport declaration, and the CSP hash. The deployment finalizer also has explicit required-file checks for route snapshots, historical manifests, maps and flags.

The service worker precaches compiled shell assets and all 20 legacy historical maps, 41 expanded atlas maps and 20 historical flags on install. Successful same-origin `/data/` requests are also cached after first online use. Other optional game data becomes available offline after it has been fetched online.

## Repository-owned Caddy template

`scripts/finalize-deployment.sh` contains the Maproom Caddy block. The reviewed template:

- Tries `{path}/index.html`, `{path}`, then `/index.html` for known app routes so nested route snapshots win and the SPA root remains a fallback.
- Serves other files directly. Unknown paths reach Caddy's 404 route, which serves the generated `/404/index.html` while preserving status 404.
- Sets `Cache-Control: no-cache` for route HTML, service-worker files and data. Fingerprinted `/assets/*` files receive `public, max-age=31536000, immutable`.
- Allows the exact SHA-256 hash of the inline theme bootstrap in `script-src`; it does not use script `unsafe-inline`.

The block was validated with Caddy 2.11.4 using an isolated local server. Direct requests returned route-specific titles for `/explore`, `/games/cities` and `/games/historical-geography`; an unknown path returned the custom not-found content with HTTP 404. Browser verification confirmed the saved dark theme applies before React starts with no CSP violations. This does not verify the production host's current block.

If the production Caddyfile contains an older marked Maproom block, the finalizer intentionally refuses to overwrite a block whose contents differ. An operator must review the managed site block and replace it with the current block from `scripts/finalize-deployment.sh`, then validate/reload it through the approved host procedure. The exact reviewed block is the site block between `# BEGIN CODEX MAPROOM MANAGED SITE` and `# END CODEX MAPROOM MANAGED SITE` in that script.

## Operator handoff

The finalizer expects the repository at `/home/charlie/maproom` and its build in that checkout's `dist/`. The release candidate was prepared in its separate worktree; an operator would need to place the reviewed branch in the expected checkout and rerun the checks before considering activation. The finalizer was not executed during this mission. It would change the live service and Caddy configuration, so deployment remains a separate operation.

```sh
sudo /home/charlie/maproom/scripts/finalize-deployment.sh
```

The script validates the existing host, prepares an immutable release under `/srv/maproom/releases/`, atomically switches `/srv/maproom/current`, validates Caddy as needed and checks the local/public origin. It reports a rollback command. It was not run during release preparation.

## Licensing and remaining deployment limits

The 20 legacy CShapes 2.1 maps carry CC BY-NC-SA 4.0. Distribution and reuse are non-commercial only; attribution and ShareAlike terms apply. The 41 Cliopatria v0.2.1 maps and 20 original flag redraws carry CC BY 4.0 with per-source attribution. A commercial deployment of the legacy CShapes-derived assets requires separate rights or a replacement dataset reviewed under its own license.

The current read-only check confirmed public HTTPS delivery for all 23 sitemap routes and all 210 deployed asset URLs. Production Caddy state, DNS, hosted performance, and physical-device behavior remain unverified. Public availability does not mean this candidate was activated; this document records deployment compatibility and read-only checks only.
