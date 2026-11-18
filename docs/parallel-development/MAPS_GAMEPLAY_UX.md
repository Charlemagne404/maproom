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

## GeoMap viewport and gesture contract

- `GeoMap` owns pointer, wheel and touch gesture handling. Do not attach a second gesture listener to the SVG or override its `touch-action` rule in responsive CSS.
- The SVG uses `touch-action: none` while active. One pointer pans; two touch pointers pinch and pan. Pointer capture stays on the original SVG hit element so country clicks still reach their target while a drag can continue outside the SVG. UI controls sit beside the SVG and do not start a map gesture.
- A native, non-passive wheel listener handles zoom only on the map. It normalizes line, page and pixel deltas for mouse wheels and trackpads, anchors zoom under the pointer, and prevents page scrolling for that event. Page scrolling remains available outside the SVG.
- Zoom is bounded from 1× to 4×. Wheel and button zoom ease over 150 ms; active drags and pinches update directly. The transition is disabled for `prefers-reduced-motion`.
- `.map-shell` and `.geo-map` fill their host. The parent map stage must provide a usable height or aspect ratio; mobile can set the stage height from its available viewport and safe-area layout. Bottom input docks should account for `env(safe-area-inset-bottom)` without changing the SVG's gesture surface.
- `focusCodes`, `focusPadding` and `localFit` control only explicit geographic framing. Do not pass hidden answer geography from Find the Country or City Location; country-level focus is safe when the prompt already names that country.
- Keyboard country selection remains on the country paths with visible `:focus-visible` feedback. Map buttons keep their own focus ring and remain outside the pan/pinch surface.

## Changed paths and verification

- Shared map: `src/components/GeoMap.tsx`, `src/components/GeoMap.css`.
- Border Route: `src/games/border-route/BorderRouteGame.tsx`, `src/games/border-route/BorderRouteGame.css`, `src/games/border-route/routeOrdering.test.ts`.
- Find the Country: `src/games/country-map/CountryIdentificationGame.tsx`, `src/games/country-map/CountryIdentificationGame.css`.
- Capitals & Cities: `src/games/cities/CitiesGame.tsx`, `src/games/cities/CitiesGame.css`.
- Flag Study: `src/games/flags/FlagGame.tsx`, `src/games/flags/FlagGame.css`.
- Geography Grid: `src/games/connections-grid/GeographyGridGame.tsx`, `src/games/connections-grid/GeographyGridGame.css`.
- Browser coverage: `e2e/maps-gameplay-ux.spec.ts`, `e2e/product.spec.ts`, and the existing `e2e/map-keyboard-navigation.spec.ts`.
- Captures are in `artifacts/qa/maps-gameplay-ux/`, with desktop light and narrow dark views for Border Route, Find the Country, City Location, Flag Study and Geography Grid.

Verification completed in the maps worktree:

- `npm run typecheck`, `npm run lint`, `npm test` (87/87), and `npm run build` passed.
- `e2e/maps-gameplay-ux.spec.ts` passed 8/8, covering mouse-wheel and pixel-trackpad zoom, cursor anchoring, drag, scroll containment, limits and reset, touch pan/pinch, unordered Border Route entry, small-island mouse/keyboard/touch selection, city marker touch/keyboard feedback, capital hints, flag feedback and Grid overlay/input feedback.
- Focused `e2e/product.spec.ts` checks passed for Border Route's reverse-order shortest path, Grid's distinct answers and keyboard overlay handling, Cities capital/coordinate/city-identification flows, and Flag mobile touch input. `e2e/map-keyboard-navigation.spec.ts` passed 1/1.
- Playwright ran on an isolated local preview port so the sibling workstream previews on ports 4173 and 4174 remained untouched. Mouse-wheel and trackpad inputs were browser-simulated; touch was emulated in Chromium rather than measured on a physical device.
- No optional or additional boundary geometry was added; the games reuse the existing normalized geography data and lazy-loading paths.
