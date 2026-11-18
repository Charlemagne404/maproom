# Workstream ownership and dependencies

## Current architecture

Maproom is a client-only Vite/React/TypeScript app. The current source separates game metadata (`src/games/catalog.ts`), the exhaustive lazy UI registry (`src/games/components.tsx`), game-specific interfaces (`src/games/**`), puzzle logic (`src/puzzles/**`), normalized geography and lazy data loaders (`src/geography/**`), shared app state (`src/app/**`), IndexedDB/localStorage persistence (`src/persistence/**`), and the service worker (`public/sw.js`). `src/components/GeoMap.tsx` owns shared SVG map rendering and interaction. Global presentation is currently spread across `src/index.css`, `src/refinement.css`, and `src/theme.css`.

The baseline already contains twelve game IDs and a six-game Daily allowlist. Keep the catalog, stable IDs, component registry and Daily selector as one reviewed integration contract. A game appearing in Explore must not silently become a Daily game.

## Exclusive implementation ownership

| Workstream | Owned paths and responsibility | Must not independently edit |
| --- | --- | --- |
| Historical Geography | New `src/games/historical-geography/**`, `src/geography/historical/**`, `src/puzzles/historical-geography/**`, `public/data/historical/**`, `public/illustrations/historical/**`, `docs/data/historical/**`, and historical-specific tests/browser specs. Own the temporal source, validation, lazy loader, game UI, and an Explore collection component. | `src/games/catalog.ts`, `src/pages/ExplorePage.tsx`, shared `src/components/GeoMap.tsx`, persistence, service worker and global styles. Submit the proposed stable ID, catalog metadata, artwork case, Explore insertion and offline contract for integration. The single additive ID/type and lazy-registry entries are this stream's only permitted edits to `src/geography/types.ts` and `src/games/components.tsx`; coordinate those exact additions with the coordinator. |
| Daily System | `src/daily/**`, `src/pages/DailyPage.tsx`, and Daily-specific unit/browser tests. Own deterministic selection, schedule fairness, daily identity/version rules, daily UI and a Daily-specific persistence adapter behind a documented interface. | `src/games/catalog.ts`, `src/games/components.tsx`, shared `src/geography/types.ts`, `src/persistence/**`, `src/app/**`, `src/statistics/**`, and `public/sw.js`. Use existing IDs and app history/session contracts; hand off any shared persistence/schema changes for integration. |
| Geography Connections | `src/games/connections/**`, `src/puzzles/connections.ts` and Connections-specific tests, browser specs and namespaced styles. Own the complete Connections interaction, puzzle pool, ambiguity checks, feedback and animations. | Game catalog/IDs, shared game controls/results, other game folders, shared map, global styles/tokens, Daily code and shared persistence. |
| Maps & Gameplay UX | `src/components/GeoMap.tsx`; `src/games/border-route/**`, `country-map/**`, `cities/**`, `flags/**`, `outlines/**`, `neighbours/**`, `connections-grid/**`, `riverways/**`, and `latitude-ladder/**`; plus map/game-specific modules and tests in those owned folders. Own shared map gestures and the listed map/game refinements. | `src/puzzles/engine.ts`, stable game IDs/catalog/lazy registry, shared game controls/results, global styles/tokens, app shell, Daily logic and persistence. Put new pure logic in the owning game folder; request changes to shared modules through an interface proposal. |
| Mobile Experience | New `src/styles/mobile/**`, the stylesheet import in `src/main.tsx`, and mobile-specific Playwright specs/screenshots. Own responsive shell, Explore, Daily and non-map-game presentation, safe areas, navigation layout and mobile QA. Use existing DOM/class hooks. | Markup in `Shell.tsx`, `ExplorePage.tsx`, `DailyPage.tsx` or game components; map gestures and map-game stages; shared global styles/tokens. Ask the markup owner for a stable hook if one is missing. Coordinate map viewport constraints with Maps & Gameplay UX. |
| Website Fundamentals | `index.html`, `public/robots.txt`, `public/sitemap.xml` or a scoped generator, `src/seo/**`, SEO/security/performance/browser checks, and website shell/page markup in `src/App.tsx`, `src/components/Shell.tsx`, `src/pages/ExplorePage.tsx`, `InformationPage.tsx`, and `NotFoundPage.tsx`. Own desktop homepage/navigation/content polish and discoverability review. | `src/main.tsx`, Daily page logic, game implementations, map interactions, shared game controls, global tokens/styles, persistence and service-worker internals. Preserve class/data hooks consumed by Mobile CSS. Route metadata must fit the static SPA and host fallback. |

