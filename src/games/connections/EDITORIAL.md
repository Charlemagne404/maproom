# Geography Connections: editorial guide

## Library and runtime

Boards are fixed editorial content in `src/puzzles/connections-content.ts`. The game never invents a category or combines predicates at runtime. `src/puzzles/connections.ts` selects a board from the chosen overall difficulty, seeded-shuffles its 16 country tiles, and runs the authoring audit. The data, interaction layer, and browser styles stay in the Geography Connections workstream.

The opening library contains 24 boards: 8 each in the Easy, Medium, and Hard pools. Each board has four separately ranked groups (tiers 1–4). Overall difficulty describes the combined board; tier describes a group's intended reveal color/order. Both assignments are editorial judgments and need a human play-through before a new board is added.

A blinded qualitative review protocol for the current library is ready in [the study pack](../../../docs/research/competitive-landscape/STUDIES/connections-content-review.md); no participant sessions have been run yet.

Each group records its visible label, explanation, four ISO3 entries, tier, and a machine-readable fact rule. The rule and selected country codes must agree exactly on that board. For a finite membership set with more than four members, the label says **among** and the explanation states the full set size; the remaining members must not be extra tiles on that board.

## Authoring checklist

1. Choose four relationships that use different kinds of geography knowledge. Avoid a board made only of continents, broad subregions, or easy name endings.
2. Give every group four distinct ISO3 codes from the bundled country catalogue. Across the four groups, all 16 codes must be unique and appear once. Do not repeat the same four-country answer set within an overall difficulty pool; rotate valid subsets when a larger source set allows it.
3. Write a short category label and a one-sentence reveal that states the actual rule, its boundary, and any date or subset limit.
4. Record the exact fact rule. Add a named set when membership requires a human-authored list; give that set a source and a note in `CONNECTIONS_NAMED_FACT_SETS`.
5. Put plausible decoys on the same board, then check what else the 16 entries share: borders, continents, subregions, landlocked status, names, capital names, coast sets, history lists, current currency areas or political memberships, flag patterns, and any relevant data band.
6. Run `npm test -- --run src/puzzles/connections.test.ts`. Every board must pass the structural, country-code, declared-fact and exact-alternative checks. Read all reported overlaps and decide whether they are broad red herrings or a second usable four-country answer.
7. Play every category both before and after another category is solved. Check that a knowledgeable player can infer the label from the reveal, that the wording is defensible, and that the group is challenging without requiring a trick definition.

An overlap of more than four board tiles is reported for human review. It is not silently treated as an exact quartet: a set with five matches can still provide several plausible four-country guesses. Keep such overlaps deliberate and explain them in the puzzle's editorial note. An exact alternate quartet that does not equal one of the four intended answer sets is an audit error.

Source-backed sets marked `advisory` are a separate review queue. Their exact or larger matches are reported in `auditConnectionsLibrary().advisories`, but they do not fail board validation until editorial review determines that players could reasonably use the association. If a player study confirms the category is salient, promote the set into the blocking answer-rule bank and repair affected boards before release.

### Starter-library overlap review

The 24-board audit reports no unassigned exact quartet. Counts are the number of tiles matching that rule, not additional answer groups. Rows for Atlas 02, 04, 11, 13, 22 and 23 below reflect the alpha-candidate edits; the other rows remain the reviewed opening-library counts. Any new warning must be reviewed and recorded before publication.

| Board | Reviewed broad matches |
| --- | --- |
| Atlas 02 | landlocked (5); Asia (5); Africa (5) |
| Atlas 03 | landlocked (6); Asia (7); Europe (6) |
| Atlas 04 | Asia (6); Europe (6) |
| Atlas 05 | Asia (7); South-Eastern Asia (5) |
| Atlas 06 | landlocked (5); Africa (7) |
| Atlas 07 | Asia (12); Western Asia (6) |
| Atlas 08 | Europe (6); Africa (6) |
| Atlas 09 | Asia (6); Europe (6) |
| Atlas 11 | none above the four-tile review threshold; its four “-stan” answers are also the same four Asia tiles, not an alternative tile set |
| Atlas 12 | Asia (6); Africa (6) |
| Atlas 13 | none above the four-tile review threshold; its Iran-border quartet also shares the same four Asia tiles |
| Atlas 14 | Europe (10) |
| Atlas 15 | country names beginning B (7); Asia (7); Europe (6); 2023 population above 100 million (5) |
| Atlas 16 | Asia (8) |
| Atlas 17 | landlocked (8); Asia (6); Europe (6) |
| Atlas 18 | landlocked (5); Asia (6); Africa (6) |
| Atlas 19 | Asia (7); Europe (5) |
| Atlas 20 | Asia (6); Africa (6) |
| Atlas 21 | landlocked (6); Asia (6); Europe (6) |
| Atlas 22 | Europe (7) |
| Atlas 23 | Asia (5); Europe (8) |
| Atlas 24 | Asia (7) |

