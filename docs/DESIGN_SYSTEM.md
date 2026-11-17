# Maproom design system

## Direction

Maproom pairs a warm paper frame with charcoal map water, cream land and a restrained orange accent. Its identity comes from geography itself: coastlines, country silhouettes, routes, flags, coordinates and crossings. Those shapes can feel precise while the typography, spacing and feedback keep the experience welcoming.

The lowercase `maproom.` wordmark is the primary brand mark. Charcoal carries the lettering and the small period uses the existing orange. The PWA icon reduces this to a simple `m.` on charcoal.

The home page has a thin sticky navigation, a centered time-of-day greeting and Stockholm date, then a small “Today’s puzzles” heading and a varied tile mosaic. There is no explanatory hero copy. Tile color and map-derived artwork give the six puzzles their own character while the shape and spacing keep them part of one collection.

## Color and type

Palette tokens live in `src/index.css`:

| Token | Value | Use |
| --- | --- | --- |
| Warm cream | `#F5EEE5` | Page surface |
| Charcoal | `#292622` | Type, map water and dark tiles |
| Orange | `#E57937` | Brand period, active geography and selected states |
| Sand | `#E5D6C4` | Secondary surfaces, land and tile backgrounds |
| Warm line | `#D5C7B7` | Quiet separators and form borders |

Nunito Sans is the primary family. It is bundled locally at weights 400, 500, 600 and 700 and is used across the wordmark, navigation, game questions, controls, statistics and supporting pages. Letter spacing is tighter on large headings and relaxed on labels and longer text.

The application compared locally rendered Inter, Nunito Sans, Source Sans 3 and Lato on the home page, country map and geography grid. Nunito Sans was selected for its softer shapes and warmth while keeping labels and small controls clear. The other three read more neutral or formal in these screens. No remote font request is required.

## Illustration system

`src/components/GameArtwork.tsx` gives each puzzle a different visual cue: a Natural Earth world map with a selected country, a real Madagascar outline, a dotted route over map geometry, locally bundled flags, a nine-square intersection board, and city points with coordinates. The map art is generated from `public/data/countries.geojson` by `scripts/data/build-illustrations.mjs` before production builds. Its Douglas–Peucker simplification is only for small card illustrations; gameplay maps keep the bundled geography data.

The homepage uses a 12-column mosaic. The country map gets the broad lead tile; the outline and route tiles sit beside it; flags, grid and cities complete the next row. Tablet and phone layouts adjust the tile proportions for the available width.

## Game compositions

- **Country map:** a compact game bar and a single country question lead into a wide, dominant world map. The answer field floats at the lower-left on desktop and moves below the map on phones. Progress and immediate feedback stay secondary.
- **Outlines:** the isolated silhouette is large and centered on charcoal. Guesses, the six-attempt meter and answer field sit close to it.
- **Border routes:** the start and destination names frame a broad map. A small map key identifies the endpoints and current path; a compact route tray holds the entered stops, country field and hint.
- **Flags:** a substantial flag shares the stage with clear answer choices on wide screens and stacks above them on phones.
- **Geography grid:** all nine cells are square, light and easy to distinguish. The active row and column labels connect visually to the selected cell; one answer panel stays beside the grid on wide screens and below it on phones.
- **Capitals and cities:** capital rounds use focused text or choice answers. Location rounds give the interactive map the full stage and place direct marker or coordinate entry close beneath it.

These layouts share type, palette, map rendering and interaction rules without forcing each puzzle into the same page template.

## Interaction and responsive behavior

Navigation links use a short expanding orange underline. Tiles lift slightly; buttons, filters, cells, map controls, search suggestions and favorites each have focused hover, pressed, disabled or selected states where they apply. Keyboard focus is visible, touch targets remain practical, and selection is communicated without relying on hover or color alone. Reduced-motion preferences shorten or remove transitions.

Desktop has a thin centered navigation. Small screens use a compact menu that works on both library and game pages, closes on Escape and returns focus to its toggle. Gameplay controls move with their map, grid or flag rather than leaving a disconnected side rail on narrow screens.

## Boundaries and QA

The refinement keeps the existing puzzle engine, daily determinism, practice modes, local persistence schema, geography data, statistics, favorites, import/export and service worker. It adds no account, progress format or game rule.

The browser QA run covers the home, Explore, statistics, settings, data and information pages; all six game families; desktop, laptop, tablet and mobile widths; answer flows; map zoom and touch; favorites and search; keyboard navigation and menu behavior; and the offline service worker. Browser screenshots establish rendered Chromium behavior. Physical-device, assistive-technology and GPU validation remain separate.
