# Architecture

## Runtime shape

Maproom is a static single-page application built with Vite, React and strict TypeScript. React Router maps `/`, `/explore`, `/statistics`, `/settings`, `/games/:gameId`, `/about`, `/data` and `/privacy`. Caddy serves the same `index.html` for client-side routes. There is no application server, account system, analytics script or gameplay API.

The shell lazy-loads the game route page when a game is selected, and game features are then loaded with React lazy imports from the exhaustive `src/games/components.tsx` registry. This keeps route-only map and session code out of the Explore and daily shell. The world-country catalog and generalized geometry load when a game opens. Country Outlines lazily loads its detailed Natural Earth 1:10m geometry; other world maps use 1:50m data. Explicit parent-territory relationships split detached possessions into their own Extended identities, while domestic archipelagos remain grouped with their country. The 34k city gazetteer loads only in Cities, Distance & Direction, or Latitude Ladder. Named Natural Earth river centerlines load only in Riverways. Each first-level boundary file is a separate TopoJSON package requested only when that country is selected; the browser keeps successful requests in a module-level promise cache and the service worker caches packages on first use. The boundary loader corrects spherical ring winding for D3 and repairs UTF-8 names that arrived mojibaked in three source packages.

## Module responsibilities

- `src/geography`: normalized domain types, shared Standard/Extended country eligibility, and lazy fetch/validation for country, city, river and ADM1 data.
- `src/puzzles`: shared answer normalization, date-in-time-zone and seeded randomness; route graph generation; country-measure and city-distance comparison; Connections board validation; city-order questions; river alias/segment grouping; and geography-grid generation/answer scoring.
- `src/games/catalog.ts`: game titles, routes, categories, setup formats and the explicit daily allowlist. `src/games/components.tsx` maps each stable game ID to its lazy interface. A `Record<GameId, …>` makes missing component registrations a type error.
- `src/games`: fourteen independently implemented game interfaces and their game-specific session controls. `session.ts` gives every game one idempotent result-save path.
- `src/persistence`: IndexedDB schema v2 for settings, favorites, result history and resumable game sessions, localStorage fallback, sanitization and JSON import/export.
- `src/statistics`: pure aggregation for totals, per-game records, streaks and a 14-day daily-score trend.
- `src/components/GeoMap.tsx`: D3 Geo Equal Earth/Mercator SVG renderer, keyboard country selection, zoom/pan, city-marker placement and an optional line layer used by river questions.
- `src/app/AppData.tsx`: application data provider that coordinates persistence and live UI state.
- `public/sw.js`: content-fingerprinted precaching of compiled app assets, runtime caching for opened geography data, and a static offline page. The build step replaces the worker's cache-version marker with a hash of the complete static release so data-only updates also clear stale cached files.
- `scripts/data/build-geography.mjs`: reproducible upstream fetch and normalization pipeline; `docs/DATA_COVERAGE.md` is generated from its results.

## Daily puzzle stability

Daily IDs use `gameId:YYYY-MM-DD:vN`. The date is calculated with `Intl.DateTimeFormat` in the saved timezone (initially `Europe/Stockholm`), so daylight-saving offsets are handled by the runtime timezone database. A seeded PRNG and stable shuffle choose daily questions; each game adds a feature-specific suffix to the seed. `PUZZLE_VERSION` supplies version 2, with explicit per-game versions where eligibility or question generation changed; Geography Grid is version 3. Daily participation is separately curated in `src/games/catalog.ts`, so registering a game never adds a new daily puzzle by default. The home and game pages recognize completed dailies by game and local date so a version update does not erase completion marks. Future changes that alter daily answers should receive a deliberate version bump.

The route generator builds an undirected graph from the country catalog's neighbor references, retaining mapless country codes for text entry. Bounded BFS checks every route endpoint pair before it can be played. Geography grids are generated from sourced country attributes at runtime, reject intersections with too few or too many candidates, and require a nine-country distinct-answer assignment. Geography Connections uses country-only fact groups and rejects a board if another supported category creates a second possible four-country grouping.

