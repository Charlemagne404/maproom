# Deployment

## Current release boundary

The integration candidate is on `codex/maproom-2.0-integration-20261118` in `/home/charlie/maproom-worktrees/integration`. Its canonical build and generated artifacts have been reviewed locally. The integration branch has not been activated or deployed. The production host, live Caddyfile, DNS and public endpoints were not inspected or changed during this work.

The last recorded read-only host check was dated 17 November 2026. It found `/srv/maproom/current` pointing to `/srv/maproom/releases/1.2.0-dac85cc7b547`, with `1.1.0-cb626ad2bedd` retained for rollback. This is a historical observation, not a current production status.

## Build and artifacts

Run the canonical pipeline from the reviewed checkout:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright test --workers=1
```

The build generates route HTML snapshots, `sitemap.xml`, `robots.txt`, and `precache-manifest.json`, then runs `scripts/validate-production-artifacts.mjs`. That validation checks required shell/data assets, all 23 route snapshots, 20 indexable sitemap routes, every precache reference and the matching service-worker build ID, lazy chunks for all fifteen games, source-data hashes, all 198 regional package hashes, all 20 historical SVG hashes, the viewport declaration, and the CSP hash. The deployment finalizer also has explicit required-file checks for route snapshots and the historical manifest/maps.

The service worker precaches the compiled shell assets and a small set of core data on install. Successful same-origin `/data/` requests, including a historical map SVG, are cached after first online use. A fresh installation does not contain every optional game dataset or all historical maps.

## Repository-owned Caddy template

`scripts/finalize-deployment.sh` contains the Maproom Caddy block. The reviewed template:

- Tries `{path}/index.html`, `{path}`, then `/index.html` for known app routes so nested route snapshots win and the SPA root remains a fallback.
- Serves other files directly. Unknown paths reach Caddy's 404 route, which serves the generated `/404/index.html` while preserving status 404.
- Sets `Cache-Control: no-cache` for route HTML, service-worker files and data. Fingerprinted `/assets/*` files receive `public, max-age=31536000, immutable`.
- Allows the exact SHA-256 hash of the inline theme bootstrap in `script-src`; it does not use script `unsafe-inline`.

The block was validated with Caddy 2.11.4 using an isolated local server. Direct requests returned route-specific titles for `/explore`, `/games/cities` and `/games/historical-geography`; an unknown path returned the custom not-found content with HTTP 404. Browser verification confirmed the saved dark theme applies before React starts with no CSP violations. This does not verify the production host's current block.

If the production Caddyfile contains an older marked Maproom block, the finalizer intentionally refuses to overwrite a block whose contents differ. An operator must review the managed site block and replace it with the current block from `scripts/finalize-deployment.sh`, then validate/reload it through the approved host procedure. The exact reviewed block is the site block between `# BEGIN CODEX MAPROOM MANAGED SITE` and `# END CODEX MAPROOM MANAGED SITE` in that script.

## Operator handoff

The finalizer expects the repository at `/home/charlie/maproom` and its build in that checkout's `dist/`. Bring the reviewed branch into that path and rerun the checks before considering activation. Only an operator should then choose whether to run:

```sh
sudo /home/charlie/maproom/scripts/finalize-deployment.sh
```

The script validates the existing host, prepares an immutable release under `/srv/maproom/releases/`, atomically switches `/srv/maproom/current`, validates Caddy as needed and checks the local/public origin. It reports a rollback command. It was not run during integration.

## Licensing and remaining deployment limits

Historical maps are generated from CShapes 2.1 and carry CC BY-NC-SA 4.0. Distribution and reuse are non-commercial only; attribution and ShareAlike terms apply. A commercial deployment or use requires separate rights or a replacement dataset reviewed under its own license.

Production Caddy state, HTTPS certificates, public routing, DNS, public health checks, and hosted performance remain unverified. See [INTEGRATION_REPORT.md](parallel-development/INTEGRATION_REPORT.md) for integrated results and [the final handover](FINAL_HANDOVER.md) for the branch/push state.