Atlas 01 and Atlas 10 produce no broad-match warning under the checked rule set. The audit intentionally avoids treating arbitrary population or area cutoffs as plausible alternatives: such bins can be invented endlessly and are not clues unless the board names and dates them. It does check authored bands, the recurring under-1,000 km² and above-100-million thresholds, country and capital initials, name patterns, all catalogue borders and regions, landlocked status, and every named set.

### Alpha-candidate fairness repair — 19 November 2026

An offline scan against the EU's current euro-area membership and the authored board rules confirmed that the flagged groups could produce plausible alternatives. The changed boards were reviewed one by one and repaired with factual, sourced tile sets rather than hiding the advisory:

| Board | Editorial change | Reason |
| --- | --- | --- |
| Atlas 02 | Replaced Portugal with Timor-Leste in the Portuguese-official-language set. | Removes the exact BEL/ESP/LUX/PRT euro-area quartet while keeping four valid CPLP members. |
| Atlas 04 | Replaced Finland with Poland and Ireland with Thailand in the “end in land” set; replaced Czechia and Laos with Niger and Burkina Faso in the landlocked set; replaced Norway with Germany in the North Sea set. | Removes the euro quartet and the additional Germany-border, Myanmar-border, and Northern Europe exact alternatives found during validation. The remaining Asia (6) and Europe (6) intersections are broad decoys, not exact four-tile matches. |
| Atlas 11 | Replaced the Swiss-border group with a 2023 5–10 million population group using Liberia, Libya, Sierra Leone and New Zealand; changed its four “-stan” members to Afghanistan, Kazakhstan, Pakistan and Uzbekistan. | The Swiss-border and Adriatic groups exposed five euro-area tiles. The sourced group removes the China-border quartet; the revised board has three China-border tiles, short of a second group. The Asia association matches the same “-stan” quartet, not another set of tiles. |
| Atlas 13 | Replaced the 2023 population quartet AUT/FIN/IRL/LUX with CRI/SLV/NZL/NIC; replaced Indonesia with Gabon in the Equator set; replaced Armenia with Turkey in the Iran-border set. | Removes the euro quartet and the landlocked alternative found in the first replacement pass. The Iran-border group and Asia each describe the same four tiles. |
| Atlas 22 | Replaced the OPEC subset with a 2023 5–10 million population group (CRI/NIC/SLV/ISR), replaced Lesotho with Eswatini in the SACU subset, and replaced Bulgaria with Turkey in the Black Sea group. | The OPEC and Black Sea tiles made another Asia quartet; the SACU change removes a landlocked alternative, and the Black Sea change removes an additional euro-area tile. The EEC label now says “Among the six 1957 EEC founders,” and the reveal names the 1957 Treaty of Rome. Its four EEC tiles also use the euro, but that remains the same answer set. The remaining Europe (7) intersection is broad and produces no alternate exact quartet. |
| Atlas 23 | Replaced Croatia with Bosnia and Herzegovina in the former-Yugoslav-republic subset. | Keeps the sourced six-republic set while removing the exact FRA/HRV/LUX/SVN euro-area quartet. |

The resulting code audit passes for all 24 boards and reports no unassigned exact quartet or unassigned euro-area advisory. Atlas 22 still has seven Europe tiles. That is a deliberate broad red herring: the four EEC founders are the specified answer, and the remaining three Europe tiles do not make a second four-tile membership set. Atlas 22's four EEC tiles also use the euro, but that association is the same tile answer, not a different selection. Atlas 11's “-stan” quartet and Atlas 13's Iran-border quartet likewise share their answer tiles with the Asia label; neither creates another set of four tiles. Atlas 02 and 04 retain the documented broad regional overlaps from the audit table, with no exact alternate quartet.

Developer first-read play and the unit audit are not independent player evidence. The blinded [review protocol](../../../docs/research/competitive-landscape/STUDIES/connections-content-review.md) remains unrun; perceived difficulty and whether these deliberate overlaps feel fair remain unknown. Keep its study before making further content tuning.

### Answer-set repetition review

No exact four-country answer set is repeated within an Easy, Medium, or Hard pool. Across difficulty pools, three exact repeats remain: Atlas 01/24's four country names containing “Guinea,” Atlas 03/21's four national capitals on the Danube, and Atlas 08/17's four Lake Chad shoreline countries. Each underlying fact has exactly four members in the sources used here, so a different four-country subset would be inaccurate. The test suite records these exceptions and rejects any other cross-pool duplicate until it receives editorial review.

