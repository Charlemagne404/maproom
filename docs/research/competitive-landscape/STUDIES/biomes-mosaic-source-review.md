# Biomes Mosaic source and mechanic review

**Reviewed:** 19 November 2026 · **Status:** source appears usable under attribution; no game loop selected or implemented.

## Candidate

The current concept is to match broad biome map tiles to world regions. It could add physical and ecological geography to Maproom, but its action must be distinct from Country Outlines' shape identification and Geography Connections' category grouping. A question that simply asks “which biome is this outline?” would repeat those loops and is not enough reason to build a new game.

## Source and terms

RESOLVE's [2017 terrestrial ecoregion dataset](https://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017) groups 846 terrestrial ecoregions into 14 biomes and eight realms. It includes `ECO_NAME`, `BIOME_NAME`, `REALM` and an explicit CC BY 4.0 license. The dataset is dated 5 April 2017 and cites Dinerstein et al.'s 2017 ecoregion paper. The classification represents ecological regions and biodiversity assemblages, not just vegetation or climate zones; any player-facing lesson should describe it that way.

The public [ArcGIS FeatureServer layer](https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Resolve_Ecoregions/FeatureServer/0) currently returns 847 polygon features with distinct `ECO_ID` values. A field audit found 14 named biome classes plus one `N/A` feature, `Rock and Ice` (`ECO_ID` 0). Keep Rock and Ice explicit or exclude it; do not present it as a fifteenth biome. The 847-feature mirror reports that its data is not versioned, so any future build must pin and checksum a downloaded snapshot rather than fetch the service during play.

The [USGS World Terrestrial Ecosystems 2020 dataset](https://data.usgs.gov/datacatalog/data/USGS%3A6296791ed34ec53d276bb293) is a public-domain alternative with 431 ecosystem types at 250 m, combining climate, landform and vegetation/land cover. It has more environmental detail but no single broad-biome taxonomy; deriving one would require additional rules and review. For the present concept, RESOLVE's existing 14-class grouping is the more direct fit.

## Implementation risks

- The source provides global terrestrial polygons; this is not a complete ocean or marine-biome classification.
- The official catalog notes that some ecoregion polygons are extremely complex, with more than one million vertices. A playable offline asset needs a pinned download, controlled simplification, dateline review, and a measured bundle size before implementation.
- `SHAPE_AREA` is recorded in square degrees and should not be used as a physical-area measurement or score input.
- Biome boundaries and ecoregion names are a classification, not a claim that every point has one uncontested local habitat. Questions must follow the source classification exactly and avoid ecological generalizations beyond it.
- Color alone cannot identify tiles. Labels, geometry descriptions and keyboard/touch-operable interactions would be required.

## Decision gate

The source and attribution appear promising for a small offline Free Play experiment. The mechanic is still unresolved. Before bundling data, write one playable five-question loop that asks the player to use spatial relationships or transitions, then compare its action and learning outcome with Country Outlines and Geography Connections. Defer if the only clear interaction is naming or grouping a biome from a region shape. No data was downloaded or bundled, no player comprehension is claimed, and no new game was added.
