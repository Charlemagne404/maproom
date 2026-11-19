# Terrain Profile source review

**Reviewed:** 19 November 2026

**Status:** Summit-height sourcing is viable for Japan, but defer the current ordering concept: its core action overlaps with existing Maproom and competitor ranking games. Reconsider only with a distinct terrain-reading interaction.

## Question

Can Maproom build a replayable game about ordering named summits or passes from elevation data that is both distributable and consistent enough for fair comparisons?

## Findings

| Source | Useful evidence | Limitation for this game |
| --- | --- | --- |
| [NOAA ETOPO 2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model) | Global surface elevations at 15 arc-seconds (about 0.5 km near the equator), with coarser 30- and 60-second products. NOAA's [metadata](https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.dem%3Aetopo_2022) and [user guide](https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/docs/1.2%20ETOPO%202022%20User%20Guide.pdf) state CC0; the guide says the tiles may be used for private, academic or commercial purposes. Elevations use the EGM2008 geoid, which NOAA describes as an adequate approximation of mean sea level for most purposes. | A grid cell is not a surveyed summit height. The guide describes 15-arc-second gridding from several land-elevation sources and says final vertical-accuracy assessments were still being compiled in its 2022 revision. The grid can smooth narrow summits and passes. Use the surface layer; the bed layer is for ice-sheet bedrock. |
| [USGS SRTM 1 Arc-Second Global](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1) | USGS marks the product public domain and describes void-filled global data at 1 arc-second posting, with elevations in metres relative to EGM96. | Some tiles still contain voids; above 50°N and below 50°S the grid is sampled at 2 arc-seconds by 1 arc-second. The mission's original radar acquisition covered 60°N to 56°S, so global postings outside that band are not uniform in source history. A raster sample still does not establish an official summit elevation. |
| [GeoNames gazetteer](https://download.geonames.org/export/dump/readme.txt) | The daily gazetteer is CC BY 4.0. Feature class T includes mountain features; codes `PK` and `PASS` identify peaks and passes. Records provide WGS84 coordinates and an integer elevation field. | GeoNames aggregates more than 100 sources and disclaims accuracy, timeliness and completeness. Its separate `dem` field is an SRTM3 or GTOPO30 cell average (about 90 m or 900 m), not a surveyed feature height. The readme does not give per-record provenance for the `elevation` field. Attribute GeoNames if used, but do not use either field as authoritative without validation. |

The [GeoNames feature-code list](https://www.geonames.org/export/codes.html) defines a peak as a pointed elevation atop a mountain, ridge or other feature, and a pass as a break in a mountain range or other high obstruction used for travel. These codes can seed a candidate gazetteer, but their presence does not by itself establish the point's positional accuracy or the correctness of its height.

## Small summit pilot

For a bounded check, four named summits were sampled at the coordinates shown on their current GeoNames records. A single multi-point request to the [Open Topo Data public SRTM30m API](https://www.opentopodata.org/datasets/srtm/) returned its `srtm30m` dataset values. Published heights below come from government or national mapping sources. Differences are the sampled raster value minus the cited published height, rounded to the nearest metre.

| Summit | GeoNames coordinate | GeoNames elevation field | Published reference | SRTM30m sample | Difference |
| --- | --- | ---: | ---: | ---: | ---: |
| Mount Everest | 27.98791, 86.92529 | 8,848 m | 8,848.86 m ([Nepal government factsheet](https://giwmscdnone.gov.np/media/pdf_upload/Facts%202025%20Final_jktttlf.pdf)) | 8,706 m | -143 m |
| Kilimanjaro | -3.07583, 37.35333 | 5,895 m | 5,895 m ([Tanzania National Parks](https://www.tanzaniaparks.go.tz/uploads/publications/en-1730810409-QUICKREFERENCEGUIDEFINAL.pdf)) | 5,865 m | -30 m |
| Aconcagua | -32.65383, -70.01141 | 6,959 m | 6,961 m ([Argentina government, 2026](https://www.argentina.gob.ar/noticias/tropas-argentinas-y-chilenas-volvieron-hacer-cumbre-juntas-en-el-aconcagua)) | 6,910 m | -51 m |
| Mont Blanc | 45.83300, 6.86400 | 4,806 m | 4,805.59 m ([French IGN](https://www.ign.fr/mag/une-expedition-pour-mesurer-la-pesanteur-sur-le-mont-Blanc)) | 4,779 m | -27 m |

GeoNames' integer height field is close to these four published values, while the SRTM30m samples are 27–143 m lower. The sampled values preserve the broad ordering in this small set, but these four examples cannot establish dataset-wide accuracy. SRTM point values should not be presented as official summit heights. GeoNames' height field is a promising discovery aid, not a source to trust without per-feature review: the gazetteer does not provide source provenance for that field and disclaims accuracy. This pilot also says nothing about mountain passes, which need separate validation.

Published heights can also change with snow and ice. The French IGN source identifies Mont Blanc's 4,805.59 m value as the 2023 measurement, and notes that satellite-supported field measurements have been taken every two years since 2001. A curated game record should preserve its source and measurement year rather than imply that every height is timeless.

## Curated national source and comparison spacing

The Geospatial Information Authority of Japan (GSI) publishes a current list of 1,003 principal Japanese mountains. GSI says the list is based on 1:25,000 topographic maps and basic survey results, with the location and elevation of each mountain's highest point; it updates values as tectonic or terrain changes are reflected. The page offers CSV and GeoJSON editions dated 31 March 2026. Its notes define the height reference as Tokyo Bay mean sea level, with a possible local mean-sea-level basis for some islands; values are reported to whole metres. The record type distinguishes triangulation points, photo-measured elevation points and points measured in the field.

GSI's related [3D mountain record list](https://maps.gsi.go.jp/3d/mountain/mountain.html) gives a useful close-spacing example: Kita-dake 3,193 m, Aino-dake 3,190 m, Okuhotaka-dake 3,190 m and Yari-gatake 3,180 m. Adjacent gaps are 3 m, 0 m and 10 m. These are well-described official records, but a strict sort puzzle would need a deliberate tie rule and could still ask players to distinguish differences smaller than the source's whole-metre reporting. The national set is promising for a Japan-specific collection, not evidence of a globally varied pool.

This was a targeted source check, not a full audit of all 1,003 records: the CSV and GeoJSON were not parsed, so the full height distribution, duplicate summit identities and replay pool remain unmeasured.

GSI's current content terms apply Public Data License 1.0 unless a page states otherwise. They allow reuse, including commercial use, with source attribution; edited or adapted content must be labeled as such, and third-party rights must be checked. The height list provides names, point coordinates and elevations, not cross-section profiles. Any profile imagery would require a separate source and accuracy review.

## Gameplay distinctness check

The proposed core action—putting geographic items in order by a number—already appears in Maproom's Latitude Ladder and Population Pyramid Sort. It also sits beside Higher or Lower's pairwise numeric comparisons. The current competitor review found Geocore's Rank It (drag countries into order), Higher Ground (compare two map pins by height) and Guess the Height (estimate a lit point's elevation), plus Worldly Games' six-country Rankings puzzles. I completed one Worldly GDP practice round: position feedback moved from 2/6 to 4/6 to 6/6 over three guesses. The Geocore catalog marks its elevation modes as requiring a free account, so those remain catalog descriptions rather than direct-play observations in this review.

This leaves little room for another game whose main decision is ordering known peaks by height. A profile graphic alone does not create a distinct learning action, and GSI's table does not provide such profiles. A different terrain-reading task could be considered later, but it would need its own source and rule study.

## Assessment

There is a clear licensing path for a small offline dataset: use a curated set of published summit elevations, and attribute GeoNames for names and point locations if that gazetteer is used. GSI also supplies a well-documented Japan-only source under PDL1.0. The source links should be retained for each feature. NOAA's CC0 ETOPO surface grid and USGS public-domain SRTM remain useful for rough profile imagery or cross-checking, but the pilot does not support using their point samples as canonical summit heights. No full DEM needs to ship with a game.

Source risks are manageable for a curated set, though global coverage, consistent height conventions and close comparisons would need attention. The larger reason to defer is gameplay distinctness: a summit ordering game would repeat a familiar Maproom action and established competitor formats. Height conventions may also differ for ice and snow. This matches USGS guidance that elevations interpolated from terrain grids are approximate and may not reflect a peak's highest point; its Denali survey also found airborne radar did not provide precise spot elevations in very steep terrain. The small pilot does not establish an alternative terrain-reading loop.

## Recommendation

Do not prototype Terrain Profile as a summit/pass sorting game. Keep the research record, but revisit only if a distinct terrain-reading interaction is defined and its data can be sourced accurately. If summit heights are later used, retain per-feature citations and source dates, handle equal or near-equal values explicitly, and do not use DEM point samples as official heights. Treat passes as a separate content set. Any future prototype should begin in Free Play and remain out of Daily until content quality and player comprehension are separately assessed.

No raster tiles or new game data were downloaded or added to Maproom during this source review; the four SRTM point samples were obtained from the public API.

## Sources

- NOAA NCEI, [ETOPO Global Relief Model](https://www.ncei.noaa.gov/products/etopo-global-relief-model), accessed 19 November 2026.
- NOAA NCEI, [ETOPO 2022 User Guide](https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/docs/1.2%20ETOPO%202022%20User%20Guide.pdf), revision 1.2, 13 October 2022.
- NOAA NCEI, [ETOPO 2022 metadata](https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.dem%3Aetopo_2022), accessed 19 November 2026.
- USGS EROS, [SRTM 1 Arc-Second Global](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1), accessed 19 November 2026.
- USGS, [mountain peak elevation guidance](https://www.usgs.gov/faqs/there-a-list-mountain-peak-elevations-united-states) and [Denali's official summit measurement](https://www.usgs.gov/news/national-news-release/new-elevation-nations-highest-peak), accessed 19 November 2026.
- Open Topo Data, [SRTM dataset and public point API](https://www.opentopodata.org/datasets/srtm/), accessed 19 November 2026; queried the SRTM 30m endpoint for the four GeoNames coordinates above.
- GeoNames, [gazetteer readme and field definitions](https://download.geonames.org/export/dump/readme.txt), accessed 19 November 2026.
- GeoNames, [feature codes](https://www.geonames.org/export/codes.html), accessed 19 November 2026.
- GeoNames feature records: [Mount Everest](https://www.geonames.org/NP/highest-mountains-in-nepal.html), [Kilimanjaro](https://www.geonames.org/157452/kilimanjaro.html), [Aconcagua](https://www.geonames.org/3866949/cerro-aconcagua.html), and [Mont Blanc](https://www.geonames.org/3181986/mont-blanc.html), accessed 19 November 2026.
- Geospatial Information Authority of Japan, [1,003 Japanese mountains](https://web2.gsi.go.jp/kihonjohochousa/kihonjohochousa41139.html), version 31 March 2026, and [3D mountain record list](https://maps.gsi.go.jp/3d/mountain/mountain.html), accessed 19 November 2026.
- Geospatial Information Authority of Japan, [content terms](https://web2.gsi.go.jp/kikakuchousei/kikakuchousei40182.html), amended 20 November 2025; Digital Agency, [Public Data License 1.0](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0), accessed 19 November 2026.
- Geocore, [game catalogue](https://www.geocore.fun/game), accessed 19 November 2026; Worldly Games, [Rankings practice](https://worldly.games/rankings/practice) and [official instructions](https://worldly.games/faq), accessed 19 November 2026.
