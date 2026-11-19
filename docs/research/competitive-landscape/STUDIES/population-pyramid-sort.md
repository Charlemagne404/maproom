# Population Pyramid Sort

## Product decision

Population Pyramid Sort is a five-round Free Play game. Each round presents three anonymous, consistently scaled 2023 population pyramids. The player reorders them from lowest to highest population share aged 65 or older. After checking, the game names the countries, displays the exact 65+ shares, and shows the correct order. The keyboard and touch controls are explicit Earlier/Later buttons; dragging is not required.

The set contains 15 different country identities. Each round awards 100 points for each correctly ordered country pair, for a maximum of 300 points per round and 1,500 per set. The rounds tighten their adjacent 65+ share gaps in this order: 8–18, 6–14, 4–10, 2.5–7, and 1–4 percentage points. These are generator bands selected after checking available source data, not empirically validated player-difficulty levels. Keep the game in Free Play until players have been observed and its comprehension and spacing have been assessed.

## Source and method

The bundled 2023 values come from the World Bank World Development Indicators API. Its 17 five-year age bands (0–4 through 75–79, plus 80+) provide separate male and female shares. The source series define each value as a share of that sex's population, so the build step weights each band by the corresponding male or female population total before drawing both sides as percentages of the country's total population:

`sex-specific age-band share × sex population / (male population + female population)`

The ordering metric is the WDI indicator for the population ages 65 and older as a share of total population. The weighted age bands from 65+ independently agree with that indicator to less than 0.00008 percentage points across the bundled profiles. The source series and transformation are also recorded in [`public/data/data-manifest.json`](../../../../public/data/data-manifest.json).

- [World Bank WDI: population ages 00–04, male](https://data.worldbank.org/indicator/SP.POP.0004.MA.5Y) and [female](https://data.worldbank.org/indicator/SP.POP.0004.FE.5Y)
- [World Bank WDI: population totals by sex](https://data.worldbank.org/indicator/SP.POP.TOTL.MA.IN) and [population ages 65+](https://data.worldbank.org/indicator/SP.POP.65UP.TO.ZS)
- [United Nations World Population Prospects 2024](https://population.un.org/wpp/)
- [World Bank data terms](https://data.worldbank.org/summary-terms-of-use)

The API reported its release last updated on 11 November 2026. The checked-in dataset contains complete values for 194 of the 195 Standard quiz identities; Vatican City has no complete profile and is omitted with no fallback. The bundled JSON is about 63 KB and is added to the service worker's install cache, so the game does not make runtime data requests and works offline after app installation.

The World Bank indicator pages list CC BY 4.0 terms. The bundled source manifest attributes World Bank WDI and the underlying UN World Population Prospects 2024 Revision. A data refresh must preserve the fixed year, verify the series metadata and profile reconciliation, refresh the artifact checksum, and recheck age-band spacing.

## Evidence boundaries

The data audit establishes source coverage, a shared observation year, internally comparable chart scales, and enough distinct triples for the five spacing bands. It does not establish that the prompt is intuitive, that population pyramids are legible to first-time players, or that the final round feels fair. The score, round count, and spacing progression are prototype choices. Seek first-read and replay feedback before considering more scopes, more age metrics, or Daily eligibility.
