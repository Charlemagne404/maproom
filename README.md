# Maproom

Maproom is a self-hosted geography game library built around six daily puzzles and unlimited practice: country and region maps, country outlines, land-border routes, flags, a 3×3 geography grid, and capitals and cities. It is a client-only React application. Game history, favorites and preferences stay in the browser; no account or gameplay backend is required.

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

`npm run build` writes the static production application to `dist/`. See [the architecture](docs/ARCHITECTURE.md), [game rules](docs/GAME_RULES.md), and [design system](docs/DESIGN_SYSTEM.md) for implementation details.

## Self-hosting

The production files are served by the existing Caddy instance. The live site currently points to `/srv/maproom/releases/1.1.0-cb626ad2bedd`; the public homepage returned HTTP 200 on 2026-11-16. The refinement builds locally as version 1.2.0 and remains an unactivated candidate until the operator runs the prepared handoff:

```sh
sudo /home/charlie/maproom/scripts/finalize-deployment.sh
```

The script validates Caddy before any configuration change, keeps a timestamped Caddyfile backup if needed, atomically changes `/srv/maproom/current`, and checks the origin and public URL. This workspace has not activated the 1.2.0 candidate. See [deployment](docs/DEPLOYMENT.md) and [operations](docs/OPERATIONS.md) for the current boundary and rollback details.

## Data and privacy

The site includes Natural Earth country geometry, country metadata from mledoze/countries, 2023 World Bank population estimates, GeoNames populated places, 198 currently downloadable first-level boundary packages from geoBoundaries, and locally bundled flag SVGs. Sources, per-country license evidence, retrieval dates, hashes, transformations and limitations are available in the app at `/data` and in [the data-source notes](docs/DATA_SOURCES.md). The current city file includes 34,456 places; it keeps places of at least 50,000 population plus national and first-level seats below that threshold.

Progress is stored in IndexedDB, with a localStorage fallback. The Settings page can export, import or clear browser data. See the in-app [privacy note](/privacy).
