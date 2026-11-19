# Historical geography research and data record

Research reviewed on 18 November 2026. The initial collection contains 20 distinct, locally bundled world political-boundary snapshots, from 1886 through 2011. The sampled years cover imperial state systems, the World Wars and their settlements, decolonization, independence and state dissolution. Each year has a short explanation and at least one historical or institutional reference in [`map-seeds.json`](map-seeds.json); the shipped [`manifest.json`](../../../public/data/historical/manifest.json) carries the complete per-map source, date, context, credit and asset-hash record.

## Selected source: CShapes 2.1

[CShapes 2.1](https://icr.ethz.ch/data/cshapes/beta.html) is a research dataset from ETH Zürich’s Center for Comparative and International Studies. Its release describes global borders for independent states and dependent territories from 1886 to 2023 and supplies the data in GeoJSON and other formats. We use the official [GeoJSON download](https://icr.ethz.ch/data/cshapes/CShapes-2.1.geojson), not an externally hosted map image. Its documented license is [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The release requests citation of Schvitz et al., “Mapping the International System, 1886–2017: The CShapes 2.0 Dataset,” *Journal of Conflict Resolution* 66(1), 2022, [doi:10.1177/00220027211013563](https://doi.org/10.1177/00220027211013563).

The downloaded source file used to build this pack had SHA-256 `330588b2e6de8e8ae952fca0b140169fab2c99fcd00955a9fff585bcd2ea4e73`. The exact file is not redistributed in this repository; the official URL, release page and checksum are recorded in the manifest. Rebuild with Node and the project dependencies after downloading that file to `.data/historical/CShapes-2.1.geojson`:

```sh
node docs/data/historical/build-maps.mjs
```

The generator selects features whose CShapes start/end dates cover 31 December of each curated year. It draws the global polygons with D3 Equal Earth, adds a ten-degree graticule, applies a screen-space simplification with antimeridian and spherical-ring checks, and writes standalone SVGs. SHA-256 for every derived asset is stored in the manifest and checked by the historical geography unit test. `mapPublishedYear` and `originalMapUrl` are explicitly `null`: these are Maproom-generated data visualizations, not archival maps published in those years. Their `depictedDate` is a precise snapshot convention, while CShapes warns that some underlying political change dates are approximate.

## Per-map record and historical sources

All 20 records share the CShapes source and geographic scope. For every snapshot, the manifest specifies the depicted year and date, null publication year and original scan URL, ETH Zürich institution, six dataset authors, original and release URLs, CC BY-NC-SA 4.0 license and license URL, required attribution and adaptation terms, context, dating caveat, feature count, context citations and asset hash. Historical context references are linked in the reveal. The selected years and explanations are:

| Depicted year | Context represented |
| --- | --- |
| 1886 | Opening year of the CShapes international-system time series |
| 1898 | Spanish–American War and a still-unsettled Treaty of Paris transition |
| 1914 | Political geography at the start of the First World War |
| 1918 | Breakup of Austria-Hungary and successor-state changes |
| 1920 | Postwar territorial arrangements after Versailles entered into force |
| 1923 | Year-end political geography after the Treaty of Lausanne |
| 1939 | Partition of Poland after the invasions; military fronts are not shown |
| 1945 | End of the Second World War; occupation zones are not fully represented |
| 1949 | Establishment of the PRC and the two German states |
| 1956 | Independence changes in North Africa and Sudan |
| 1960 | African decolonization and the UN independence declaration |
| 1965 | Singapore’s independence from Malaysia |
| 1971 | Bangladesh’s emergence as a separate state |
| 1975 | Independence transitions following Portuguese rule in Africa |
| 1980 | Zimbabwe’s independence |
| 1991 | Dissolution of the Soviet Union, with recognition caveats |
| 1993 | Eritrea’s independence and the Czechoslovak split |
| 2002 | Timor-Leste’s independence |
| 2006 | Montenegro’s independence and the state union’s end |
| 2011 | South Sudan’s independence and contested border areas |

The context references are authoritative institutional, treaty, legal or United Nations records where available. They substantiate the short explanation; CShapes remains the source for what each generated map draws. The complete URLs are in `map-seeds.json` and repeated in the built manifest.

## License and attribution decision

The data and every derived map are distributed under CC BY-NC-SA 4.0. In addition to attribution and an indication that Maproom generated/adapted each snapshot, **the license bars commercial use and requires adaptations to remain under the same license**. This restriction is visible on each map’s reveal and in SVG metadata. Keep the historical map pack only in a noncommercial use of Maproom unless separate rights are obtained or the map source is replaced. A source being downloadable is not, by itself, a reuse license.

The [David Rumsey Map Collection](https://www.davidrumsey.com/) was also reviewed as an important primary-map collection. Its [permissions policy](https://www.davidrumsey.com/about/copyright-and-permissions) says use can depend on an individual item’s download availability and the original map’s copyright; the collection places responsibility for checking other rights on the reuser. It is a valuable future source for item-by-item research, but no image was included because this initial global set needed a consistent license and machine-readable date coverage. No archival scan or map with unclear reuse rights is bundled.

## Scope and known limitations

- CShapes is suited to historical international boundaries and state-system research. It does not show every sovereignty claim, every occupation front, or all short-lived, de facto or locally administered arrangements.
- The map is a generalized global political visualization, not a legal boundary reference. CShapes’ political coding and event-date conventions determine the represented units; disputed borders and recognition history are not exhaustively adjudicated.
- There are no subnational boundaries, map labels, historical-language names, terrain layers or regional close-ups. Small islands and fine boundary changes may be hard to distinguish at this global scale.
- Snapshots intentionally stop at 2011. The source continues to 2023, but this first set was curated around changes with enough explanatory context; the later data years were not added simply to increase volume.
- The specific date shown for each map is the 31 December sampling rule. The source’s start/end day values may use defaults when an exact political-change day was unavailable. The game asks for the depicted year, not the publication year of an archival map.
- A 20-map deck provides variety but repeats after all 20 entries; the seed fixes the ordering for reproducible play.
- Lazy loading requests the small manifest first and only the current SVG as the game advances. Maproom’s existing `/data/` service-worker runtime caches successful data requests, so a map is available offline after it has been fetched once. A first visit without network access requires a prior successful fetch/cache.
- No external image, tile, geocoder or map API is used in play. The direct source, license and historical citations are opened only when the player follows a link.

## Difficulty calibration — alpha candidate

The 20 selected snapshots cover 1886–2011, a 125-year span. The earlier inclusive ±100/±50/±25-year tolerances did not match that compact deck: a guess of 1949 fell within 100 years of every snapshot and could pass every Easy map without reading its boundaries. We kept the existing Easy/Medium/Hard structure, but narrowed the accepted intervals to ±20/±8/±2 years. No maps or source data were added; the selected pack already contains identifiable, context-backed dates, and changing tolerance was the smallest correction.

The exhaustive unit check evaluates every integer guess across the CShapes source span against all 20 depicted years. The best fixed guess can pass at most 8/20 Easy maps, 4/20 Medium maps, and 2/20 Hard maps. The highest average score from one fixed guess is 359/1,000 on Easy, below 200 on Medium, and below 100 on Hard. Each accepted range is shown before play and in the result. These are generator-level calibration checks, not evidence of player-perceived difficulty; the original year bands were changed because their center-guess exploit was deterministic and reproducible.
