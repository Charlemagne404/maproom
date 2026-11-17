# Architecture

## Runtime shape

Maproom is a static single-page application built with Vite, React and strict TypeScript. React Router maps `/`, `/explore`, `/statistics`, `/settings`, `/games/:gameId`, `/about`, `/data` and `/privacy`. Caddy serves the same `index.html` for client-side routes. There is no application server, account system, analytics script or gameplay API.

Game features are loaded with React lazy imports. The small world-country catalog and country geometry load when a game opens. The 34k city gazetteer loads only in the Cities or Distance & Direction games. Each first-level boundary file is a separate TopoJSON package requested only when that country is selected; the browser keeps successful requests in a module-level promise cache and the service worker caches packages on first use. The boundary loader corrects spherical ring winding for D3 and repairs UTF-8 names that arrived mojibaked in three source packages.

## Module responsibilities

- `src/geography`: normalized domain types and lazy fetch/validation for country, city and ADM1 data.
- `src/puzzles`: shared answer normalization, date-in-time-zone and seeded randomness; route graph generation; country-measure and city-distance comparison; Connections board validation; and geography-grid generation/answer scoring.
- `src/games`: ten lazy-loaded game interfaces and their game-specific session controls. `session.ts` gives every game one idempotent result-save path.
- `src/persistence`: IndexedDB schema v1 for settings, favorites and result history, localStorage fallback, sanitization and JSON import/export.
- `src/statistics`: pure aggregation for totals, per-game records, streaks and a 14-day daily-score trend.
- `src/components/GeoMap.tsx`: D3 Geo Equal Earth/Mercator SVG renderer, keyboard country selection, zoom/pan, and city-marker placement.
- `src/app/AppData.tsx`: application data provider that coordinates persistence and live UI state.
- `public/sw.js`: content-fingerprinted precaching of compiled app assets, runtime caching for opened geography data, and a static offline page. The build step replaces the worker's cache-version marker with a hash of the complete static release so data-only updates also clear stale cached files.
- `scripts/data/build-geography.mjs`: reproducible upstream fetch and normalization pipeline; `docs/DATA_COVERAGE.md` is generated from its results.

## Daily puzzle stability

Daily IDs use `gameId:YYYY-MM-DD:vN`. The date is calculated with `Intl.DateTimeFormat` in the saved timezone (initially `Europe/Stockholm`), so daylight-saving offsets are handled by the runtime timezone database. A seeded PRNG and stable shuffle choose daily questions; each game adds a feature-specific suffix to the seed. `PUZZLE_VERSION` supplies version 1, with per-game overrides for mechanics that change answer identities; Geography Grid is version 2. The home and game pages recognize an already completed daily by game and local date so a version update does not erase its completion mark. Future changes that alter daily answers should receive a deliberate version bump.

The route generator builds an undirected graph from the country catalog's neighbor references, retaining mapless country codes for text entry. Bounded BFS checks every route endpoint pair before it can be played. Geography grids are generated from sourced country attributes at runtime, reject intersections with too few or too many candidates, and require a nine-country distinct-answer assignment. Geography Connections uses country-only fact groups and rejects a board if another supported category creates a second possible four-country grouping.

## Persistence and data flow

The game submits a validated `GameResult` through the app provider. Results are stored by ID in IndexedDB, newest first in application state, and an IDB failure falls back to a bounded localStorage export. Daily IDs are unique, so a completed daily result cannot be duplicated by refreshing. Practice sessions receive unique IDs. Export is a versioned JSON document; imports are size-limited in the interface and validated before replacing stored state. Reset requires an in-app confirmation.

Geographic files are public static assets, not user data. The country catalog and world geometry load with game routes, the 34k city gazetteer is requested only by Cities and Distance & Direction, and each first-level boundary package is requested only when a supported country is selected. Their provenance is in `public/data/data-manifest.json` and `region-index.json`, with a human-readable summary in [DATA_SOURCES.md](DATA_SOURCES.md) and country-by-country details in [DATA_COVERAGE.md](DATA_COVERAGE.md).

## Deliberate limits

Country shapes are 1:50m generalized features, suitable for world-scale interaction but not legal or cadastral use. Administrative boundary availability and licensing differ by country. City questions use GeoNames cities500 rather than a complete gazetteer. Population is the 2023 World Bank estimate where available; area and land-border facts follow the country catalog. Route and neighbor answers do not model maritime borders or adjudicate disputed claims. Geography Connections currently groups countries rather than cities. All progress is local to one browser and does not synchronize between devices; missed-answer prioritization is currently available for countries and flags.
