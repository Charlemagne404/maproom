# Watershed Match source and gameplay review

**Reviewed:** 19 November 2026

**Status:** A limited WBD-only Free Play prototype is implemented with 60 screened questions and 118 HUC12 geometries from three sample systems. It remains outside Daily. Question fairness, map legibility across the full pool and player understanding still need review.

## Question

Can Maproom build a distinct, replayable game that teaches how local catchments connect to larger rivers and outlets, with data that can be bundled for offline play?

## Source review

| Source | Useful evidence | Limitation for this game |
| --- | --- | --- |
| [USGS Watershed Boundary Dataset (WBD)](https://data.usgs.gov/datacatalog/data/USGS%3A0101bc32-916e-481d-8654-db7f8509fd0c) and [official WBD 2024 snapshot](https://water.usgs.gov/catalog/datasets/8dcb8081-66d3-4aff-8795-3d67e89a3162/) | The official WBD collection is public domain. The 2024 snapshot is a static official version, complete through 12-digit hydrologic units for the United States. WBD polygons carry HUC codes, names, downstream HUCs, watershed types and areas. | U.S.-only scope. WBD hydrologic units are nested drainage units; a HUC12 can represent only part of a river's full upstream area. Coastal, lake-front and non-dendritic drainage needs careful wording. |
| [USGS 2025 WBD HUC12 API](https://api.water.usgs.gov/fabric/pygeoapi/collections/wbd12_20250107?f=html) | The USGS Hydrologic Geospatial Fabric publishes a 2025 HUC12 snapshot (`wbd12_20250107`) with 103,068 records. It provides each polygon's HUC12, name, `ToHUC`, `HUType`, `HUMod` and geometry; the API identifies the collection as CC0 1.0. | U.S.-only scope. HUC12 units are subwatersheds, not necessarily complete named-river basins. A single `ToHUC` link represents the unit that naturally receives the majority of flow; special destinations such as ocean, another country or a closed basin need different wording. |
| [USGS Mainstem Rivers, version 3.1](https://www.usgs.gov/data/mainstem-rivers-conterminous-united-states-ver-31-october-2026) | Marked CC0. Contains mainstem paths, headwater/outlet identifiers and HUC crosswalks. Version 3.1 corrected HU12 outlet assignments; the final-WBD outlet file contains 78,275 records. | Covers the conterminous United States. The release uses a January 2025 final-WBD snapshot, which is not the separate official 2024 WBD snapshot. Its summarized mainstem geometry is simplified for visualization, not analysis. A coherent versioned pair and field-level use still need inspection. |
| [MERIT-FullBasin v1.1](https://zenodo.org/records/22895352) | Global 90 m coverage; 340,955 basin outlines of at least 1 km² remain after display simplification. Provides basin IDs, area and bounding boxes. | Full global archive is 6.4 GB and includes multiple layers; region-level polygon package is 8.0 GB. The release terms require CC BY-NC 4.0 or ODbL 1.0, with ODbL needed for commercial use. The upstream index is a separate product. Basin groups at HydroBASINS levels 1–3 have an additional source dependency. No river names are supplied as the primary clue. |
| [Lake-TopoCat v1.1](https://ihp-wins.unesco.org/en/dataset/lake-topocat-global-lake-drainage-topology-and-catchment-database-hydrolakes-topocat-v1-1) | Global lake-linked catchments and inter-lake reaches; the IHP-WINS page states CC BY 4.0 and about 1.43 million lakes plus 1.46 million outlets. | Covers about 57% of global land and is organized around lake drainage rather than a complete river-basin network. Its HydroLAKES and MERIT Hydro inputs need their own redistribution review. |
| [Basin90m](https://doi.org/10.5880/GFZ.4.6.2023.004) | GFZ describes 667,629 basins larger than 50 km², with longest river channels; the data description labels it CC BY 4.0. | The method used HydroBASINS boundaries to partition SRTM into 130 processing areas. The release notes do not resolve whether that input affects redistribution. It removes basins intersecting 60°N, does not document parent/child IDs in the listed schema, and warns of unremoved false rivers in flat or modified areas. |
| [HydroBASINS](https://www.hydrosheds.org/products/hydrobasins) | Global nested polygons and upstream/downstream coding. | Inherits HydroSHEDS v1 software-distribution terms, including an end-user license requirement and a restriction against standalone data redistribution. Maproom does not bundle an end-user license. |

The [USGS data dictionary](https://www.usgs.gov/ngp-standards-and-specifications/watershed-boundary-dataset-wbd-data-dictionary) defines `ToHUC` as the downstream 12-digit hydrologic unit that naturally receives the majority of flow from another unit. The [federal WBD standard](https://pubs.usgs.gov/tm/11/a3/pdf/tm11-a3_5ed.pdf) gives special non-HUC values for ocean, Canada, Mexico and closed-basin destinations. The HUC hierarchy supplies a stable relation model, but player-facing copy should distinguish a subwatershed from a complete river basin.

The earlier source comparison found that WBD 2024 and Mainstems' January 2025 final-WBD snapshot could not be assumed to have matching shapes. The API's separate 2025 WBD snapshot provides a cleaner prototype path: use its own polygon geometry and `ToHUC` relations together, without joining a second snapshot or using Mainstems' display summary.

I sampled the 2025 WBD API in three local areas around the Potomac, Columbia and Susquehanna systems. The returned GeoJSON contained 132, 105 and 142 HUC12 polygons respectively (379 unique features total). Of the 344 records whose `ToHUC` target was also present in the sampled geometry, every target shared an exact polygon-boundary segment with its source. There were 334 source units with a correct target and at least two other adjacent subwatersheds available as map alternatives. Requiring both source and target to be `HUType=S` and `HUMod=NM`, then requiring two other adjacent `S`/`NM` polygons with distinct names, leaves 95 candidate transitions across the three samples. These are candidate records, not 95 editorially approved questions; river names, visual framing and answer ambiguity still need review.

## Live gameplay comparison

The public [MapGuesser Find the Feature](https://mapguesser.app/play/find-the-feature/) page describes a five-round natural-feature location game with 616 features, including 188 rivers. The player reads a feature name, places a map pin, and submits to reveal the outline and distance.

One practice round was played. The prompt was “Golfe du Lion”; one pin attempt scored zero and returned a 1,627 km miss, then showed the target feature outline. This was a sea question, not a river question. It is one direct-play observation, not a difficulty or fairness study.

MapGuesser already uses the current Watershed Match draft's principal action—place a pin for a named water feature, then see its outline and distance. Riverways also asks players to identify a highlighted river line. A basin question could still add a distinct skill if it makes downstream relationships the central action rather than asking players to locate another named river.

## Decision

Proceed with a controlled Free Play prototype using the USGS 2025 WBD HUC12 collection by itself, with a downstream-relationship loop:

1. Show a subwatershed or river branch in context.
2. Ask which adjacent hydrologic unit or named mainstem receives its drainage.
3. Reveal the downstream link and the larger catchment context.

This is a product hypothesis, not a validated rule set. Keep it U.S.-only and outside Daily. The source/sample gate passes for prototyping; geographic coverage, question quality, difficulty and learning clarity still need evaluation.

## Prototype checkpoint — 19 November 2026

- The bundled pool contains 60 source units selected from the 95 screened transitions: 31 Potomac, 22 Columbia and 7 Susquehanna questions. Each question shows one source HUC12 and three adjacent candidate polygons; the recorded `ToHUC` target is the answer.
- The repeatable five-question deck samples each of the three systems, uses three choices with answer positions balanced 2/2/1, awards 100 points per correct answer and saves/restores progress. Native option buttons support keyboard and touch input.
- The checked map highlights the downstream polygon and draws a schematic source-to-target arrow. The arrow indicates the recorded `ToHUC` relationship; it is not a mapped river course. The bundled TopoJSON contains 118 polygons and is 383,428 bytes (36,752 bytes when gzip-compressed). Its manifest records the CC0 source, attribution and SHA-256; the service worker caches it for offline play.
- The question screen and reveal have been inspected in production-preview screenshots at desktop and 390 px mobile widths, including dark theme. This verifies those screens and interactions, not the fairness of all 60 questions or player comprehension.

The three named systems are sample windows, not complete river basins or national coverage. The 60-question set is selected by a name-token similarity heuristic from candidate adjacency; it has not received editorial review. The map does not include river lines or a larger downstream network.

## Remaining gates

- Review all 60 source and answer names and map extents; reject ambiguous choices, confusing labels and hard-to-see polygons.
- The prototype currently filters to numeric 12-digit `ToHUC` destinations and excludes ocean, Canada, Mexico, closed-basin and other exceptional outlet codes. Keep that rule in place if the source pool expands.
- Test the action with players against Riverways and a river-location competitor. Check whether the plain-language majority-flow prompt teaches a useful idea and whether five rounds feel fair.
- Expand geographic coverage only after the limited sample passes question and comprehension review.

Daily eligibility remains explicitly false until the question pool, persistence, fairness and learning value receive a separate review.
