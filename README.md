# Maproom

Maproom is a self-hosted geography game library with **18 registered games** presented through 23 game and format cards in Explore. Daily selects six puzzles from an explicit pool of eight eligible games; all games have a Free Play route. The library includes country and region maps, historical geography, city and flag quizzes, spatial comparisons, and logic puzzles. It is a client-only React application. Game history, favorites and preferences stay in the browser; no account or gameplay backend is required.

The historical collection has three games: When Was This Map?, Historical Flags, and Historical States & Empires. When Was This Map? retains 20 Maproom-generated CShapes political-boundary snapshots for saved version-1 sessions and uses a separate set of 41 Maproom-rendered Cliopatria atlas views for new sessions. Historical States & Empires shares those 41 atlas views. Historical Flags has 20 cited, original flag drawings. These are sourced reconstructions and illustrations, not archival map scans. CShapes is CC BY-NC-SA 4.0 (non-commercial, attribution, and ShareAlike); the Cliopatria-derived views and original flag artwork are CC BY 4.0. See [data sources](docs/DATA_SOURCES.md) for the separate terms and limitations. Adding a game to Explore does not opt it into Daily. Standard country practice uses the 193 UN members and two UN observer states; Extended includes the full country and territory catalogue.

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

`npm run build` writes the static production application and route snapshots to `dist/`. See [the architecture](docs/ARCHITECTURE.md), [game rules](docs/GAME_RULES.md), [data sources](docs/DATA_SOURCES.md), [design system](docs/DESIGN_SYSTEM.md), and the [current final handover](docs/FINAL_HANDOVER.md) for implementation details and release status. The [game audit](docs/GAME_AUDIT.md) covers the 16-game catalogue as reviewed on 18–19 November; it is a dated review, not a current audit of all 18 games. Mission logs, workstream plans, and dated candidate reports are retained as historical records and may describe earlier counts or branch state.

GitHub Actions runs the same typecheck, lint, unit-test and production-build scripts on pushes and pull requests using Node.js 22.

## Self-hosting

The recommended release source is `codex/maproom-final-ui-polish-20261123`; the exact working commit and comparison with the remote default branch are recorded in the [current final handover](docs/FINAL_HANDOVER.md). The public site was reachable during this maintenance pass, but no deployment or host configuration change was made. Public-site checks do not establish the production host's current Caddy configuration.

The finalizer expects the repository at `/home/charlie/maproom` and builds from its `dist/`. Before an operator release, place the reviewed candidate branch in that path, rerun the checks and review the build output, then decide whether to activate it:

```sh
sudo /home/charlie/maproom/scripts/finalize-deployment.sh
```

The script validates Caddy before any configuration change, keeps a timestamped Caddyfile backup if needed, atomically changes `/srv/maproom/current`, and checks the origin and public URL. A pre-existing managed Caddy block that differs from the reviewed template requires operator review; see [deployment](docs/DEPLOYMENT.md) for the host boundary. The script was not run. See [operations](docs/OPERATIONS.md) and the [current final handover](docs/FINAL_HANDOVER.md) for test results and remaining limits.

## Data and privacy

The site includes Natural Earth country geometry and river centerlines, country metadata from mledoze/countries, 2023 World Bank population estimates, GeoNames populated places, 198 first-level boundary packages from geoBoundaries, locally bundled flag SVGs, and the historical data described above. Sources, per-country license evidence, retrieval dates, hashes, transformations and limitations are available in the app at `/data` and in [the data-source notes](docs/DATA_SOURCES.md). The full city file includes 34,456 places; Distance & Direction and Latitude Ladder use an order-preserving subset of 12,405 records at or above 50,000 population, while Capitals & Cities uses the full pool, including seats below that threshold.

Progress is stored in IndexedDB, with a localStorage fallback. The Settings page can export, import or clear browser data. See the in-app [privacy note](/privacy).
