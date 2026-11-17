# Architecture

## Runtime shape

Maproom is a static single-page application built with Vite, React and strict TypeScript. React Router maps `/`, `/explore`, `/statistics`, `/settings`, `/games/:gameId`, `/about`, `/data` and `/privacy`. Caddy serves the same `index.html` for client-side routes. There is no application server, account system, analytics script or gameplay API.

Game features are loaded with React lazy imports. The small world-country catalog and country geometry load when a game opens. The 34k city gazetteer loads only in the Cities game. Each first-level boundary file is a separate TopoJSON package requested only when that country is selected; the browser keeps successful requests in a module-level promise cache and the service worker caches packages on first use.

## Module responsibilities

- `src/geography`: normalized domain types and lazy fetch/validation for country, city and ADM1 data.
- `src/puzzles/engine.ts`: name normalization, date-in-time-zone, versioned puzzle IDs, seeded randomness, route graph algorithms, distance scoring and validated grid presets.
- `src/games`: six game interfaces and their game-specific question configuration. `session.ts` gives each game one idempotent result-save path.
- `src/persistence`: IndexedDB schema v1 for settings, favorites and result history, localStorage fallback, sanitization and JSON import/export.
- `src/statistics`: pure aggregation for totals, per-game records, streaks and a 14-day daily-score trend.
- `src/components/GeoMap.tsx`: D3 Geo Equal Earth/Mercator SVG renderer, keyboard country selection, zoom/pan, and city-marker placement.
- `src/app/AppData.tsx`: application data provider that coordinates persistence and live UI state.
- `public/sw.js`: content-fingerprinted precaching of compiled app assets, runtime caching for opened geography data, and a static offline page. The build step replaces the worker's cache-version marker with a hash of the complete static release so data-only updates also clear stale cached files.
- `scripts/data/build-geography.mjs`: reproducible upstream fetch and normalization pipeline; `docs/DATA_COVERAGE.md` is generated from its results.

## Daily puzzle stability

Each game uses `gameId:YYYY-MM-DD:v1` as its daily puzzle identifier. The date is calculated with `Intl.DateTimeFormat` in the saved timezone (initially `Europe/Stockholm`), so daylight-saving offsets are handled by the runtime timezone database. A seeded PRNG and stable shuffle choose daily questions; each game adds a feature-specific suffix to the seed. The puzzle version is centralized in `PUZZLE_VERSION`. If a future release changes generation in a way that changes answers, increment that version.

The route generator builds a graph from reciprocal country neighbor references, which avoids treating a one-sided source relationship as a shared land border. It searches for a connected start and end pair with bounded BFS and falls back to a known connected pair if random attempts fail. Grid presets are filtered against the currently loaded country facts before play, and every intersection must have at least one answer.

## Persistence and data flow

The game submits a validated `GameResult` through the app provider. Results are stored by ID in IndexedDB, newest first in application state, and an IDB failure falls back to a bounded localStorage export. Daily IDs are unique, so a completed daily result cannot be duplicated by refreshing. Practice sessions receive unique IDs. Export is a versioned JSON document; imports are size-limited in the interface and validated before replacing stored state. Reset requires an in-app confirmation.

Geographic files are public static assets, not user data. Their provenance is in `public/data/data-manifest.json` and `region-index.json`, with a human-readable summary in [DATA_SOURCES.md](DATA_SOURCES.md) and country-by-country details in [DATA_COVERAGE.md](DATA_COVERAGE.md).

## Deliberate limits

Country shapes are 1:50m generalized features, suitable for world-scale interaction but not legal or cadastral use. Administrative boundary availability and licensing differ by country. City questions use GeoNames places500 rather than a complete gazetteer. Route adjacency follows the selected country catalog's neighbor list; it does not model maritime borders, disputed claims or every micro-enclave separately. All progress is local to one browser and does not synchronize between devices.