Groups drawn from larger finite membership sets now say “among” and name the total size, including ASEAN's five founders, the five sovereign Nordic Council members, the seven G7 members, and the named historical organizations. When a set has more than four valid members, the library rotates the selected quartet where the board's other facts allow it.

## Fact sources and interpretation

| Fact family | Source and use |
| --- | --- |
| Names, capitals, capital coordinates, area, landlocked status, subregion and shared land borders | The checked-in [country catalogue](../../../public/data/data-manifest.json) identifies the `mledoze/countries` ODbL snapshot and the transformations used to create `public/data/countries.json`. Border clues use its reciprocal land-neighbor list; they do not mean maritime neighbors. |
| 2023 population | [World Bank WDI, SP.POP.TOTL](https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2023&per_page=20000), joined by ISO3. Labels name the year. A band includes its lower bound and excludes its upper bound. |
| Equator, Tropic of Capricorn, and named-sea shorelines | [Natural Earth 1:50m cultural vectors](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/) and a board-by-board line/coastline review. These are generalized world-scale geometries, so a shoreline or tiny-island decision follows the stated map scale. The Tropic fact is land-only at 23.4366° south; territorial waters do not count. The Equator set retains São Tomé and Príncipe because the generalized Natural Earth geometry omits the tiny Rolas Islet land crossing. |
| Danube capitals | National-capital coordinates from the checked-in GeoNames data and the pinned Natural Earth 1:50m river centerlines. The set concerns four capitals on the river, not every country in the basin. |
| Lake Chad shore | [NASA Earth Observatory](https://science.nasa.gov/earth/earth-observatory/lake-chads-water-wetlands-and-dunes-154407/) and the [International Lake Environment Committee World Lake Database](https://wldb.ilec.or.jp/Lake/AFR-02). Cameroon, Niger, Nigeria and Chad are the four lake-border countries; this excludes other Lake Chad basin states. |
| ASEAN founders | [ASEAN's founding history](https://asean.org/the-founding-of-asean/): Indonesia, Malaysia, the Philippines, Singapore and Thailand signed the 1967 Bangkok Declaration. Current membership is not substituted for the founding set. |
| CPLP / Portuguese official language | [CPLP member-state pages](https://www.cplp.org/estados-membros/) and country language designations. The named set includes Equatorial Guinea's Portuguese official-language designation; a clue says Portuguese is official, not that it is the only language. |
| Nordic sovereign states | [Nordic cooperation](https://www.norden.org/en/information/about-presidency-nordic-council-ministers), restricted to Denmark, Finland, Iceland, Norway and Sweden. Autonomous areas are not country tiles. |
| Central Asian former Soviet republics | The five former Soviet republics of Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan and Uzbekistan. This is an explicitly historical subset, not the full modern Central Asia region. |
| Former Yugoslav republics | The [International Criminal Tribunal for the former Yugoslavia](https://www.icty.org/en/about/what-former-yugoslavia) identifies the six SFRY republics. Kosovo was not one of the six republics. |
| G7 | [G7 Italia](https://www.g7italy.it/en/about-g7/) lists the seven country members; the European Union is not a country tile. |
| Visegrad Four | [The International Visegrad Fund](https://www.visegradgroup.eu/about) describes Czechia, Hungary, Poland and Slovakia as the V4. |
| OPEC founding members | [OPEC's 1960 history](https://www.opec.org/pr-detail/77-14-sep-2022.html): Iran, Iraq, Kuwait, Saudi Arabia and Venezuela. A four-tile board category says “among” the five. |
| SACU members | [Southern African Customs Union](https://www.sacu.int/about-sacu): Botswana, Eswatini, Lesotho, Namibia and South Africa. A four-tile board category says “among” the five. |
| EEC founding members | [European Commission enlargement timeline](https://commission.europa.eu/topics/enlargement/together-eu_en): Belgium, France, Germany, Italy, Luxembourg and the Netherlands signed the Treaty of Rome. A four-tile board category says “among” the six. |

The snapshot hashes, retrieval dates, licenses and transformation notes for the bundled sources are recorded in `public/data/data-manifest.json`; the ODbL notice is included at `public/data/COUNTRY-CATALOG-ODbL-1.0.txt`. At runtime the game uses only bundled data and authored content, so a played or replayed board needs no network connection.

## Validation limits

The validator can prove shape, catalogue membership, a declared rule's exact board membership, and absence of an unassigned exact quartet among its known fact rules. It cannot prove that a historical membership list is correct or that a category feels fair. Named-set membership therefore needs its linked source and note, and every new board still needs editorial review. Broad overlaps such as “same continent” are useful decoys only when the board does not leave a different exact four-country answer under that rule.