These boundaries are intentional even when a workstream could make a shared file change quickly. The owner may create an isolated component or adapter; the coordinator owns cross-cutting wiring during integration.

## Protected shared contracts

| Shared area | Current source | Contract |
| --- | --- | --- |
| Game IDs, metadata, routes and Daily membership | `src/geography/types.ts`, `src/games/catalog.ts` | Keep IDs stable because saved history uses them. The catalog owns titles/routes/formats; Daily membership stays explicit. Historical proposes metadata and remains ineligible for Daily by default. Coordinator reviews registry/catalog changes together. |
| Lazy game registry and shared artwork switch | `src/games/components.tsx`, `src/components/GameArtwork.tsx` | Keep the `Record<GameId, …>` exhaustive. Historical may submit one scoped registration/artwork addition; no stream changes unrelated cases. |
| Game entry, setup, settings, results and reusable UI | `src/components/Shell.tsx`, `GameEntryContext.ts`, `FreePlaySetupContext.ts`, `GameSetupOverlay.tsx`, `GameControls.tsx`, `GameResults.tsx`, `Kit.tsx` | Reuse existing contracts. Propose changes instead of forking or changing shared controls from a game branch. Website owns only Shell markup; shared game-entry behavior remains an integration seam. |
| Daily puzzle engine and generic puzzle helpers | `src/puzzles/engine.ts`, `src/hooks/usePuzzleDate.ts` | Treat as shared and read-only in the six streams. Put isolated algorithms in each owned feature module. Daily IDs and versions must remain deterministic and compatible with saved sessions. |
| Geography types, data catalog and loaders | `src/geography/types.ts`, `data.ts`, `eligibility.ts`, `public/data/data-manifest.json` | Reuse existing normalized types and validation. Historical keeps its new format under its own loader and proposes any common type changes. Maps must not make unrelated data-loader changes. |
| Persistence, statistics and offline shell | `src/app/**`, `src/persistence/**`, `src/statistics/**`, `public/sw.js`, `scripts/build-precache-manifest.mjs` | Keep schema migrations and shared exports/import, result history and precaching for integration. Daily can build a tested adapter in `src/daily/**`; its final connection to app state is a coordinated integration change. Runtime cache already caches same-origin `/data/` responses after fetch. |
| Design tokens and global styles | `src/theme.ts`, `src/theme.css`, `src/index.css`, `src/refinement.css` | No parallel edits. Use existing tokens; create namespaced CSS in the owned feature directory. Shared token or reset changes wait for integration. |

## Required cross-stream agreements

- **Historical + Daily:** agree on one stable historical game ID, route, result/session shape, registration sequence, canonical puzzle date policy and a versioned eligibility interface. Historical supplies a game; Daily selects exactly six eligible games. Historical stays opted out unless the coordinator deliberately enables it after fairness and deterministic-seed review.
- **Maps + Mobile:** Maps owns map gestures and map-stage geometry. Mobile owns surrounding app layout and safe areas. Agree on viewport CSS properties, available map height, `touch-action`, wheel/pinch behavior and device QA; Mobile must not add competing handlers to the map SVG.
- **Website + Mobile:** Website owns semantic markup and navigation/content decisions. Mobile owns responsive CSS only. Keep existing hooks or agree on stable `data-*` hooks before renaming classes.
- **Connections isolation:** keep Connections changes in its own game and puzzle modules. If it needs a shared component change, submit an API request; do not broaden the change into other game implementations.

## Dependency overview

```text
Website markup/hooks ──> Mobile responsive CSS
Maps GeoMap contract ──> map-game UI <──> Mobile viewport QA
Historical game/data ──> one reviewed catalog/Explore registration
Historical registration ──> optional Daily eligibility review
Connections game/puzzles ──> shared controls only through existing API
Daily selector ──> stable game IDs + app persistence adapter at integration
```

The stream branches are parallel implementation proposals; the diagram describes integration dependencies, not permission to edit another owner's files.
