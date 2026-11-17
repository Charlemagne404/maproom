# Game rules and scoring

Every game is available from Daily and Practice. Daily questions use the selected time zone, a deterministic seed and a versioned puzzle ID; completed daily results are stored once per game and date. Practice creates new sessions and can be replayed. Result scores are saved to local browser history and included in Statistics.

## Find the country

Daily presents eight countries. Practice presents ten and can use the world, one continent or first-level subdivisions for a supported country. Select a map feature, use keyboard focus plus Enter/Space, or choose a name from autocomplete. A correct answer earns 100 points. The answer locks after each selection and reveals the correct place; the round score is out of 800 daily or 1,000 in practice. Practice scope changes reset the round.

## Country outlines

The silhouette is the country geometry from the bundled Natural Earth map. Daily gives one country and six guesses. Practice selects a world or continent scope and offers another outline after each round. Names and catalog aliases are accepted; duplicate guesses are rejected. An incorrect guess reports approximate great-circle distance and compass direction. A correct answer scores 1,000 points, reduced by 150 for each prior wrong guess, with a 100-point floor. The sixth miss reveals the answer and scores zero. Regional subdivision outlines and separate difficulty/timer settings are not included in this release.

## Border route

Connect the shown start and destination using countries that share a catalogued land border. Enter a country or select it on the map. Invalid names, non-neighbors and repeated countries are rejected. A bounded graph search computes and displays a shortest route; alternative valid routes are allowed. The optional hint reveals one shortest path and costs 100 points each time it is requested. The score begins at 1,000 and loses 150 points per hop beyond the shortest path plus 100 per hint, with a 100-point floor. The score counts the completed route as one correct puzzle. Sea crossings and disputed-border adjudication are outside the graph model.

## Flag study

Daily gives eight four-choice flag-to-country questions. Practice gives ten questions, with a continent filter, flag-to-country or country-to-flag direction, and multiple-choice or typed answers when a flag is the clue. Progressive reveal is an optional practice aid: after the first and second wrong answers, part of the flag is uncovered and another attempt is allowed; the third wrong answer reveals the country. Each correct answer is worth 100 points. Flags are local SVG assets keyed by ISO alpha-2 code.

## Geography grid

Fill all nine row/column intersections with distinct countries that satisfy both clues. The daily set is deterministically selected from validated curated grids. Practice can choose either validated set. Each answer is checked against the source facts and the other eight answers. A square earns `round(1000 / valid country count)` points, with a one-point minimum; its candidate count is shown before submission. The grid is complete when all nine squares contain distinct valid countries. Current release includes two curated presets and avoids unsupported or empty intersections.

## Capitals and cities

Daily mixes six questions: two country-to-capital four-choice questions, two city-location questions, and two city-identification questions. Practice can focus on capitals, placing a city, or identifying a marked city; city tasks can be filtered by continent. Capital practice offers both directions and typed or multiple-choice answers. Accepted typed names include source alternate names. A correct text or choice answer is worth 100 points. For city placement, click/tap the map or enter latitude and longitude; distance is measured over the great circle and scored from 1,000 points within 25 km down to 100 beyond 2,500 km. A location answer within 250 km counts as correct for accuracy. The prompt shows population when available. City identification autocomplete is restricted to the marked city's country to avoid same-name ambiguity.
