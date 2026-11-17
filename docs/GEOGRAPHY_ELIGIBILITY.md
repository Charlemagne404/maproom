# Geography eligibility

Maproom uses one shared country-pool rule for country-based games.

## Standard

Standard contains exactly 195 catalogue records:

- The 193 states currently admitted as United Nations Member States.
- The Holy See and the State of Palestine, the UN's two non-member Observer States.

The game uses the catalogue's ISO3 codes to map this rule onto its data. The inclusion list is explicit in [`src/geography/catalogue-rules.mjs`](../src/geography/catalogue-rules.mjs), so a future data refresh cannot silently redefine Standard through an `independent` flag or boundary vendor classification. The [United Nations lists its 193 Member States](https://www.un.org/about-us/member-states) and identifies the [Holy See and State of Palestine as non-member Observer States](https://research.un.org/en/unmembers/observers).

The UN observer is the Holy See, while the geographic catalogue labels its corresponding map record `VAT` / Vatican City. Standard uses that `VAT` record as the catalogue mapping for the Holy See observer entry; it does not treat the two names as interchangeable in every legal or political context.

Kosovo (XKX) and other places not covered by those two UN categories are not in Standard. This is a consistent game-pool rule, not an assertion about sovereignty or recognition.

## Geographic classifications

The bundled catalogue contains 255 geographic identities. Each identity is classified by the shared rules in [`src/geography/catalogue-rules.mjs`](../src/geography/catalogue-rules.mjs) and its catalogued `parentIso3` relationship:

- **Standard quiz identity:** the 195 entries described above. The `VAT` map record is the Standard mapping for the Holy See observer entry.
- **Separately represented territory:** an identity with an explicit parent relationship that is not in Standard.
- **Special geographic entity:** a catalogue record retained for geographic completeness but excluded from ordinary game pools: Antarctica, Ashmore and Cartier Islands, French Southern and Antarctic Lands, Bouvet Island, Clipperton Island, Coral Sea Islands, Akrotiri and Dhekelia Sovereign Base Areas, Heard Island and McDonald Islands, British Indian Ocean Territory, Svalbard and Jan Mayen as one combined map record, and the United States Minor Outlying Islands.
- **Additional identity:** a separately catalogued record outside Standard and without a Maproom parent relationship. This is a data grouping, not a sovereignty judgment.

## Extended

Extended ordinary game pools contain **243** catalogue identities: the 195 Standard identities, **45 separately represented territories**, and **3 additional identities**. The 12 special geographic entities remain in the 255-entry source catalogue but are not presented as ordinary country questions. Parent links remain available wherever recorded; inclusion in Extended does not imply independent sovereignty. The source catalogue is described in [DATA_SOURCES.md](DATA_SOURCES.md) and [DATA_COVERAGE.md](DATA_COVERAGE.md). Extended follows these explicit Maproom rules; it is not a claim that the catalogue is exhaustive or a political classification.

Country Outlines applies a separate, exhaustive playability review in [`src/games/outlines/playability.mjs`](../src/games/outlines/playability.mjs). All **255** identities have one explicit decision: **47 Easy, 105 Medium, 39 Hard, and 64 excluded** from pure-silhouette questions. The exclusion rules name the quality issue and whether contextual presentation is needed. Catalogue inclusion does not make a silhouette eligible; small, generic, ambiguous or widely dispersed outlines are excluded from this format while remaining available to other suitable games. Extended mixes eligible Standard and non-Standard entries; Territory focus is a separate optional pool.

The reproducible visual catalogue is generated with `npm run qa:outlines`. It renders all 255 identities plus 11 source features that lack a catalogue ISO3 code, labels each decision and data source, and saves light and dark regional sheets plus a machine-readable audit under `artifacts/qa/geography-overhaul/contact-sheets/`.

The geometry source remains Natural Earth 1:10m, public domain. A higher-vertex geoBoundaries ADM0 San Marino candidate was reviewed (2017 OpenStreetMap/Wambacher-derived boundary, ODbL, 929 vertices). Its locally fitted silhouette was still an almost oval city-state boundary without helpful identifying cues, so it did not make a fair pure-outline question. It was not merged into the public-domain outline dataset; San Marino remains catalogued for other games and is explicitly excluded from Country Outlines. geoBoundaries publishes per-boundary source and license metadata in its [API](https://www.geoboundaries.org/api.html); OpenStreetMap data uses the [ODbL attribution terms](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines).

## Game-specific data requirements

Eligibility defines the candidate country pool. A specific round can still require a usable fact or asset: map selection needs a bundled outline, an outline puzzle needs geometry, and a comparison needs the relevant population, area, coordinates, or city record. Games exclude a place when that required data is missing rather than inventing it. Search-based games can retain valid catalogued answers without map geometry.

Recorded land borders are converted into an undirected graph by taking the union of reciprocal catalogue references. Routes and neighbour answers therefore use the same edge rule. The data does not represent maritime borders and does not settle disputed boundary claims. Country shapes are generalized world-scale boundaries, not legal boundary products.
