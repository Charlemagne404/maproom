# Data sources, licensing and attribution

The exact retrieval timestamp, source URL, input SHA-256, transformation list and license URL for the current build are recorded in `public/data/data-manifest.json`. The live Data Sources page reads that manifest and `region-index.json`; the latter records boundary ID, represented year, source, primary source URL, license evidence, provider URL and release reference for each included ADM1 country package.

## Country boundaries

Natural Earth 1:50m Admin 0 Countries supplies the world-scale country shapes. It is public domain; the project credits it as “Made with Natural Earth.” Features are normalized to country-catalog ISO3 identifiers and reduced to the properties needed by the app. Natural Earth's generalized boundaries and conventions around small islands and disputed areas remain visible in the coverage notes. [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/).

## Country facts and identities

The `mledoze/countries` catalog supplies ISO codes, common and official names, alternate and native spellings, continent/subregion, capital names, area, landlocked state and neighbor codes. The downloaded upstream license is kept at `public/data/COUNTRY-CATALOG-ODbL-1.0.txt`; this database and its adapted catalog are subject to the Open Database License 1.0, including its attribution and share-alike requirements for adapted databases. The manifest stores the source file checksum. [Upstream project and license](https://github.com/mledoze/countries) · [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

## Population

Country population quiz facts use the World Bank World Development Indicators series `SP.POP.TOTL` for the 2023 observation year, joined by ISO3 code. The observation year is stored beside the value; countries without a non-null World Bank value remain `null` rather than receiving an invented number. This series is not a live feed. World Bank open data is generally under CC BY 4.0 with the Bank's dataset terms; the manifest records the exact API response hash, API last-updated date, attribution and source URL. [World Bank Indicators API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation) · [World Bank data license](https://datacatalog.worldbank.org/public-licenses).

## First-level administrative boundaries

The build uses the geoBoundaries current gbOpen ADM1 index and the provider's simplified per-country GeoJSON. In the current build, 198 country packages were included, with 3,236 named divisions. Each package is quantized and converted to TopoJSON at a 1e-5 degree coordinate grid and is loaded only on demand. The public metadata records its primary provider, boundary release, represented year and license evidence; where geoBoundaries points to a separately licensed primary source, its terms still apply. Do not infer uniform coverage or license terms from the global count. [geoBoundaries API and metadata](https://www.geoboundaries.org/api.html). The generated [coverage table](DATA_COVERAGE.md) lists every country package and its stated license.

## Cities and capitals

GeoNames `cities500.zip` provides populated-place names, alternate names, coordinates, ISO country and first-level codes, population and feature codes. The app includes 34,456 records: populated places with population of 50,000 or more, plus national and first-level seats even when smaller. The package is released under CC BY 4.0 and attributed as GeoNames. Capital names come from the country catalog; capital coordinates are joined from GeoNames national-capital (`PPLC`) records where available. [GeoNames export and terms](https://www.geonames.org/export/).

## Flags

Flag art is bundled from `flag-icons` and keyed by ISO 3166-1 alpha-2 code. The package is MIT-licensed and is pinned through `package-lock.json`; its CSS and SVG assets are shipped locally, so gameplay does not call a flag service. [Project and license](https://github.com/lipis/flag-icons).

## Rebuilding and reviewing data

Run `npm run data:sync` to download current sources, update every checksum and retrieval date, regenerate country/city/boundary files, and refresh `docs/DATA_COVERAGE.md`. The country catalog and Natural Earth URLs track upstream branches, so a later rebuild can change names, facts or geometry. Review both generated reports and source-license evidence before distributing a refreshed dataset. No boundary or fact is invented to fill gaps.
