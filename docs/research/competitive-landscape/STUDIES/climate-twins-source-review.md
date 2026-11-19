# Climate Twins source review

**Reviewed:** 19 November 2026
**Status:** source shortlist only; no data or game implementation approved.

## Gameplay question

Can players read a seasonal temperature/precipitation profile and use broad geographic knowledge—hemisphere, maritime versus continental influence, monsoon seasonality or latitude—to identify a city? This would test chart interpretation and climate patterns, rather than another country fact or coordinate estimate.

## Source comparison

| Source | Period and resolution | Terms and fit |
| --- | --- | --- |
| [WorldClim 2.1](https://www.worldclim.org/data/worldclim21.html) | Monthly minimum/mean/maximum temperature and precipitation normals for 1970–2000; available at 30 arc-seconds (about 1 km) and coarser resolutions. | [WorldClim's license](https://www.worldclim.org/about.html) says data are for academic and other noncommercial use; redistribution and commercial use require prior permission. Do not bundle it for Maproom without that permission. |
| World Bank CCKP observed CRU data | The inspected [CRU TS 4.09 monthly temperature](https://wbg-cckp.s3.amazonaws.com/data/cru-x0.5/tas/cru-ts4.09-historical/climatology-tas-monthly-mean_cru-x0.5_cru-ts4.09-historical_climatology_mean_1991-2020.nc) and [precipitation](https://wbg-cckp.s3.amazonaws.com/data/cru-x0.5/pr/cru-ts4.09-historical/climatology-pr-monthly-mean_cru-x0.5_cru-ts4.09-historical_climatology_mean_1991-2020.nc) files contain 1991–2020 monthly climatologies on a 0.5° grid (about 55 km at the equator). The [public archive](https://worldbank.github.io/climateknowledgeportal/README.html) documents gridded NetCDF access. Version documentation is inconsistent: the archive collection page says 4.07, the World Bank metadata page indexed 4.08, while these inspected files identify themselves as 4.09. | Licensing is unresolved. CCKP metadata says CC BY 4.0; each inspected NetCDF global attribute says the data are available under the UK Open Government Licence v3; the [AWS Registry entry](https://registry.opendata.aws/wbg-cckp/) lists the World Bank Open Database License (ODbL). Do not bundle or derive game content from these files until the data steward confirms which terms apply. Regardless of license, a 0.5° cell is not a station reading or precise city climate; coastal and elevation differences may be smoothed. |

## Data-fit audit

For a local feasibility check, I sampled the two public CRU TS 4.09 NetCDF files above against Maproom's existing `public/data/cities-major.json`. The file contains 12,405 records; after the current-settlement filter used by city games, 11,577 remained. Each city was assigned the nearest grid center by latitude and wrapped longitude. This temporary analysis was run outside the repository; no climate data or helper dependency was added to Maproom.

- 11,559/11,577 current settlements (99.84%) had all twelve months of both variables in their directly nearest grid cell; 18 coastal/island records landed on masked cells.
- Those 11,559 records occupied 6,344 distinct valid cells. 2,003 cells were shared by multiple records, containing 7,218 records, so the full city list cannot be used as independent climate answers.
- After rounding temperature to the nearest 1°C and monthly precipitation to the nearest 10 mm, the broad pool contained 6,330 unique profiles. The duplicates are concentrated in metropolitan clusters; for example, 47 Île-de-France records shared one cell and profile.
- The 179 records marked as capitals all had data, with 178 unique grid cells and profiles after the same rounding. Brazzaville and Kinshasa share the one profile, so a capital-only pool would need to omit one or make that pair ineligible together. These are GeoNames-derived Maproom records, not a complete list of the world's capitals.

This supports a curated capital-only gameplay sample if rights and versioning are clarified. It does not support treating every nearby settlement as a distinct city climate. The nearest-cell wording must remain explicit, and high-elevation or coastal locations still need manual review.

## Decision and next evidence

Keep Climate Twins as a candidate, but hold implementation and data packaging until the World Bank confirms the applicable license and version for the inspected CRU files. Do not use the WorldClim rasters without prior permission. If CCKP terms are clarified, start with the capital-marked subset, exclude the Brazzaville/Kinshasa collision, and then report:

- the final eligible city count after review of the 18 masked coastal/island cells and nearby-city pairs;
- any profile collisions remaining after the chosen display rounding;
- whether representative charts remain distinguishable after sensible rounding;
- examples where coastal location or elevation may make a gridded cell misleading;
- exact source/version, units, attribution and any transformations in the proposed bundled file.

If that check supports a fair sample, use wording such as “1991–2020 climate pattern in the nearest CRU grid cell,” not “the city's climate normals.” Keep the first prototype Free Play only and outside Daily until players assess chart comprehension and difficulty.

## Sources

- WorldClim 2.1 data description: <https://www.worldclim.org/data/worldclim21.html>
- WorldClim license: <https://www.worldclim.org/about.html>
- CCKP metadata and license: <https://climateknowledgeportal.worldbank.org/metadata>
- CCKP collection documentation (currently labels CRU TS 4.07): <https://worldbank.github.io/climateknowledgeportal/docs/collections/cru-x0.5.html>
- CCKP CRU TS 0.5° collection: <https://worldbank.github.io/climateknowledgeportal/docs/collections/cru-x0.5.html>
- CCKP public gridded archive and access instructions: <https://worldbank.github.io/climateknowledgeportal/README.html>
- AWS Registry license listing: <https://registry.opendata.aws/wbg-cckp/>
