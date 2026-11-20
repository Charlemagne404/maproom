# Historical expansion feasibility

Reviewed 20 November 2026 before final validation.

## Core work

The existing Maproom stack supports new game IDs, route metadata, local game-session persistence, lazy-loaded map assets and service-worker caching. The historical atlas can therefore be expanded without changing the Daily rotation or replacing the older CShapes game. The chosen Cliopatria v0.2.1 release is machine-readable GeoJSON under CC BY 4.0. Its exact release, commit, archive hash and extracted data hash are pinned in the atlas builder and manifest. The source provides signed BCE/CE intervals suitable for interval-based year scoring, plus polygon geometries suitable for curated regional and global views.

Feasibility is bounded by the source: it contains polity and relationship records, overlapping entities and broad date intervals; it is not a full global polity partition or an exhaustive border timeline. The project should select a manageable set of source-backed views and make that scope visible. The source's reuse terms and stable hashes permit a locally bundled generated asset set with attribution.

Historical flag questions are feasible as a curated collection rather than a complete flag encyclopedia. Each entry needs a source, period, design status and visible note when the vector drawing is reconstructed. The included set uses 20 entries across 19 entities, original Maproom vectors and an individual source index.

## Optional Changing Borders stretch

Deferred. The selected atlas features are individually dated polity geometries with broad, overlapping intervals. The reviewed options do not provide one continuous, consistently modeled and consistently licensed global border timeline for before/after comparisons. Deriving changes from a few selected polity polygons could mistake partial imperial extent for complete border change. A later implementation should first define its geographical scope and select comparable, cited before-and-after source pairs; it was not necessary to deliver the core historical games.
