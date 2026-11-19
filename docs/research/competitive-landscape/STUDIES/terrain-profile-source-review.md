# Terrain Profile source review

**Reviewed:** 19 November 2026

**Status:** Candidate; source licensing is workable, but point-elevation accuracy needs a pilot before implementation.

## Question

Can Maproom build a replayable game about ordering named summits or passes from elevation data that is both distributable and consistent enough for fair comparisons?

## Findings

| Source | Useful evidence | Limitation for this game |
| --- | --- | --- |
| [NOAA ETOPO 2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model) | Global surface elevations at 15 arc-seconds (about 0.5 km near the equator), with coarser 30- and 60-second products. NOAA's [metadata](https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.dem%3Aetopo_2022) and [user guide](https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/docs/1.2%20ETOPO%202022%20User%20Guide.pdf) state CC0; the guide says the tiles may be used for private, academic or commercial purposes. Elevations use the EGM2008 geoid, which NOAA describes as an adequate approximation of mean sea level for most purposes. | A grid cell is not a surveyed summit height. The guide describes 15-arc-second gridding from several land-elevation sources and says final vertical-accuracy assessments were still being compiled in its 2022 revision. The grid can smooth narrow summits and passes. Use the surface layer; the bed layer is for ice-sheet bedrock. |
| [USGS SRTM 1 Arc-Second Global](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1) | USGS marks the product public domain and describes void-filled global data at 1 arc-second posting, with elevations in metres relative to EGM96. | Some tiles still contain voids; above 50°N and below 50°S the grid is sampled at 2 arc-seconds by 1 arc-second. The mission's original radar acquisition covered 60°N to 56°S, so global postings outside that band are not uniform in source history. A raster sample still does not establish an official summit elevation. |
| [GeoNames gazetteer](https://download.geonames.org/export/dump/readme.txt) | The daily gazetteer is CC BY 4.0. Feature class T includes mountain features; codes `PK` and `PASS` identify peaks and passes. Records provide WGS84 coordinates and an integer elevation field. | GeoNames aggregates more than 100 sources and disclaims accuracy, timeliness and completeness. Its separate `dem` field is an SRTM3 or GTOPO30 cell average (about 90 m or 900 m), not a surveyed feature height. The readme does not give per-record provenance for the `elevation` field. Attribute GeoNames if used, but do not use either field as authoritative without validation. |

The [GeoNames feature-code list](https://www.geonames.org/export/codes.html) defines a peak as a pointed elevation atop a mountain, ridge or other feature, and a pass as a break in a mountain range or other high obstruction used for travel. These codes can seed a candidate gazetteer, but their presence does not by itself establish the point's positional accuracy or the correctness of its height.

## Assessment

There is a clear licensing path for a small offline dataset: use NOAA's CC0 ETOPO surface grid, or USGS public-domain SRTM where its coverage and voids are suitable, and attribute GeoNames for names and point locations if that gazetteer is used. No full DEM needs to ship with the game; a build-time extraction could retain only validated records and the small amount of derived elevation data needed for rounds.

The remaining risk is gameplay fairness. DEM values at named peak coordinates are approximate grid elevations, not necessarily the accepted height of the summit. Differences in source quality, point placement, vegetation or snow, local relief, and vertical reference can affect close rankings. This is an inference from the products' documented grids, coverage and source variation; no summit samples have yet been compared.

## Recommendation

Keep Terrain Profile as a candidate and do a bounded data pilot before writing a game. Sample a small, geographically varied set of named peaks and passes from a DEM, record the source cell and datum, and compare the point locations and measured values against independent authoritative feature records. Reject or round values where the comparison does not support a fair order. If only broad relief differences validate, design tasks around those wider gaps and describe the result as approximate terrain elevation. Keep it out of Daily until content quality and player comprehension are separately assessed.

No DEM or new game data was downloaded or added to Maproom during this source review.

## Sources

- NOAA NCEI, [ETOPO Global Relief Model](https://www.ncei.noaa.gov/products/etopo-global-relief-model), accessed 19 November 2026.
- NOAA NCEI, [ETOPO 2022 User Guide](https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/docs/1.2%20ETOPO%202022%20User%20Guide.pdf), revision 1.2, 13 October 2022.
- NOAA NCEI, [ETOPO 2022 metadata](https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ngdc.mgg.dem%3Aetopo_2022), accessed 19 November 2026.
- USGS EROS, [SRTM 1 Arc-Second Global](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1), accessed 19 November 2026.
- GeoNames, [gazetteer readme and field definitions](https://download.geonames.org/export/dump/readme.txt), accessed 19 November 2026.
- GeoNames, [feature codes](https://www.geonames.org/export/codes.html), accessed 19 November 2026.
