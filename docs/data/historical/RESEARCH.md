# Historical geography research and data record

Research reviewed on 20 November 2026. The existing 20-map CShapes pack remains available for its prior saved sessions. New sessions use the expanded, curated Cliopatria atlas described below. Historical Flags is a separate source-backed learning set with individually recorded references and artwork-status notes.

## Expanded atlas: Cliopatria v0.2.1

[Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) is a historical polity dataset published by the Seshat Global History Databank. Maproom pins release v0.2.1 at commit `5f433377139a6eeaeacbdc894b70f8805b72c8b5`, whose source release is licensed [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The archive URL and exact byte hashes are recorded in the generated [`atlas manifest`](../../../public/data/historical/atlas/v2/manifest.json): archive SHA-256 `e10a4e429fca708788ff9e7572a95fce801fae55852d217cffabc1c59cd4eed4`, extracted GeoJSON SHA-256 `fc6f0d1e4cc42f45da83522b3696db6f2cc85ec0d12259a85c89b31347b8fc0a`.

The source contains 13,797 GeoJSON records, including both `POLITY` and `RELATION` feature types. Its recorded polity names span source intervals from 3400 BCE through 2024 CE; its coverage is selective and its intervals vary substantially. The builder excludes `RELATION` records and selects 41 curated regional and global views from 26 polity names, with sample years from 3300 BCE to 1900 CE across 20 named map frames. The full collection of source records is not redistributed.

The choices in [`atlas-seeds.json`](atlas-seeds.json) identify a polity, sample year, curated regional or global map window, clue, context and a visual distinctiveness factor for scoring. The builder requires the sample year to fall inside the source's inclusive interval and uses the intersection of intervals when multiple active geometries contribute. It clips each selected geometry to the named map window, normalizes ring winding, simplifies projected geometry and writes a standalone SVG with an asset SHA-256. It records source citations when the source provides a usable polity page, otherwise it links to the pinned release. The reproducible builder is [`scripts/data/build-historical-atlas.mjs`](../../../scripts/data/build-historical-atlas.mjs); provide the verified extracted GeoJSON at `.data/historical/cliopatria-v0.2.1.geojson` or as its first command-line argument.

The game accepts BCE and CE input with no year zero. Source data uses signed year values, and code converts them to astronomical numbering only for interval comparisons and distance calculations. If a source interval crosses the BCE/CE boundary, its displayed range skips year zero. A sample year selects an era deck; the source interval, not the sample alone, determines full-credit answers. Difficulty windows account for the age of the source interval and the map's assigned distinctiveness. Source intervals are not narrowed to create easier scoring.

### Source limits

- Cliopatria is a scholarly reconstruction and does not describe every political community, dependency, relation or territorial claim.
- The atlas is a set of selected polity views, not a comprehensive, non-overlapping global boundary series. Empty parts of the frame are not presented as uninhabited.
- Source date intervals are sometimes broad, and do not include per-polygon confidence values. The score and result disclose interval-based precision; they do not imply an exact event date.
- Some early eras and regions have fewer close alternatives. States & Empires uses distinct polity answers, preferring the same region or a sample within 250 years, then widening to within 1,000 years and finally to the remaining curated set when necessary.
- The map is a learning visualization, not an archival map, legal boundary, modern sovereignty statement or navigation source.

## Historical Flags

[`flag-seeds.json`](flag-seeds.json) records 20 historical flag entries spanning 19 political entities. Each entry has an individually reviewed source URL, period, region, clue, explanation, design-status label and artwork note. Twelve drawings are marked `documented`; eight are marked `reconstructed`. A reconstruction label means the vector drawing should be treated as an illustrative rendering of the cited description or historical evidence, not as an exact reproduction of a verified artifact. Additional citations are included where needed for specific period or design details.

Maproom generates the original SVGs with [`build-historical-flags.mjs`](../../../scripts/data/build-historical-flags.mjs). The SVG drawings are CC BY 4.0 and have asset SHA-256 values in the [flags manifest](../../../public/data/historical/flags/v1/manifest.json). The game presents a sourced clue before the answer and the period, explanation, artwork status and source references in the reveal. The same source index appears on `/data`.

The source index was reviewed against the institutional or legal references in each seed. Examples include the Élysée's French flag history, the U.S. National Archives' 1795 Flag Act, the Quirinale's Italian flag record, Australia's National Archives, Canadian Heritage, Japan's National Diet Library and national flag act, and the PRC Flag Law. The exact primary and supplementary URLs remain attached to the relevant entries rather than being inferred from a single global flag catalog.

## Historical States & Empires

This game reuses the same 41 curated Cliopatria map views and source intervals. It asks players to recognize one of four distinct polity names from the map and visible location clue. The game reveals the historical context, source period, uncertainty and citations. Its options are generated from the available 26 polity identities, with close geography or time favored when the selected source set supports at least three distinct alternatives.

This is a recognition game for the selected learning set, not a complete history atlas. Distractors become less closely related for a few thin-source questions; the option generator avoids duplicate entity names and never places the answer in the distractor set.

## Deferred stretch: Changing Borders

Changing Borders was not added. The mandatory historical game and Explore work were completed, but the available atlas is a curated set of polity outlines with overlapping and variable date intervals, not a complete sequence of comparable border states. The reviewed historical sources do not provide a single consistently licensed and consistently modeled full-world timeline for the stretch feature. Building a small transition game from these partial polity outlines would risk teaching that a selected empire polygon was a complete set of world borders. A defensible version needs a separately curated set of like-for-like changes with source-backed before/after dates and explicit scope.

## Earlier historical map pack: CShapes 2.1

The prior 20 global snapshots still use [CShapes 2.1](https://icr.ethz.ch/data/cshapes/beta.html), a research dataset from ETH Zürich's Center for Comparative and International Studies, covering international borders from 1886 to 2023. Maproom pins the source file checksum `330588b2e6de8e8ae952fca0b140169fab2c99fcd00955a9fff585bcd2ea4e73` and license [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Those terms and attribution remain on the legacy game; they are not replaced by the expanded atlas's CC BY 4.0 terms. Existing version-1 progress opens the legacy game so saved rounds retain their original questions and license context.
