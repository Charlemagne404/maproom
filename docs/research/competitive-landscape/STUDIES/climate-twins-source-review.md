# Climate Twins source review

**Reviewed:** 19 November 2026
**Status:** The CCKP ERA5 extract is technically viable, and 127 capital profiles pass a conservative spatial/elevation screen. The current CCKP terms claim to apply to dataset use and derived presentations and add mandatory mediation/arbitration requirements. The files were downloaded and used in an earlier technical audit before this terms review; the source status is unresolved. No CCKP-derived profile or game asset is bundled, and further product use is deferred.

## Gameplay question

Can players read a seasonal temperature/precipitation profile and use broad geographic knowledge—hemisphere, maritime versus continental influence, monsoon seasonality or latitude—to identify a city? This would test chart interpretation and climate patterns, rather than another country fact or coordinate estimate.

## Source comparison

| Source | Period and resolution | Terms and fit |
| --- | --- | --- |
| [WorldClim 2.1](https://www.worldclim.org/data/worldclim21.html) | Monthly minimum/mean/maximum temperature and precipitation normals for 1970–2000; available at 30 arc-seconds (about 1 km) and coarser resolutions. | [WorldClim's license](https://www.worldclim.org/about.html) says data are for academic and other noncommercial use; redistribution and commercial use require prior permission. Do not bundle it for Maproom without that permission. |
| World Bank CCKP observed CRU data | The inspected [CRU TS 4.09 monthly temperature](https://wbg-cckp.s3.amazonaws.com/data/cru-x0.5/tas/cru-ts4.09-historical/climatology-tas-monthly-mean_cru-x0.5_cru-ts4.09-historical_climatology_mean_1991-2020.nc) and [precipitation](https://wbg-cckp.s3.amazonaws.com/data/cru-x0.5/pr/cru-ts4.09-historical/climatology-pr-monthly-mean_cru-x0.5_cru-ts4.09-historical_climatology_mean_1991-2020.nc) files contain 1991–2020 monthly climatologies on a 0.5° grid (about 55 km at the equator). The [public archive](https://worldbank.github.io/climateknowledgeportal/README.html) documents gridded NetCDF access. Version documentation is inconsistent: the archive collection page says 4.07, the World Bank metadata page indexed 4.08, while these inspected files identify themselves as 4.09. | Licensing is unresolved. CCKP metadata says CC BY 4.0; each inspected NetCDF global attribute says the data are available under the UK Open Government Licence v3; the [AWS Registry entry](https://registry.opendata.aws/wbg-cckp/) lists the World Bank Open Database License (ODbL). Do not bundle or derive game content from these files until the data steward confirms which terms apply. Regardless of license, a 0.5° cell is not a station reading or precise city climate; coastal and elevation differences may be smoothed. |
| World Bank CCKP processed ERA5 | The inspected [monthly temperature](https://wbg-cckp.s3.amazonaws.com/data/era5-x0.25/tas/era5-x0.25-historical/climatology-tas-monthly-mean_era5-x0.25_era5-x0.25-historical_climatology_mean_1991-2020.nc) and [precipitation](https://wbg-cckp.s3.amazonaws.com/data/era5-x0.25/pr/era5-x0.25-historical/climatology-pr-monthly-mean_era5-x0.25_era5-x0.25-historical_climatology_mean_1991-2020.nc) products are for 1991–2020 on a 0.25° grid. | The World Bank catalog assigns CC BY 4.0; CCKP also requires attribution and adds a mandatory dispute-resolution clause. The data are public and precomputed, but each global variable file is about 50 MB. |

## Data-fit audit

For a local feasibility check, I sampled the two public CRU TS 4.09 NetCDF files above against Maproom's existing `public/data/cities-major.json`. The file contains 12,405 records; after the current-settlement filter used by city games, 11,577 remained. Each city was assigned the nearest grid center by latitude and wrapped longitude. This temporary analysis was run outside the repository; no climate data or helper dependency was added to Maproom.

- 11,559/11,577 current settlements (99.84%) had all twelve months of both variables in their directly nearest grid cell; 18 coastal/island records landed on masked cells.
- Those 11,559 records occupied 6,344 distinct valid cells. 2,003 cells were shared by multiple records, containing 7,218 records, so the full city list cannot be used as independent climate answers.
- After rounding temperature to the nearest 1°C and monthly precipitation to the nearest 10 mm, the broad pool contained 6,330 unique profiles. The duplicates are concentrated in metropolitan clusters; for example, 47 Île-de-France records shared one cell and profile.
- The 179 records marked as capitals all had data, with 178 unique grid cells and profiles after the same rounding. Brazzaville and Kinshasa share the one profile, so a capital-only pool would need to omit one or make that pair ineligible together. These are GeoNames-derived Maproom records, not a complete list of the world's capitals.

This CRU major-city sample does not support treating every nearby settlement as a distinct climate profile. The nearest-cell wording must remain explicit. Its capital subset is incomplete because it excludes many low-population places; see the full `cities.json` audit below.

The 179-capital count in this CRU audit is from `cities-major.json`, which excludes most places below 50,000 population. It is not the full capital-marked city pool.

## Alternative source: CCKP ERA5

CCKP's [ERA5 collection documentation](https://worldbank.github.io/climateknowledgeportal/docs/collections/era5-x0.25.html) lists monthly climatologies for 1991–2020 on its 0.25° grid. The [World Bank Data Catalog record](https://datacatalog.worldbank.org/search/dataset/0065626/climate-change-knowledge-portal-observed-climate-data-era5-0-25-degree) identifies the processed ERA5 dataset as CC BY 4.0 and links its public NetCDF archive. CCKP's current [download terms](https://climateknowledgeportal.worldbank.org/download-data) say use of the dataset or presentation of derived data accepts additional terms, including mandatory mediation/arbitration and World Bank/provider attribution. Those terms were found after the files had already been used for a technical feasibility audit. No product use has been approved, and the source should not be treated as cleared until the status of that earlier use and the additional terms are resolved.

I downloaded the two public 1991–2020 monthly climatology files from the CCKP S3 archive on 19 November 2026 and inspected their NetCDF metadata. The 12-month `tas` variable is in °C; each value is a calendar-month average. The `pr` variable is in mm; each value is the monthly precipitation total averaged over 1991–2020. Both files identify the period and 0.25° grid in their global attributes, cite ECMWF/Copernicus as the raw source, and identify the CCKP processing. They do not contain a file-level license attribute. The archived objects are about 50 MB each, so the full rasters should remain temporary inputs to a small curated profile extract, not bundled game assets.

For reproducibility, the inspected files were:

- [ERA5 1991–2020 monthly mean temperature NetCDF](https://wbg-cckp.s3.amazonaws.com/data/era5-x0.25/tas/era5-x0.25-historical/climatology-tas-monthly-mean_era5-x0.25_era5-x0.25-historical_climatology_mean_1991-2020.nc), 49,892,668 bytes; SHA-256 `450df4fded6bbbe63d7a73e1f6394058acdb91ce5cea1865752aba6bdc898996`.
- [ERA5 1991–2020 monthly mean precipitation NetCDF](https://wbg-cckp.s3.amazonaws.com/data/era5-x0.25/pr/era5-x0.25-historical/climatology-pr-monthly-mean_era5-x0.25_era5-x0.25-historical_climatology_mean_1991-2020.nc), 49,892,172 bytes; SHA-256 `804178402ccce6231e9815df6abbf0fabda223626d396f0cc570657b07b6f09f`.

I reran the ERA5 audit against the full `public/data/cities.json` catalog. It contains 241 records marked `capital: true` (GeoNames `PPLC`), including dependent territories and low-population places. Each has all twelve months of both ERA5 variables. The nearest-grid-center match selects 238 distinct cells; after rounding temperature to 1°C and monthly precipitation to 10 mm, there are 237 unique profiles. Duplicate groups are Brazzaville/Kinshasa, Marigot/Philipsburg/The Valley, and Rome/Vatican City. The maximum city-to-cell-center distance is 18.4 km.

I checked the city points and matched ERA5 grid centers against Maproom's Natural Earth 1:10m country outlines. Of 241 nearest centers, 173 fall on a mapped land polygon; nine land centers fall inside a different country polygon, and 19 city coordinates fall outside any mapped land polygon. Requiring both the city point and nearest grid center to fall inside the same mapped country and excluding the two records classified as Antarctic leaves 155 candidate profiles with no rounded-profile duplicates. This is a conservative screening rule, not a complete coastal truth test: Natural Earth can omit tiny islands and does not encode the reanalysis model's land fraction.

For an elevation screen, I joined the 241 stable GeoNames IDs against the current daily [cities500 dump](https://download.geonames.org/export/dump/cities500.zip), retrieved 19 November 2026 (SHA-256 `b8b2890c374ac8871b33e6ddaa0f7714f383fb394c31555fc53d3f34a05597c6`). The current dump's name, coordinate, population, feature-code and country fields matched every city record in Maproom's 16 November snapshot. GeoNames documents its `dem` field as a SRTM3 or GTOPO30 area-average elevation, so I used it only as a screening signal, not as a surveyed city elevation. Thirty-one of 241 capitals are at least 1,000 m in that field; 28 remain in the 155-profile spatial screen. Excluding those high-elevation records leaves 127 unique profiles: Africa 28, Asia 33, Europe 40, North America 15, Oceania 5 and South America 6. All values are complete. This screen avoids profiles where local elevation may be poorly represented by a 0.25° cell, but it also leaves small-island coverage limited. Coastal and border cases still need visual review before the pool is fixed.

This is a technical source path for a controlled Free Play prototype, but the product work is deferred while the current CCKP terms remain unresolved. Keep the explicit “nearest ERA5 grid-cell pattern” wording, review coastal/border cases, and do not add the mode to Daily before player testing. The CRU TS source remains held pending resolution of its separate version and license conflicts; the WorldClim rasters remain unsuitable for bundling without permission.

Copernicus also publishes a direct [ECV monthly climate dataset](https://cds.climate.copernicus.eu/datasets/ecv-for-climate-change?tab=overview) with 1991–2020 climatologies and a CC BY 4.0 license. Its user guide identifies ERA5 as the source for the temperature and precipitation fields used here; the dataset is on a 0.25° grid and requires CDS login to download. No CDS API credentials are configured in this environment, so I did not retrieve it. This is the alternative if the CCKP's additional dispute-resolution terms are unsuitable. ERA5-Land itself is available at 0.1° under CC BY 4.0 but requires a separate account-authenticated extraction and 1991–2020 aggregation.

## Decision and next evidence

Keep Climate Twins as a candidate, but defer further product use of CCKP-derived content until the status of the earlier technical audit and the additional terms are resolved. The CCKP ERA5 1991–2020 files support a 127-profile technical pool after the conservative screen above; no CCKP-derived profile or game asset is bundled. The direct Copernicus ECV CC BY 4.0 alternative remains unverified here because CDS access was unavailable. Do not use the held CRU TS files or WorldClim rasters without resolving their restrictions. If a source path is cleared later, visually review coastal/border locations, pin source hashes and transformation rules, and document attribution. Any first prototype should remain Free Play only. Player review still needs to report:

- the final eligible city count after the visual coastal/border review;
- whether the conservative 1,000 m elevation screen omits useful, representative climate patterns;
- whether representative charts remain distinguishable and understandable after display rounding;
- examples where coastal location or elevation may make a gridded cell misleading;
- exact source files/hashes, units, attribution, terms URL and transformations in the proposed bundled file.

Use wording such as “1991–2020 climate pattern in the nearest ERA5 grid cell,” not “the city's climate normals.”

## Sources

- WorldClim 2.1 data description: <https://www.worldclim.org/data/worldclim21.html>
- WorldClim license: <https://www.worldclim.org/about.html>
- CCKP metadata and license: <https://climateknowledgeportal.worldbank.org/metadata>
- CCKP collection documentation (currently labels CRU TS 4.07): <https://worldbank.github.io/climateknowledgeportal/docs/collections/cru-x0.5.html>
- CCKP CRU TS 0.5° collection: <https://worldbank.github.io/climateknowledgeportal/docs/collections/cru-x0.5.html>
- CCKP public gridded archive and access instructions: <https://worldbank.github.io/climateknowledgeportal/README.html>
- CCKP ERA5 collection metadata and 0.25° grid: <https://worldbank.github.io/climateknowledgeportal/docs/collections/era5-x0.25.html>
- World Bank ERA5 dataset catalog record and CC BY 4.0 license: <https://datacatalog.worldbank.org/search/dataset/0065626/climate-change-knowledge-portal-observed-climate-data-era5-0-25-degree>
- CCKP download terms, including additional dispute-resolution terms and attribution: <https://climateknowledgeportal.worldbank.org/download-data>
- CCKP ERA5 data files: [temperature](https://wbg-cckp.s3.amazonaws.com/data/era5-x0.25/tas/era5-x0.25-historical/climatology-tas-monthly-mean_era5-x0.25_era5-x0.25-historical_climatology_mean_1991-2020.nc), [precipitation](https://wbg-cckp.s3.amazonaws.com/data/era5-x0.25/pr/era5-x0.25-historical/climatology-pr-monthly-mean_era5-x0.25_era5-x0.25-historical_climatology_mean_1991-2020.nc)
- GeoNames `cities500` export and field definitions: <https://download.geonames.org/export/dump/readme.txt>
- Natural Earth terms for the country outline source already bundled by Maproom: <https://www.naturalearthdata.com/about/terms-of-use/>
- Copernicus ECV monthly product, climatology periods and CC BY 4.0: <https://cds.climate.copernicus.eu/datasets/ecv-for-climate-change?tab=overview>
- Copernicus ECV Product User Guide, source variables and adjustments: <https://confluence.ecmwf.int/spaces/CKB/pages/250030334/Essential+Climate+Variables+for+assessment+of+climate+variability+from+1979+to+present+Product+user+guide>
- Copernicus ERA5-Land monthly product, 0.1° resolution and CC BY 4.0: <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means?tab=overview>
- Copernicus ERA5 monthly product and quality information: <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means?tab=overview>
- ECMWF explanation of monthly accumulated precipitation units: <https://confluence.ecmwf.int/pages/viewpage.action?pageId=226499488>
- AWS Registry license listing: <https://registry.opendata.aws/wbg-cckp/>
