# Time-Zone Relay source and mechanic review

**Reviewed:** 19 November 2026 · **Status:** city and time-zone data are source-ready for an offline prototype; no distinct, fair game loop has been selected.

## Candidate action

The backlog concept is a short city-to-city route where the player predicts a destination's local clock and calendar date after a journey. The map could make longitude and date-line crossings visible, and the reveal could show how the clock moved. This is a design hypothesis, not observed gameplay.

## Source review

| Source | Verified properties | Limits for the game |
| --- | --- | --- |
| [GeoNames daily data extract](https://www.geonames.org/export/) and [official dump README](https://download.geonames.org/export/dump/readme.txt) | `cities15000.zip` contains around 25,000 populated places or administrative capitals. Its tabular fields include GeoNames ID, name, WGS84 latitude/longitude, population and IANA time-zone ID. GeoNames states CC BY 4.0, asks for attribution, allows commercial use and supplies the data as-is. | The extract is updated daily; a game bundle must pin its retrieval date and checksum, curate spelling and city identities, and audit missing or stale time-zone assignments. GeoNames says accuracy, timeliness and completeness are not warranted. |
| [IANA time-zone database overview](https://www.iana.org/time-zones/tz-link) | The tz database is public domain and records local-time rules for representative locations. IANA says governments control time-zone and daylight-saving rules and may change them with little notice. | A published puzzle set must pin the tz database version or store precomputed offsets and local times. A browser's current time-zone database can differ by platform and release. |
| [IANA time-zone boundary references](https://www.iana.org/time-zones/tz-link) | IANA describes boundary data from Timezone Boundary Builder, which derives its borders from OpenStreetMap and distributes the data under ODbL. | Exact timezone polygons would add an ODbL source and attribution/ShareAlike considerations. The proposed point-city loop does not need to bundle those polygons. |

## Product fit

- **Existing-game overlap:** Sorting cities by local time would reuse the core action of Latitude Ladder and Population Pyramid Sort. Asking which time is correct for one named city would be a short calculation quiz and would not use the map meaningfully.
- **Potential distinction:** A route-and-calendar puzzle could make travel duration, civil time and crossing the International Date Line work together. It would need a visible route, a decision with plausible alternatives, and a reveal that teaches the time change without requiring memorization of obscure offsets.
- **Difficulty risks:** Daylight-saving rules, half-hour and quarter-hour offsets, seasonal changes and date-line conventions can make questions ambiguous or inconsistent across device time-zone databases. Use pinned dates and precomputed results; do not call civil offsets simple longitude bands.
- **Coverage and operations:** A curated set of cities with known GeoNames time-zone IDs can support offline Free Play. Keep it out of Daily until accuracy, persistence, challenge quality and player understanding are reviewed.

## Decision

GeoNames and IANA provide a practical, attributable data path, but source readiness alone does not justify another game. Defer implementation until a route-based action is specified that differs from ordering and clock-conversion quizzes and can produce fair, deterministic rounds. If that action is approved internally, prepare a small question bank, pin the GeoNames snapshot and tzdb version, and review every date-line/DST answer before coding the full loop.
