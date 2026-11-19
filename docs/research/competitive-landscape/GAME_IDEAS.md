# Future game ideas

This ranked candidate list consolidates the earlier [30-concept evaluation](../../GAME_CONCEPTS.md) with the current research. A row is a proposal, not an approved feature. Existing implementations remain labeled as built; candidates need a source/license review, rule audit and distinct gameplay test before development. Rankings are comparative product judgments, not user-study measurements.

| Rank | Concept and core loop | Data and fit | Status |
| ---: | --- | --- | --- |
| 1 | **Watershed Match** — locate a river within a drainage basin, then reveal upstream/downstream relationships. | Needs a distributable, licensed basin layer and careful north-of-60°N quality limits. | Candidate; licensing is unresolved. |
| 2 | **Climate Twins** — choose which of two cities matches a seasonal climate chart. | A sourceable 1991–2020 observed-climate product exists, but its 0.5° grid is coarse for city-level claims; see the [source review](STUDIES/climate-twins-source-review.md). | Candidate; extract a small city sample and audit grid-cell separation/profile contrast before implementation. |
| 3 | **Terrain Profile** — order summits or passes by elevation and compare their profile. | Needs consistent elevations and vertical-datum notes. | Candidate. |
| 4 | **Population Pyramid Sort** — rank countries from age-distribution silhouettes, then reveal a consistent year. | Demographic source and year need clear coverage. | Candidate. |
| 5 | **Map Projection Match** — match a mapping task to an Equal Earth, Mercator, Equirectangular or Orthographic view and learn its tradeoff. | Uses existing Natural Earth geometry and `d3-geo`; no new data or license is needed. | **Implemented as four seeded Free Play tasks.** Unit and production-preview browser checks cover the task set, restore and replay. Player comprehension remains unmeasured. |
| 6 | **Biomes Mosaic** — match broad vegetation/climate tiles to world regions. | Requires a defensible classification, generalized map tiles and data provenance. | Candidate. |
| 7 | **Plate Boundary Lab** — infer a broad tectonic boundary from earthquake and volcano patterns. | Requires scientific curation and dated geophysical data. | Candidate. |
| 8 | **Historic Borders** — compare two dated boundary reconstructions and locate a changed region. | Requires licensed, comparable historical layers; must distinguish reconstruction from archival map. | Candidate; keep secondary. |
| 9 | **Delta Detective** — identify a curated delta outline or match its river to an outlet. | Needs reliable delta geometry; Natural Earth endpoints alone may not suffice. | Candidate. |
| 10 | **River Mouths** — connect a river trace to its sea or lake outlet. | Existing centerline endpoints need hydrology validation before use. | Candidate; data dependent. |
| 11 | **Island Chain Order** — arrange island groups by longitude or distance from a mainland. | Needs a stable, sourced island-group gazetteer and deliberate scale choices. | Candidate. |
| 12 | **Coastline Recognition** — identify a region from a coastal silhouette, with neighboring map context revealed later. | Risks overlap with Country Outlines; requires a fair feature catalog. | Candidate. |
| 13 | **National Park Locator** — place a protected-area outline in its region. | Global coverage and license vary; dataset audit comes first. | Candidate. |
| 14 | **Landform Pairing** — connect a plateau, basin or mountain range to adjacent landforms. | Needs consistent landform polygons and source-backed names. | Candidate. |
| 15 | **Language Families Atlas** — group language regions by a broad family clue. | Needs sourced language geography and culturally careful definitions. | Candidate; high editorial risk. |
| 16 | **Time-Zone Relay** — predict local time or date change along a route. | Needs current IANA boundary data and careful daylight-saving rules. | Candidate. |
| 17 | **Migration Arrows** — identify a broad migration flow by region and period. | Sensitive historical interpretation and consistent, sourced year ranges required. | Candidate; high editorial risk. |
| 18 | **Urban Network** — build a path through a supplied rail or metro graph. | City network licenses and freshness are difficult; could require online data. | Candidate; data dependent. |
| 19 | **Coordinate Courier** — find a destination from a coordinate prompt before a move budget expires. | Uses existing coordinates; overlaps with city placement and Distance & Direction. | Candidate only if marker interaction stays primary. |
| 20 | **Great-Circle Arc** — decide which city is nearer along a globe arc, then reveal the flat-map distortion. | Existing coordinates suffice, but it overlaps with Distance & Direction. | Candidate; low distinctness. |
| 21 | **River Network** — join a main river to its mapped tributaries and reveal the downstream route. | Would extend Riverways, but current source lines do not encode a verified network graph. | Candidate; not currently data-ready. |
| 22 | **City Skyline** — identify a place from a licensed skyline photo, then place it on the map. | Image licensing and local asset maintenance are substantial. | Candidate; rights blocker. |
| 23 | **Place Through Time** — match one city or region to dated boundary snapshots. | Existing Historical Geography assets may help; map changes and license limits need review. | Candidate; secondary. |
| 24 | **Country Mosaic** — reconstruct a country from generalized shape pieces. | Existing boundary data; would need fair piece cuts and non-drag input. | **Deferred after direct competitor play:** Geocore Geo Puzzle already asks players to rebuild a world map from country pieces with snap and hint feedback. Revisit only with a clearly different learning goal and accessible interaction, not a Maproom copy. |
| 25 | **Map Reading Relay** — solve a short chain of scale, graticule and direction clues. | Can use local geometry; must not become a disguised coordinates quiz. | Candidate. |
| 26 | **Physical Features Grid** — cross rivers, seas, islands or mountains instead of country facts. | New catalog data and sourced taxonomy required. | Candidate; do not build from incomplete map labels. |
| 27 | **Geographic Sequence Recall** — reproduce a revealed sequence of regions or map markers. | Geocore documents a sequence mode; Maproom would need a distinct learning purpose and reduced-memory burden. | Candidate. |
| 28 | **Estimate the Distance** — estimate a map distance, reveal the scale and compare error. | Existing coordinate math; overlap with Distance & Direction needs a distinct map-reading task. | Candidate. |
| 29 | **Regional Capital Relay** — link a capital to its country, region and border neighbors. | Current catalog covers the facts; overlaps with Capitals & Cities and Border Route. | Not selected yet. |
| 30 | **Flag Family** — group flags by design features and explain the underlying relationship. | Local flag assets exist, but overlap with Flag Study and Connections is high. | Not selected yet. |
| 31 | **Country Rank Order** — sort countries by area, population or density. | Existing facts suffice, but Higher or Lower already covers this family. | Not selected. |
| 32 | **Neighbor Chain** — build a shortest path between countries. | Existing reciprocal-border graph; directly overlaps with Border Route. | Not selected. |

## Selection rule

The next new game should add a different player action and a distinct learning outcome, not just another question bank. It must use a source that can be bundled and disclosed, have enough data for varied replay, work offline, fit a keyboard/touch interaction, and remain outside Daily until separately evaluated. Map Projection Match passed that engineering screen; its four-task difficulty and teaching clarity still need player evaluation.
