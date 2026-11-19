# Watershed Match source and gameplay review

**Reviewed:** 19 November 2026

**Status:** Keep as a candidate with a different core action. A downstream-relationship puzzle may fit USGS data, but the snapshot pair and map package are not implementation-ready.

## Question

Can Maproom build a distinct, replayable game that teaches how local catchments connect to larger rivers and outlets, with data that can be bundled for offline play?

## Source review

| Source | Useful evidence | Limitation for this game |
| --- | --- | --- |
| [USGS Watershed Boundary Dataset (WBD)](https://data.usgs.gov/datacatalog/data/USGS%3A0101bc32-916e-481d-8654-db7f8509fd0c) and [official WBD 2024 snapshot](https://water.usgs.gov/catalog/datasets/8dcb8081-66d3-4aff-8795-3d67e89a3162/) | The official WBD collection is public domain. The 2024 snapshot is a static official version, complete through 12-digit hydrologic units for the United States. WBD polygons carry HUC codes, names, downstream HUCs, watershed types and areas. | U.S.-only scope. WBD hydrologic units are nested drainage units; a HUC12 can represent only part of a river's full upstream area. Coastal, lake-front and non-dendritic drainage needs careful wording. |
| [USGS Mainstem Rivers, version 3.1](https://www.usgs.gov/data/mainstem-rivers-conterminous-united-states-ver-31-october-2026) | Marked CC0. Contains mainstem paths, headwater/outlet identifiers and HUC crosswalks. Version 3.1 corrected HU12 outlet assignments; the final-WBD outlet file contains 78,275 records. | Covers the conterminous United States. The release uses a January 2025 final-WBD snapshot, which is not the separate official 2024 WBD snapshot. Its summarized mainstem geometry is simplified for visualization, not analysis. A coherent versioned pair and field-level use still need inspection. |
| [MERIT-FullBasin v1.1](https://zenodo.org/records/22895352) | Global 90 m coverage; 340,955 basin outlines of at least 1 km² remain after display simplification. Provides basin IDs, area and bounding boxes. | Full global archive is 6.4 GB and includes multiple layers; region-level polygon package is 8.0 GB. The release terms require CC BY-NC 4.0 or ODbL 1.0, with ODbL needed for commercial use. The upstream index is a separate product. Basin groups at HydroBASINS levels 1–3 have an additional source dependency. No river names are supplied as the primary clue. |
| [Lake-TopoCat v1.1](https://ihp-wins.unesco.org/en/dataset/lake-topocat-global-lake-drainage-topology-and-catchment-database-hydrolakes-topocat-v1-1) | Global lake-linked catchments and inter-lake reaches; the IHP-WINS page states CC BY 4.0 and about 1.43 million lakes plus 1.46 million outlets. | Covers about 57% of global land and is organized around lake drainage rather than a complete river-basin network. Its HydroLAKES and MERIT Hydro inputs need their own redistribution review. |
| [Basin90m](https://doi.org/10.5880/GFZ.4.6.2023.004) | GFZ describes 667,629 basins larger than 50 km², with longest river channels; the data description labels it CC BY 4.0. | The method used HydroBASINS boundaries to partition SRTM into 130 processing areas. The release notes do not resolve whether that input affects redistribution. It removes basins intersecting 60°N, does not document parent/child IDs in the listed schema, and warns of unremoved false rivers in flat or modified areas. |
| [HydroBASINS](https://www.hydrosheds.org/products/hydrobasins) | Global nested polygons and upstream/downstream coding. | Inherits HydroSHEDS v1 software-distribution terms, including an end-user license requirement and a restriction against standalone data redistribution. Maproom does not bundle an end-user license. |

The USGS hydrologic-units guidance explains that a unit represents drainage to an outlet, while multiple nested units may be needed to describe the full upstream drainage of an outlet. The HUC hierarchy supplies a stable relation model, but player-facing copy should distinguish a subwatershed from a complete river basin.

WBD's 2024 snapshot includes updates ingested from 2012 through 2024 and is marked static. Mainstems v3.1 instead provides a final-WBD snapshot from January 2025. HUC identifiers may connect the tables, but shape and membership alignment cannot be assumed. Before generating a map asset, select one matching snapshot and verify geometry and relation coverage. The summarized Mainstems file is simplified for display and should not be repurposed for hydrologic analysis.

## Live gameplay comparison

The public [MapGuesser Find the Feature](https://mapguesser.app/play/find-the-feature/) page describes a five-round natural-feature location game with 616 features, including 188 rivers. The player reads a feature name, places a map pin, and submits to reveal the outline and distance.

One practice round was played. The prompt was “Golfe du Lion”; one pin attempt scored zero and returned a 1,627 km miss, then showed the target feature outline. This was a sea question, not a river question. It is one direct-play observation, not a difficulty or fairness study.

MapGuesser already uses the current Watershed Match draft's principal action—place a pin for a named water feature, then see its outline and distance. Riverways also asks players to identify a highlighted river line. A basin question could still add a distinct skill if it makes downstream relationships the central action rather than asking players to locate another named river.

## Decision

Keep Watershed Match as a candidate, with a downstream-relationship loop:

1. Show a subwatershed or river branch in context.
2. Ask which adjacent hydrologic unit or named mainstem receives its drainage.
3. Reveal the downstream link and the larger catchment context.

This is a product hypothesis, not a validated rule set. Use a U.S.-only Free Play pool only if the feature review confirms enough clear, familiar examples. Keep it outside Daily while geographic coverage, name quality, difficulty and learning clarity are evaluated.

## Remaining gates

- Align a pinned WBD and Mainstems snapshot, then verify HUC and outlet crosswalk completeness.
- Audit named rivers, duplicated or code-prefixed HUC names, lake/coastal destinations, non-dendritic units and endorheic drainage.
- Generate and simplify a small sample; measure its compressed and runtime footprint before committing to offline distribution.
- Test the action with players against Riverways and a river-location competitor. Check whether players understand “downstream HUC” or need a plain-language prompt.
- Define keyboard and touch controls before any implementation.

No game code, dataset or asset was added during this review.
