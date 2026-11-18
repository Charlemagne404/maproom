# Maps & Gameplay UX workstream

## Goal

Improve the shared map interaction foundation and the named gameplay experiences while keeping controls predictable across mouse, keyboard and touch.

## Owned implementation area

- `src/components/GeoMap.tsx` for shared rendering and map input: zoom, pan, wheel behavior, pointer handling, map labels, keyboard navigation, city markers and map-specific accessibility.
- `src/games/border-route/**`, `country-map/**`, `cities/**`, `flags/**`, `outlines/**`, `neighbours/**`, `connections-grid/**`, `riverways/**`, and `latitude-ladder/**` for game-local mechanics and styling.
- Map/game-specific helpers and tests inside those feature folders, plus map-game browser specs.

Do not modify the global app shell, Mobile stylesheet, shared tokens, catalog/IDs/lazy registry, `src/puzzles/engine.ts`, shared game controls/results, app persistence or service worker. Put pure logic in the owning game folder; request cross-cutting helper changes through the coordinator.

## Work

- Specify zoom and pan bounds, wheel versus page scroll, pointer capture, touch pan/pinch, map selection and reset behavior. Keep map focus visible and map text alternatives available.
- Improve Border Route, Find the Country, Capitals & Cities, Flag Study, Geography Grid, and other map-based games within their existing routes and stable IDs.
- **Border Route must preserve arbitrary-order intermediate-country selection.** Players may select the intermediate-country set in any order; validate whether the selected set can form a connected path, then display a valid geographic order. Do not require players to enter countries sequentially along the route.
- Preserve each game's distinct goal. Map-only country selection stays map-first; flag selection remains explicit; city placement has a usable map target; Grid remains a clue/intersection game and does not gain unsupported map assumptions.
- Keep map data lazy and use the current validated geography model. Do not download boundaries for games that only need country facts.
- Keep gestures compatible with page scrolling and inputs. Agree with Mobile on available map height, safe-area boundaries, viewport CSS properties and touch-action; this stream owns the map-stage response and gesture handlers.

## Handoff and acceptance

Document the shared GeoMap API/gesture contract and changed paths. Include route and set-validation tests for Border Route's unordered mechanic, keyboard and touch browser cases for each changed game, representative mouse/touch screenshots at desktop and narrow viewports in both themes, and performance/resource evidence for optional geometry. Identify any requested shared component or token change rather than editing it in parallel.
