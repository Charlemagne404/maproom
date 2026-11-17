# Game rules and scoring

Maproom has ten games. Each has a deterministic daily puzzle and a practice mode. Daily dates follow the time zone selected in Settings; completed daily results reopen from the same local result. Practice rounds can be replayed, and supported games can run continuously. Scores and session details stay in the browser and appear in Statistics.

## Find the country

Daily asks for eight countries. Practice offers 10, 20, 50 or unlimited questions, a 60-second round, and worldwide, continent or supported first-level subdivision scope. Pick from the map, keyboard-focus a map feature and press Enter/Space, or use country search. Correct answers earn 100 points. Optional review puts previously missed countries first. Subdivision files are loaded only when that country is chosen; the available packages are listed in [DATA_COVERAGE.md](DATA_COVERAGE.md).

## Country outlines

Name the country shown by its Natural Earth silhouette, or switch Practice to first-level subdivisions and choose a country with bundled boundary data. Subdivision outlines are loaded on demand. Country practice can use the world or a continent. Both challenge types offer Easy (8 guesses), Standard (6) or Expert (4), and optional rotation. After a miss, feedback gives approximate distance and direction; country clues narrow by continent and subregion, while subdivision clues add position within the parent country and the region's first letter. A correct answer starts at 1,000 points and loses 100, 150 or 250 points per earlier miss by difficulty, with a 100-point floor. An exhausted round reveals the answer.

## Border route

Connect the start and destination with countries that share recorded land borders. Add a country from autocomplete or the map. A shortest-path search confirms that the generated endpoints are connected and shows the shortest hop count. Practice offers world or continent scope and Short (2–4 borders), Standard (3–6) or Long (5–8) targets; when a region has no exact match, generation uses the closest reachable route length. Routes must be valid, but a shortest route is not required. Score starts at 1,000, losing 150 points per stop beyond a shortest path and 100 per hint. Repeated countries and non-neighbor steps are rejected. The border graph does not model maritime borders or resolve disputed claims; where the map has no outline, a country may still be entered by name.

## Flag study

Daily gives eight four-choice questions. Practice offers 10, 20, 50 or unlimited questions, region, flag-to-country or country-to-flag direction, and typed or multiple-choice answers where applicable. Distractors are first chosen from the same continent, then filled from the remaining selected pool if needed. Optional progressive reveal gives another chance after each of the first two wrong answers, then shows the answer. Optional review puts previously missed flags first. Correct answers earn 100 points; missed flag codes are saved with local session history.

## Geography grid

Fill all nine crossings with distinct countries that satisfy both the row and column clue. Clues combine continent or subregion with landlocked/coastal and border status, population, area, density or recorded capital coordinates. The generator checks each cell has two to ninety candidates and searches for a nine-country assignment before a grid can be used. Daily selects deterministically from the generated pool; practice can start another grid. Cells with fewer valid answers are worth more: 200 points for two or three answers, 150 for four to eight, and 100 for nine or more. These are rule-based difficulty tiers, not claimed answer-popularity statistics. Grid puzzle IDs use version 2 so prior version 1 daily completions remain recognized.

## Capitals & cities

Daily mixes two capital questions with two city-location and two city-identification questions. Practice can focus on capitals, placing a city or naming a marked city. It offers region and population filters, 10, 20, 50 or unlimited questions, and a 60-second round. Capital practice supports country-to-capital and capital-to-country, typed or multiple-choice. Text answers accept catalog aliases. Correct capital and city-name answers earn 100 points. For city placement, click/tap the map or enter coordinates; great-circle distance earns up to 1,000 points, falling through distance bands to 100 points beyond 2,500 km. A placement within 250 km counts as accurate. Identification choices are scoped to the marked city's country to avoid same-name ambiguity. The city gazetteer is loaded on demand.

## Geography Connections

Group sixteen countries into four sets of four. Group facts use catalogued subregions, land-border counts and status, area and population bands, and country or capital initials. The generator requires four distinct groups and rejects boards where another supported category also creates a competing four-country set. Each group adds 250 points; each wrong set costs 40 points. Four mistakes end the puzzle. “One away” feedback means three of the selected countries form a group. Practice spans the world and replays with a new seed. Group meanings are explained after solving or at the end. Current groups are based on country facts; city tiles are not included.

## Higher or Lower

Choose which country has the larger population, land area or population density. Daily has ten deterministic comparisons and selects its measure from the daily seed. Practice offers world or continent scope, Standard or Close calls, 10, 20, 50 or unlimited questions, and an optional 60-second round. Correct answers earn 100 points plus up to 50 streak points; a wrong answer earns no points and resets the streak. Values are revealed after the choice and use the country catalog area and 2023 World Bank population estimates. Density is population divided by catalog area.

## Neighbour Challenge

Select every country with a recorded reciprocal land border around the target, then check the set. Daily has five targets. Practice offers world or continent scope, all eligible countries or countries with at least five neighbors, 5, 10, 20 or unlimited rounds, and an optional 60-second round. Each target starts at 1,000 points, scaled by the share of neighbors found; every extra selection costs another 100 points. A round counts as correct only when the full set is exact. Answers reveal missed and extra countries. Text search includes catalog countries without map geometry, so a missing outline does not remove a valid neighbor from play.

## Distance & Direction

Compare two populated places around an origin. The daily puzzle contains ten questions and deterministically cycles among closest-to-origin, farther north and farther east of Greenwich. Practice offers those three challenges, continent scope, a minimum population of 50,000, 100,000, 250,000 or 1 million, Standard or Close calls, 10, 20, 50 or unlimited comparisons, and an optional 60-second round. Correct answers earn 100 points plus up to 50 streak points; incorrect answers reset the streak. The answer reveals coordinates, distance and bearing. Great-circle distances use the Haversine calculation. North/east comparisons use latitude and signed longitude respectively.

## Local results and review

Each finished session records the game, mode, date or practice-session ID, score, correct/total count and relevant question settings. The Statistics page aggregates local results and daily completion. Country and flag games can prioritize their previously missed countries/flags when local miss details are available. A saved result is not uploaded or synchronized to another browser.
