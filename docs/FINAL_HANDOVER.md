# Maproom final handover

- **Status date:** 18 November 2026
- **Package version:** 1.2.0
- **Branch:** `codex/maproom-daily-gameplay-corrections`
- **Latest commit:** `cc5d1fc` (`fix: draw full Cyprus island outline`)

## Current state

Maproom is a static, client-side geography game library with twelve games: six curated Daily puzzles and six Free Play games. The continuous-development work and pre-existing local work remain uncommitted together. Several files contain mixed changes, and no baseline patch was captured before the mission; separating ownership now would risk removing or misattributing valuable work. Generated geography and illustration files are intentional build inputs. No reset, commit, push, deployment, publication, `sudo` command or production change was made during finalization.

The local production build and its static artifacts are reviewable in `dist/`. The deployment finalizer checks the required shell, catalog, TopoJSON boundaries, city files, Riverways data, source manifests and first-level boundary packages before it can publish. Artifact checks were verified locally. The deployment script itself was not run. The last documented read-only host check is from 17 November 2026; the host was not rechecked during finalization.

## Game library

| Game | Core activity | Daily |
| --- | --- | :---: |
| Find the country | Identify a country from a clue on the map | Yes |
| Country outlines | Identify a country from its silhouette | Yes |
| Border route | Connect two countries through land neighbors | Yes |
| Flag study | Identify a country or flag | Yes |
| Geography grid | Fill nine country-clue intersections with distinct answers | Yes |
| Capitals & cities | Recall capitals, locate cities and identify marked places | Yes |
| Geography Connections | Find four groups of related countries | No |
| Higher or Lower | Compare country population, area or density | No |
| Neighbour Challenge | Recall all reciprocal land neighbors | No |
| Distance & Direction | Compare city distance, latitude or longitude | No |
| Riverways | Name a highlighted river trace | No |
| Latitude Ladder | Order five cities by latitude or longitude | No |

Adding a game to the catalog does not add it to Daily. Daily membership is an explicit allowlist; puzzle IDs are versioned so answer-generation changes can preserve completed history and discard incompatible unfinished sessions.

## UX and gameplay refinements

- The home page uses stable varied greetings, a clearer resume action, and a full-bleed Play Anytime section. Navigation preserves the entry context so a game can return to Daily, Explore or its source page; utility icons, hover transitions and focus states are lighter while remaining operable.
- The existing topographic setup overlay remains the entry point to Free Play. Map-based games give the map more vertical room, use responsive framing and map controls, and place game-specific controls in compact floating docks where that fits the mechanic. Map-only Find the country has no search answer field and supports small-island selection.
- Border Route accepts intermediate countries in any order, validates the selected collection against the recorded reciprocal-neighbor graph, and shows a valid geographic ordering. Flag Study uses direct selection and answer states; Capitals & Cities centers map placement and tucks coordinate entry into a secondary disclosure. Geography Grid shows row and column criterion feedback and offers expanded, sourced criteria in Free Play while retaining the existing Daily pool.
- Segmented progress indicators replace numeric counters in discrete rounds where they fit. Games advance automatically after brief answer feedback when another guess is not part of the mechanic; games that require checking a set or reviewing a completed result keep that deliberate action. All twelve games retain their own layout and replay flow.
- The future Blind coordinates idea is documented as a possible Capitals & Cities mode only; it is not implemented, a new game, or a current commitment. The research notes also explain the GeoGrid reference, Maproom's different scarcity rule, and the UN/EU source basis for the expanded Grid criteria.
- Review [GAME_AUDIT.md](GAME_AUDIT.md) for per-game findings, [GAME_RULES.md](GAME_RULES.md) for play rules and scoring, and [GAME_RESEARCH.md](GAME_RESEARCH.md) for the competitor/source notes. Browser evidence is from local Chromium and responsive viewport checks, not physical-device or moderated player studies.

## Architecture and shared systems

- Vite, React and strict TypeScript build a static single-page application; there is no gameplay API, account system or server-side progress store.
- `src/games/catalog.ts` owns game metadata and the Daily allowlist. `src/games/components.tsx` is an exhaustive lazy component registry keyed by stable game IDs.
- Puzzle generation and scoring live in pure modules under `src/puzzles/`; `src/geography` owns normalized types, eligibility and lazy, validated dataset loading.
- Shared setup, controls, `useGameSession`, results dialogs and the app data provider connect game-specific loops to settings, resumable progress, result history, favorites and statistics without forcing a common game engine.
- IndexedDB schema v2 stores settings, favorites, history and sessions. Sanitized localStorage mirrors/fallbacks, JSON import/export and versioned session snapshots support recovery and compatibility.
- The service worker precaches the compiled shell and caches geography files when first requested. The app can reopen previously visited routes and datasets offline; each lazy game dataset must first have been fetched online in that browser.
- Game components and datasets load on demand. Fact-only games skip country boundaries; detailed outlines, city data, rivers and country-specific ADM1 packages load only where used.

