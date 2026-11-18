# Maproom

Maproom is a self-hosted geography game library built around six daily puzzles and unlimited practice: country and region maps, country outlines, land-border routes, flags, a 3×3 geography grid, and capitals and cities. It is a client-only React application. Game history, favorites and preferences stay in the browser; no account or gameplay backend is required.

Six additional games—Geography Connections, Higher or Lower, Neighbour Challenge, Distance & Direction, Riverways, and Latitude Ladder—are available as Free Play from the home carousel and Explore. The new games add physical river recognition and five-city spatial ordering. Adding a game to the library does not opt it into the curated daily set. Standard country practice uses the 193 UN members and two UN observer states; Extended includes the full country and territory catalogue.

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

The production files are served by the existing Caddy instance. The last documented read-only check, on 2026-11-17, found `/srv/maproom/current` resolving to `/srv/maproom/releases/1.2.0-dac85cc7b547`; the previous `/srv/maproom/releases/1.1.0-cb626ad2bedd` release was retained for rollback. The host state was not rechecked during this finalization. The current local candidate is version 1.2.0 and includes the completed game, data, UX and accessibility work recorded in the mission handoff. It remains uncommitted and inactive until the operator reviews and builds the final repository state, then chooses whether to run the prepared handoff:

```sh
sudo /home/charlie/maproom/scripts/finalize-deployment.sh
```

The script validates Caddy before any configuration change, keeps a timestamped Caddyfile backup if needed, atomically changes `/srv/maproom/current`, and checks the origin and public URL. This workspace has not activated the candidate or changed production. See [deployment](docs/DEPLOYMENT.md), [operations](docs/OPERATIONS.md), and the [final handover](docs/FINAL_HANDOVER.md) for the current boundary and rollback details.

## Data and privacy

The site includes Natural Earth country geometry and river centerlines, country metadata from mledoze/countries, 2023 World Bank population estimates, GeoNames populated places, 198 currently downloadable first-level boundary packages from geoBoundaries, and locally bundled flag SVGs. Sources, per-country license evidence, retrieval dates, hashes, transformations and limitations are available in the app at `/data` and in [the data-source notes](docs/DATA_SOURCES.md). The full city file includes 34,456 places; Distance & Direction and Latitude Ladder use an order-preserving subset of 12,405 records at or above 50,000 population, while Capitals & Cities keeps the full pool including seats below that threshold.

Progress is stored in IndexedDB, with a localStorage fallback. The Settings page can export, import or clear browser data. See the in-app [privacy note](/privacy).
