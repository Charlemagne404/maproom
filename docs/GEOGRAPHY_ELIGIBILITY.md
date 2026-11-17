# Geography eligibility

Maproom uses one shared country-pool rule for country-based games.

## Standard

Standard contains exactly 195 catalogue records:

- The 193 states currently admitted as United Nations Member States.
- The Holy See and the State of Palestine, the UN's two non-member Observer States.

The game uses the catalogue's ISO3 codes to map this rule onto its data. The inclusion list is explicit in [`src/geography/eligibility.ts`](../src/geography/eligibility.ts), so a future data refresh cannot silently redefine Standard through an `independent` flag or boundary vendor classification. The [United Nations lists its 193 Member States](https://www.un.org/about-us/member-states) and identifies the [Holy See and State of Palestine as non-member Observer States](https://research.un.org/en/unmembers/observers).

The UN observer is the Holy See, while the geographic catalogue labels its corresponding map record `VAT` / Vatican City. Standard uses that `VAT` record as the catalogue mapping for the Holy See observer entry; it does not treat the two names as interchangeable in every legal or political context.

Kosovo (XKX) and other places not covered by those two UN categories are not in Standard. This is a consistent game-pool rule, not an assertion about sovereignty or recognition.

## Extended

Extended contains all 255 geographic identities in Maproom's current catalogue, including separately playable territories and additional or limited-recognition records where supplied by the source. The 195 Standard entries remain fixed. Parent relationships are recorded where appropriate, and Extended membership does not imply independent sovereignty. The source catalogue is described in [DATA_SOURCES.md](DATA_SOURCES.md) and [DATA_COVERAGE.md](DATA_COVERAGE.md). Extended follows that catalogue; it is not a claim that the list is exhaustive or a political classification.

## Game-specific data requirements

Eligibility defines the candidate country pool. A specific round can still require a usable fact or asset: map selection needs a bundled outline, an outline puzzle needs geometry, and a comparison needs the relevant population, area, coordinates, or city record. Games exclude a place when that required data is missing rather than inventing it. Search-based games can retain valid catalogued answers without map geometry.

Recorded land borders are converted into an undirected graph by taking the union of reciprocal catalogue references. Routes and neighbour answers therefore use the same edge rule. The data does not represent maritime borders and does not settle disputed boundary claims. Country shapes are generalized world-scale boundaries, not legal boundary products.