## Persistence and data flow

The game submits a validated `GameResult` through the app provider. Results are stored by ID in IndexedDB, newest first in application state, and an IDB failure falls back to localStorage. Daily IDs are unique, so a completed daily result cannot be duplicated by refreshing. Interrupted game state is saved as a bounded, versioned session snapshot containing the canonical puzzle seed and game-specific progress. A save restores only when its puzzle ID and save version still match; an unfinished save for a superseded puzzle is discarded while its completed history remains intact. Completion removes the matching active snapshot; export/import carries sessions and remains compatible with version 1 progress exports. Reset removes results and active sessions after in-app confirmation.

Geographic files are public static assets, not user data. The lightweight country catalog loads with each game. The 1:50m world geometry loads only for games marked `requiresCountryGeometry` in the catalog; Flags, Geography Grid, Connections, Higher or Lower, and Distance & Direction use country facts without downloading the map. TopoJSON conversion and region winding normalization load only when a supported first-level boundary package is selected. The 1:10m outlines load only in Country Outlines. The 34k city gazetteer is requested only by Capitals & cities, Distance & Direction, or Latitude Ladder. The 148-feature river layer is requested only by Riverways. Their provenance is in `public/data/data-manifest.json` and `region-index.json`, with a human-readable summary in [DATA_SOURCES.md](DATA_SOURCES.md) and country-by-country details in [DATA_COVERAGE.md](DATA_COVERAGE.md).

## Deliberate limits

Country shapes use shared-border TopoJSON quantized at 1e6 and are decoded when a map game requests geometry. The detailed 1:10m outline layer is loaded only by Country Outlines. Their generalized boundaries are suitable for world-scale interaction, not legal or cadastral use. Riverways uses named Natural Earth centerlines filtered to scale rank 4 or better; this is neither complete hydrography nor navigational data. Administrative boundary availability and licensing differ by country. City questions use GeoNames cities500 rather than a complete gazetteer. Capitals & Cities and Daily use the full 34,456-place file; Distance & Direction and Latitude Ladder load an order-preserving 12,405-place subset at the 50,000 population floor. Latitude Ladder further limits its pool to places with population of at least 100,000. Population is the 2023 World Bank estimate where available; area and land-border facts follow the country catalog. Route and neighbour answers do not model maritime borders or adjudicate disputed claims. Geography Connections currently groups countries rather than cities. All progress is local to one browser and does not synchronize between devices; missed-answer prioritization is available for countries and flags.

## Adding a game

Keep the gameplay loop game-specific and reuse the existing boundaries around it:

1. Add a stable string ID to `GAME_IDS` in `src/geography/types.ts`; IDs are also used in saved history, so do not rename or reuse one.
2. Add one metadata entry in `src/games/catalog.ts` with its route, category, card copy, icon and any setup formats. Leave it out of `DAILY_GAME_IDS` unless a deterministic daily implementation and deliberate puzzle version exist.
3. Add the lazy component to `src/games/components.tsx`. Its exhaustive map must compile for every `GameId`.
4. Put answer generation and scoring that can be tested without React in a focused module under `src/puzzles/`. Validate data at its loader boundary in `src/geography/data.ts` and keep optional data lazy.
5. Build the UI around `GameSettingsMenu` / `GameSettingSelect`, `useGameSession`, and `GameResultsDialog`. These provide the setup overlay, resumable progress, result persistence, replay and statistics integration without forcing unlike games into a universal engine.
6. Update the catalog/data integrity tests, add a gameplay browser test, document rules and attribution, and verify desktop, keyboard, mobile and dark-theme behavior.

The registry test compares metadata IDs with `GAME_IDS`; the component registry type-checks against the same union. The daily allowlist is tested separately so adding a practice game cannot silently change today's puzzle set.
