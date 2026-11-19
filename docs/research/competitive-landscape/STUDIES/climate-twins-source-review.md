# Climate Twins source review

**Reviewed:** 19 November 2026
**Status:** an attributed CCKP ERA5 source path is available for a prototype review; no data or game implementation approved.

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

## Alternative source: CCKP ERA5

CCKP's [ERA5 collection documentation](https://worldbank.github.io/climateknowledgeportal/docs/collections/era5-x0.25.html) lists monthly climatologies for 1991–2020 on its 0.25° grid. The [World Bank Data Catalog record](https://datacatalog.worldbank.org/search/dataset/0065626/climate-change-knowledge-portal-observed-climate-data-era5-0-25-degree) identifies the processed ERA5 dataset as CC BY 4.0 and links its public NetCDF archive. CCKP's current [download terms](https://climateknowledgeportal.worldbank.org/download-data) add a mandatory mediation/arbitration clause and require World Bank/provider attribution, including attribution requirements in sublicenses. Include the terms link and source acknowledgement if derived profiles are bundled.

I downloaded the two public 1991–2020 monthly climatology files from the CCKP S3 archive on 19 November 2026 and inspected their NetCDF metadata. The 12-month `tas` variable is in °C; each value is a calendar-month average. The `pr` variable is in mm; each value is the monthly precipitation total averaged over 1991–2020. Both files identify the period and 0.25° grid in their global attributes, cite ECMWF/Copernicus as the raw source, and identify the CCKP processing. They do not contain a file-level license attribute. The archived objects are about 50 MB each, so the full rasters should remain temporary inputs to a small curated profile extract, not bundled game assets.

For reproducibility, the inspected files were:

- [ERA5 1991–2020 monthly mean temperature NetCDF](https://wbg-cckp.s3.amazonaws.com/data/era5-x0.25/tas/era5-x0.25-historical/climatology-tas-monthly-mean_era5-x0.25_era5-x0.25-historical_climatology_mean_1991-2020.nc), 49,892,668 bytes; SHA-256 `450df4fded6bbbe63d7a73e1f6394058acdb91ce5cea1865752aba6bdc898996`.
- [ERA5 1991–2020 monthly mean precipitation NetCDF](https://wbg-cckp.s3.amazonaws.com/data/era5-x0.25/pr/era5-x0.25-historical/climatology-pr-monthly-mean_era5-x0.25_era5-x0.25-historical_climatology_mean_1991-2020.nc), 49,892,172 bytes; SHA-256 `804178402ccce6231e9815df6abbf0fabda223626d396f0cc570657b07b6f09f`.

The nearest-grid-center audit of the 179 `capital: true` Maproom city records found data for all 179 and 178 distinct cells. It selected the nearest latitude and longitude centers from the file's coordinates, wrapping longitude at the dateline; no city landed exactly halfway between grid centers. Brazzaville and Kinshasa share one cell. At display rounding of 1°C and 10 mm/month, the pool has 178 unique profiles; the same single collision remains at 0.5°C/5 mm and 2°C/20 mm. This is sufficient diversity for a prototype sample, but the input list is GeoNames-derived and is not a complete capital gazetteer. A globally complete ERA5 field also does not prove that a nearby grid cell represents a coastal or elevated city well; those locations need manual review.

This is a source path for a controlled Free Play prototype, with attribution and the CCKP terms carried into any bundled derived-data notice. Keep the explicit “nearest ERA5 grid-cell pattern” wording, review coastal/elevation cases, and do not add the mode to Daily before player testing. The CRU TS source remains held pending resolution of its separate version and license conflicts; the WorldClim rasters remain unsuitable for bundling without permission.

## Decision and next evidence

Keep Climate Twins as a candidate. Use the CCKP ERA5 1991–2020 files for a prototype data extract; do not use the held CRU TS files or WorldClim rasters without resolving their respective restrictions. Before content is bundled, review coastal and high-elevation capitals, choose which of Brazzaville/Kinshasa is ineligible, pin source hashes and attribution, and preserve the CCKP terms URL. The first prototype should remain Free Play only. Player review still needs to report:

- the final eligible city count after the coastal/elevation and nearby-city review;
- any further profile collisions in the selected pool;
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
- Copernicus ERA5 monthly product and quality information: <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means?tab=overview>
- ECMWF explanation of monthly accumulated precipitation units: <https://confluence.ecmwf.int/pages/viewpage.action?pageId=226499488>
- AWS Registry license listing: <https://registry.opendata.aws/wbg-cckp/>
