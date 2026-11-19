# Climate Twins source review

**Reviewed:** 19 November 2026
**Status:** source shortlist only; no data or game implementation approved.

## Gameplay question

Can players read a seasonal temperature/precipitation profile and use broad geographic knowledge—hemisphere, maritime versus continental influence, monsoon seasonality or latitude—to identify a city? This would test chart interpretation and climate patterns, rather than another country fact or coordinate estimate.

## Source comparison

| Source | Period and resolution | Terms and fit |
| --- | --- | --- |
| [WorldClim 2.1](https://www.worldclim.org/data/worldclim21.html) | Monthly minimum/mean/maximum temperature and precipitation normals for 1970–2000; available at 30 arc-seconds (about 1 km) and coarser resolutions. | [WorldClim's license](https://www.worldclim.org/about.html) says data are for academic and other noncommercial use; redistribution and commercial use require prior permission. Do not bundle it for Maproom without that permission. |
| [World Bank CCKP observed CRU data](https://climateknowledgeportal.worldbank.org/metadata) | Current climatology is 1991–2020; the current [CRU TS 0.5° collection](https://worldbank.github.io/climateknowledgeportal/docs/collections/cru-x0.5.html) is roughly 55 km across at the equator. Monthly climatologies can be obtained through the portal, while [the public archive](https://worldbank.github.io/climateknowledgeportal/README.html) documents global gridded files. | CCKP states its datasets use CC BY 4.0. This is the stronger candidate for an offline sample, but the grid is too coarse to claim a station reading or precise city climate; coastal and elevation differences may be smoothed. |

## Decision and next evidence

Keep Climate Twins as a candidate. Do not use the WorldClim rasters without prior permission. Before building from CCKP, sample candidate city coordinates against the 1991–2020 grid and report:

- the number of cities with usable values for every month and variable;
- duplicate grid cells and nearby-city pairs that would create indistinguishable clues;
- whether representative charts remain distinguishable after sensible rounding;
- examples where coastal location or elevation may make a gridded cell misleading;
- exact source/version, units, attribution and any transformations in the proposed bundled file.

If that check supports a fair sample, use wording such as “1991–2020 climate pattern in the nearest CRU grid cell,” not “the city's climate normals.” Keep the first prototype Free Play only and outside Daily until players assess chart comprehension and difficulty.

## Sources

- WorldClim 2.1 data description: <https://www.worldclim.org/data/worldclim21.html>
- WorldClim license: <https://www.worldclim.org/about.html>
- CCKP metadata and license: <https://climateknowledgeportal.worldbank.org/metadata>
- CCKP CRU TS 0.5° collection: <https://worldbank.github.io/climateknowledgeportal/docs/collections/cru-x0.5.html>
- CCKP public gridded archive and access instructions: <https://worldbank.github.io/climateknowledgeportal/README.html>
