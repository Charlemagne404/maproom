# Game rules and scoring

Maproom has ten games. The home page curates six daily puzzles: Find the country, Country outlines, Border route, Flag study, Geography grid, and Capitals & cities. Geography Connections, Higher or Lower, Neighbour Challenge, and Distance & Direction are practice games. Daily dates use the time zone in Settings. In-progress daily sessions are saved locally and reopen with the same question sequence; completed results remain available from the puzzle and Statistics.

## Country pools

Country-based practice defaults to **Standard**: the 193 United Nations member states plus the Holy See and the State of Palestine, the two UN non-member observer states. The source catalogue has 255 identities. **Extended** ordinary game pools use 243 of them: Standard plus separately represented territories and additional identities; 12 special geographic records remain catalogued but are withheld from ordinary questions. Parent relationships are recorded where appropriate; Extended membership does not imply independent sovereignty. Kosovo and other places outside Standard are available only in Extended where the game has suitable data. Borders use the catalog's reciprocal land-neighbour graph; maritime claims and disputed boundaries are not adjudicated. See [GEOGRAPHY_ELIGIBILITY.md](GEOGRAPHY_ELIGIBILITY.md) for the inclusion rule and references.

## Find the country

Daily asks for eight countries. Practice offers 10, 20, 50, or unlimited questions, a 60-second round, worldwide or continent scope, and first-level subdivision practice for supported countries. Standard is the default pool; Extended is available in settings. Answer on the map, focus a map region and press Enter/Space, or use country search. Correct answers earn 100 points. Optional review puts previously missed countries first. Subdivision files load only when selected; see [DATA_COVERAGE.md](DATA_COVERAGE.md).

## Country outlines

Name the country shown by its Natural Earth 1:10m silhouette, or use practice settings for a supported first-level subdivision. Daily uses the Standard catalogue and a versioned deterministic question. Free play has Standard, balanced Extended, and optional Territory focus pools. Easy, Medium and Hard use an exhaustive curated silhouette rating; entries with generic, tiny or widely dispersed outlines are excluded with documented reasons. Eligible questions do not repeat before the selected pool is exhausted, and no rolling set of ten includes more than three Extended entries while Standard candidates remain. If a region and difficulty produce no eligible outlines, the game explains the limitation instead of silently changing settings. Easy (8 guesses), Medium (6), and Hard (4) also change scoring penalties. Rotation is optional. Misses give approximate distance and direction; later hints narrow the region or position. A correct answer starts at 1,000 points and loses 100, 150, or 250 points per earlier miss by difficulty, with a 100-point floor. Exhausting the guesses reveals the answer. An in-progress version 2 daily outline retains its saved target and attempts as it moves to version 3; completed history remains valid.

## Border route

Connect the start and destination with countries that share recorded land borders. Add a country from autocomplete or the focused map. A breadth-first search verifies that the endpoints connect and shows the shortest hop count. Practice offers world or continent scope and Short (2–4 borders), Standard (3–6), or Long (5–8) targets; when a region has no exact match, generation uses the closest reachable route length. Routes must be valid, but a shortest route is not required. Score starts at 1,000, losing 150 points per stop beyond a shortest path and 100 per hint. Repeated countries and non-neighbour steps are rejected. Hints reveal only the next stop in a shortest continuation.

## Flag study

Daily gives eight four-choice questions. Practice offers 10, 20, 50, or unlimited questions, region, Standard or Extended country pools, flag-to-country or country-to-flag direction, and typed or multiple-choice answers where applicable. Distractors prefer the same continent, then draw from the selected pool if needed. Optional progressive reveal gives another chance after each of the first two wrong answers, then shows the answer. Optional review puts previously missed flags first. Correct answers earn 100 points; missed flag codes are saved in local history.

## Geography grid

Fill all nine crossings with distinct countries that satisfy both the row and column clue. Validated sets use continent or subregion, landlocked status, border counts, population, area, density, and recorded capital coordinates. The generator checks that each cell has two to ninety candidates and finds a nine-country distinct-answer assignment before a set can be played. Daily chooses deterministically from the generated pool; practice can select a set and replay another. Cells with fewer valid answers are worth more: 200 points for two or three answers, 150 for four to eight, and 100 for nine or more. These are rule-based scarcity tiers, not answer-popularity estimates. The daily grid generator is version 3 so older completions remain recognized.

## Capitals & cities

Daily mixes two capital questions with two city-location and two city-identification questions. Practice can focus on capitals, placing a city, or naming a marked city. It offers Standard or Extended country pools, region and population filters, 10, 20, 50, or unlimited questions, and a 60-second round. Capital practice supports country-to-capital and capital-to-country, typed or multiple-choice. Text answers accept catalog aliases. Correct capital and city-name answers earn 100 points. For city placement, click/tap the map or enter coordinates; great-circle distance earns up to 1,000 points, falling through distance bands to 100 points beyond 2,500 km. A placement within 250 km counts as accurate. Identification choices are scoped to the marked city's country to avoid same-name ambiguity. The city gazetteer loads on demand.

## Geography Connections

Group sixteen countries into four sets of four. Easy uses familiar Standard countries and clear continent, landlocked, and named-neighbour connections. Medium adds subregions, landlocked subregions, and less obvious named border relationships. Hard uses more specific subregions and supported population or area bands; Extended is available for territory practice. Every board is checked against the category pool for a unique defensible grouping. Solved groups move into coloured rows and their connection is explained. Each group adds 250 points; each incorrect set costs 40 points. Four mistakes end the puzzle. “One away” means three selected countries share one intended group. Practice replays with a new seed.

## Higher or Lower

Compare two countries by population, land area, or population density. Practice offers Standard or Extended country pools, world or continent scope, Standard or Close calls, 10, 20, 50, or unlimited questions, and an optional 60-second round. Correct answers earn 100 points plus up to 50 streak points; a wrong answer earns no points and resets the streak. Values and the correct comparison appear after the choice. Population uses the 2023 World Bank estimate where available; area uses the country catalogue, and density is population divided by catalogued area. Missing facts are excluded.

## Neighbour Challenge

Select every country with a recorded reciprocal land border around the target, then check the set. Practice offers Standard or Extended country pools, world or continent scope, all eligible targets or countries with at least five neighbours, 5, 10, 20, or unlimited rounds, and an optional 60-second round. Each target starts at 1,000 points, scaled by the share of neighbours found; every extra selection costs another 100 points. A round counts as correct only when the full set is exact. Answers reveal missed and extra countries. Country search remains available when a place has no map outline.

## Distance & Direction

Compare two populated places around an origin. Practice covers closest-to-origin, farther north, and farther east of Greenwich. It offers Standard or Extended country pools, continent scope, minimum city population of 50,000, 100,000, 250,000, or 1 million, Standard or Close calls, 10, 20, 50, or unlimited comparisons, and an optional 60-second round. No coordinates, distances, bearings, country labels, or other answer metadata are shown until after a choice. Correct answers earn 100 points plus up to 50 streak points; incorrect answers reset the streak. Feedback then reveals coordinates, distance, and bearing. Great-circle distances use the Haversine calculation; north/east comparisons use latitude and signed longitude.

## Local results and review

Each finished session records its game, mode, date or practice-session ID, score, correct/total count, and relevant settings. Daily results and interrupted sessions stay in IndexedDB with a localStorage fallback. Import/export includes resumable sessions. Statistics show per-game results and daily completion; country and flag practice can put previously missed places first. Progress stays in the current browser and does not synchronize between devices.
