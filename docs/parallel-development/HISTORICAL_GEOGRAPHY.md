# Historical Geography workstream

## Goal

Create a new historical map guessing game and a historical collection in Explore. Research and source dated maps or boundaries that can support fair, reproducible questions. Preserve Maproom's offline-first, source-transparent design.

## Owned implementation area

- `src/games/historical-geography/**` for the game component and game-local presentation.
- `src/geography/historical/**` for a versioned, validated lazy loader and historical data types.
- `src/puzzles/historical-geography/**` for deterministic question generation, scoring and validation.
- `public/data/historical/**` for only the reviewed, distributable derived data and source/license notices.
- `public/illustrations/historical/**` for game-local art.
- `docs/data/historical/**` and historical-specific unit/browser coverage.
- A self-contained Explore collection component in the game feature folder. The coordinator adds it to `src/pages/ExplorePage.tsx` during integration.

The one additive stable ID/type, lazy UI registration and artwork case in `src/geography/types.ts`, `src/games/components.tsx` and `src/components/GameArtwork.tsx` may be proposed by this stream after coordinating the exact identifier with Daily. Do not edit `src/games/catalog.ts` or `ExplorePage.tsx`; hand off the metadata and collection insertion for the coordinator's integration change. Do not modify `GeoMap.tsx`; use its existing `features`/map interaction interface where it fits and request any extension explicitly.

## Work

- Research historical map sources, date coverage, projection/scale, geographic naming, boundary interpretation, source quality and redistribution terms before selecting data.
- Build a small explainable collection with stable source IDs, source dates, citations, attribution and known gaps. Record transformations and hashes. Distinguish claims shown by the source from modern borders or names.
- Keep loading lazy and validate the data at the fetch boundary. Keep map/code size bounded; no remote tile, image or geocoding dependency in gameplay.
- Design fair prompts with enough visual evidence, repeatable deterministic selection and clear reveal/explanation. Add content validation for ambiguous or under-specified records.
- Deliver a collection component that can be mounted by Explore without changing existing game cards or shared filters.

## Registration and Daily contract

Agree one stable ID and route with the Daily stream before adding any typed ID/registry line. Supply the `GameInfo` metadata entry, game artwork registration, Explore insertion point, session result shape and lazy data contract as a short integration patch/request. The shared catalog and final Explore composition are wired once during integration. Adding this game must not add it to the current Daily pool. Daily eligibility is a later explicit opt-in after deterministic identity, content volume, difficulty, fairness and offline behavior are reviewed.

## Handoff and acceptance

Provide source URLs, license evidence and attribution text; generated-data checks; documented coverage and known historical/geopolitical limitations; deterministic puzzle tests; game/browser tests; desktop and mobile screenshots in light and dark themes; and the exact registration/Explore changes requested. Keep historical data usable offline after its first successful fetch and document if initial offline use requires precaching.