## Geography sources and limits

- Natural Earth provides generalized 1:50m country geometry, 1:10m outline geometry and the named 1:50m river centerlines. These are world-map sources, not legal boundaries, complete hydrology or navigation data.
- The normalized country catalog derives from mledoze/countries; World Bank 2023 observations provide population where available. Border and dispute answers follow the catalog's reciprocal land-neighbor model and do not adjudicate maritime or contested boundaries.
- GeoNames cities500 supplies the 34,456-place full file and the derived 12,405-place comparison file. Latitude Ladder uses a 100,000 population threshold; city coverage is not exhaustive, and capital names/coordinates are incomplete for some territories.
- First-level administrative data comes from 198 geoBoundaries packages, with per-country licenses and coverage recorded in `region-index.json` and the data documentation. Availability and terms differ by country.
- Source hashes, transformations and attribution are recorded in the manifest. See [data sources](DATA_SOURCES.md), [coverage](DATA_COVERAGE.md) and the in-app Data page before refreshing or distributing datasets.

## Outstanding technical debt and limitations

- Progress is local to one browser and does not sync between devices. Browser storage can still be cleared outside the app; players should export important history.
- The setup rules and new games have engineering self-play coverage, not moderated player evidence. Difficulty, clarity and long-term replay value remain unmeasured.
- Automated contrast and browser accessibility-tree checks cover sampled routes and states. Targeted Orca checks exist for selected flows, but final spoken casing for the Grid counter, broader map-heavy screen-reader use, voice control, braille and human listening remain open.
- Local Chromium checks do not establish physical-device performance, hosted Core Web Vitals, browser-storage limits or behavior across every assistive technology.
- Country, administrative, city and river data retain the coverage, year, generalization and naming limits described above; none should be presented as exhaustive or authoritative for legal use.

## Recommended next development phase

1. Run moderated sessions for Grid, Connections, Riverways and Latitude Ladder; measure comprehension, difficulty and replay interest.
2. Complete screen-reader and voice-control review for map-heavy games and verify the Grid announcement with a human listener.
3. Measure cold loads, touch targets and storage behavior on physical phones and on a hosted connection.
4. Resolve follow-up bugs from that evidence before selecting another game or dataset. Future concepts in `GAME_CONCEPTS.md` are proposals, not commitments.

## Continuing game development

Follow the steps in [Architecture — Adding a game](ARCHITECTURE.md#adding-a-game): use a stable ID, add metadata and a lazy component, keep deterministic puzzle logic testable outside React, validate optional data at its loader boundary, and reuse shared settings/session/results. Leave new games out of the Daily allowlist until a deliberate deterministic puzzle and version policy are ready. Add catalog, data, unit and browser coverage; update rules, audit and source attribution; then verify keyboard, mobile and both themes.

## Final validation

The current refinement passed `npm run typecheck`, `npm run lint`, `npm test` (15 files, 85/85 tests), a fresh production build (2,183 modules; 188 precached assets; build ID `a492d9c43da55dae`), and the complete production-preview Playwright suite (55/55 in 9.2 minutes). No tests were skipped or weakened.

Read-only artifact validation passed for the app shell, compiled JavaScript and CSS, all 14 required static files, all 188 precached assets with a matching service-worker build ID, eight dataset/catalog checksums, world and outline TopoJSON (259/269 features), and all 198 indexed regional packages. `git diff --check`, `bash -n scripts/finalize-deployment.sh`, and a trailing-whitespace scan over 37 untracked paths passed. The deployment script was not run.

Git remains on `codex/maproom-daily-gameplay-corrections` at `cc5d1fc`. The working tree has 56 changed tracked paths (54 modified, two deleted) and 37 untracked paths; the two deleted GeoJSON files are replaced by validated TopoJSON assets. No commit, push, deployment, publication, `sudo` command or production change was made. Build and browser checks are local evidence; physical-device performance, moderated play, remaining assistive-technology review, deployment configuration, host readiness and public endpoints are unverified. See [MISSION_PROGRESS.md](MISSION_PROGRESS.md) for the full dated work record.
