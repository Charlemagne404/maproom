# Maproom

Maproom is a self-hosted geography game library with thirteen games. Daily selects six puzzles from an explicit pool of eight eligible games; every game also has a Free Play route. The library covers country and region maps, outlines, land-border routes, flags, a 3×3 grid, cities, authored Connections puzzles, country comparisons, neighbours, city distance and direction, Riverways, Latitude Ladder and historical maps. It is a client-only React application. Game history, favorites and preferences stay in the browser; no account or gameplay backend is required.

Historical Geography adds twenty Maproom-generated political-boundary snapshots, not archival map scans. The CShapes-derived collection is licensed CC BY-NC-SA 4.0, so reuse is non-commercial only and adaptations must retain attribution and ShareAlike terms. Adding a game to Explore does not opt it into Daily. Standard country practice uses the 193 UN members and two UN observer states; Extended includes the full country and territory catalogue.

The interface uses a locally bundled Nunito Sans type system, a warm cream, charcoal and orange palette, and map-led illustrations drawn from the bundled geography data. The daily home opens with a Stockholm-time greeting and a varied set of puzzle tiles. Each game keeps a composition fitted to the way it is played.

## Local development

Requirements: Node.js 22 or newer, npm, and `unzip` for rebuilding the GeoNames city file.

```sh
npm ci
npm run dev
```

The data already bundled in `public/data` is sufficient for the app. To refresh it from upstream sources, run `npm run data:sync`. That command fetches the current Natural Earth, mledoze/countries, World Bank, geoBoundaries and GeoNames data, records hashes and license evidence, writes the normalized files, and regenerates [the coverage report](docs/DATA_COVERAGE.md). It needs network access and the system `unzip` utility. Review the generated source manifest and coverage report before publishing an updated data set.

## Build and quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run e2e
npm run preview
```

`npm run build` writes the static production application to `dist/`. See [the architecture](docs/ARCHITECTURE.md), [game rules](docs/GAME_RULES.md), [game research](docs/GAME_RESEARCH.md), [existing game audit](docs/GAME_AUDIT.md), [new-game backlog](docs/GAME_CONCEPTS.md), [mission progress](docs/MISSION_PROGRESS.md), and [design system](docs/DESIGN_SYSTEM.md) for implementation details.

## Self-hosting

The integration candidate is on `codex/maproom-2.0-integration-20261118` in `/home/charlie/maproom-worktrees/integration`. It has not been deployed. The last recorded read-only host check was 17 November 2026 and found `/srv/maproom/current` at `/srv/maproom/releases/1.2.0-dac85cc7b547`; the host was not checked again during integration, so that is a historical observation only. The reviewed Caddy template in the finalizer serves route snapshots, uses the theme-bootstrap hash, sets cache headers and returns a true 404. An isolated local Caddy 2.11.4 smoke test passed; the production Caddyfile was not inspected, edited or reloaded.

The finalizer expects the repository at `/home/charlie/maproom` and builds from its `dist/`. For a later operator release, first bring the reviewed integration branch into that path, run the canonical build and review the output, then choose whether to activate it:

```sh
sudo /home/charlie/maproom/scripts/finalize-deployment.sh
```

The script validates Caddy before any configuration change, keeps a timestamped Caddyfile backup if needed, atomically changes `/srv/maproom/current`, and checks the origin and public URL. A pre-existing managed Caddy block that differs from the reviewed template requires operator review; see [deployment](docs/DEPLOYMENT.md) and [the integration report](docs/parallel-development/INTEGRATION_REPORT.md) for the exact host boundary. No deployment occurred. See [operations](docs/OPERATIONS.md) and the [final handover](docs/FINAL_HANDOVER.md) for test results and remaining limits.

## Data and privacy

The site includes Natural Earth country geometry and river centerlines, country metadata from mledoze/countries, 2023 World Bank population estimates, GeoNames populated places, 198 first-level boundary packages from geoBoundaries, locally bundled flag SVGs, and the CShapes-derived historical collection. Sources, per-country license evidence, retrieval dates, hashes, transformations and limitations are available in the app at `/data` and in [the data-source notes](docs/DATA_SOURCES.md). The full city file includes 34,456 places; Distance & Direction and Latitude Ladder use an order-preserving subset of 12,405 records at or above 50,000 population, while Capitals & Cities keeps the full pool including seats below that threshold.

Progress is stored in IndexedDB, with a localStorage fallback. The Settings page can export, import or clear browser data. See the in-app [privacy note](/privacy).
