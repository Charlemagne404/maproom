# Historical expansion report

Completed on 20 November 2026 on `codex/maproom-historical-expansion`.

## Delivered

- Expanded Historical Geography with 41 Cliopatria maps in curated regional and global frames, year-entry and three-map ordering formats, era filters, three difficulty settings, BCE/CE controls without a year zero, zoom, source intervals, attribution, uncertainty, results and replay.
- Kept CShapes v1 session progress on the legacy game. New sessions use the expanded atlas. The legacy pack retains its own source and license disclosures.
- Added Historical Flags with 20 source-linked entries from 19 entities, 12 documented and 8 reconstructed artwork labels, two answer directions, source reveals, progress, results and replay.
- Added Historical States & Empires with four distinct polity choices, regional and global frame recognition, source intervals and context reveals, saved progress, results and replay.
- Reworked Explore so every game and format appears in one searchable, multi-category grid while preserving favorites and recent-play behavior. Removed the special historical collection hierarchy.
- Added historical-game route metadata and source disclosures. Added the atlas and flag manifests/assets to offline caching and required them in production artifact validation and finalization checks.
- Kept both new games out of Daily; the existing six-from-eight Daily pool is unchanged.
- Added source hashes, data builders, per-flag seed records, generated asset hashes, calibration/logic tests, and source/feasibility/handover documentation.

## Data and scoring

Cliopatria v0.2.1 is pinned to commit `5f433377139a6eeaeacbdc894b70f8805b72c8b5` under CC BY 4.0. The 41 views cover 3300 BCE–1900 CE, 20 curated frames including regional windows and a global view, and 26 named polity identities. Their accepted dates are inclusive intersections of source intervals. The displayed sample date is used for the selected era; the full interval determines exact credit. BCE/CE calculations use astronomical numbering internally and never expose year zero.

The current historical flag set has 20 entries, 19 entities and 12/8 documented/reconstructed drawings. Every entry has an individual citation; all vectors are original Maproom redrawings under CC BY 4.0.

## Scope and limits

The maps are selected polity reconstructions, not exhaustive community coverage or non-overlapping global borders. Blank frame space does not mean uninhabited. Some source ranges are wide, and some regions offer fewer close alternatives. The reveal and documentation identify these limits. Changing Borders was deferred because a reliable before/after game needs comparable, consistently dated full-border data that the selected source set does not provide.

## Validation

Validated on 20 November 2026:

- `npm run typecheck` and `npm run lint` passed.
- `npm test` passed: 30 test files and 156 tests.
- `npm run build` passed. The artifact validator accepted 26 route snapshots, 23 sitemap URLs, 210 precached assets, 198 regional packages, 20 legacy maps, 41 expanded atlas maps and 20 historical flags.
- Nineteen selected Playwright tests passed across the setup/SEO/history suite, mobile layouts for all 18 games, light/dark desktop and mobile product screenshots, and the home/library keyboard and mobile flow. Historical browser checks covered BCE input with no year zero, source-period attribution, keyboard sequence ordering and saved-order restoration, both new games' saved sessions and replay, Explore, and direct routes.
- `git diff --check` passed.

The deployment finalizer now requires the new manifests, maps, flags and routes. It was not run because it publishes a release and changes the live Caddy configuration. No deployment, merge or default-branch change is part of this work.
