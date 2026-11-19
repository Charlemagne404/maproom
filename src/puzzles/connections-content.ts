export type ConnectionsDifficulty = 'easy' | 'medium' | 'hard'
export type ConnectionsTier = 1 | 2 | 3 | 4

export type ConnectionsFactRule =
  | { type: 'border-country'; countryCode: string }
  | { type: 'capital-country-name' }
  | { type: 'capital-initial'; initial: string }
  | { type: 'continent'; value: string }
  | { type: 'country-name-contains'; value: string }
  | { type: 'country-name-direction' }
  | { type: 'country-name-initial'; initial: string }
  | { type: 'country-name-suffix'; value: string }
  | { type: 'landlocked' }
  | { type: 'landlocked-continent'; continent: string }
  | { type: 'named-set'; id: string }
  | { type: 'population-band'; minimum: number; maximum: number; year: string }
  | { type: 'population-over'; value: number; year: string }
  | { type: 'area-band'; minimum: number; maximum: number }
  | { type: 'area-under'; value: number }
  | { type: 'subregion'; value: string }

export interface ConnectionsEditorialGroup {
  id: string
  label: string
  explanation: string
  tier: ConnectionsTier
  countryCodes: string[]
  fact: ConnectionsFactRule
}

export interface ConnectionsEditorialPuzzle {
  id: string
  difficulty: ConnectionsDifficulty
  groups: ConnectionsEditorialGroup[]
  editorialNote: string
}

export interface ConnectionsNamedFactSet {
  id: string
  members: string[]
  source: string
  note: string
}

/**
 * The line/sea/history sets are authored once and referenced by clue facts.
 * Their editorial notes name the precise interpretation used by the puzzle.
 */
export const CONNECTIONS_NAMED_FACT_SETS: ConnectionsNamedFactSet[] = [
  {
    id: 'equator-land-crossings',
    members: ['BRA', 'COD', 'COG', 'COL', 'ECU', 'GAB', 'IDN', 'KEN', 'SOM', 'STP', 'UGA'],
    source: 'Natural Earth Admin 0 country polygons, 1:50m; line-intersection review against a land-only equator list.',
    note: 'Land crossings only. Natural Earth 1:50m omits Rolas Islet in São Tomé and Príncipe, so STP is retained from the reviewed source list.',
  },
  {
    id: 'tropic-capricorn-land-crossings',
    members: ['ARG', 'AUS', 'BRA', 'BWA', 'CHL', 'MDG', 'MOZ', 'NAM', 'PRY', 'ZAF'],
    source: 'Natural Earth Admin 0 country polygons, 1:50m; line-intersection review at 23.4366° south.',
    note: 'Land crossings only; territorial waters are not counted.',
  },
  {
    id: 'black-sea-coast',
    members: ['BGR', 'GEO', 'ROU', 'RUS', 'TUR', 'UKR'],
    source: 'Natural Earth Admin 0 country polygons, 1:50m.',
    note: 'Countries with a Black Sea shoreline in the generalized map layer.',
  },
  {
    id: 'caspian-sea-coast',
    members: ['AZE', 'IRN', 'KAZ', 'RUS', 'TKM'],
    source: 'Natural Earth Admin 0 country polygons, 1:50m.',
    note: 'Countries with a Caspian Sea shoreline in the generalized map layer.',
  },
  {
    id: 'red-sea-coast',
    members: ['DJI', 'EGY', 'ERI', 'ISR', 'JOR', 'SAU', 'SDN', 'YEM'],
    source: 'Natural Earth Admin 0 country polygons, 1:50m.',
    note: 'Includes the Gulf of Aqaba shorelines of Israel and Jordan; territorial waters are not counted.',
  },
  {
    id: 'north-sea-coast',
    members: ['BEL', 'DEU', 'DNK', 'FRA', 'GBR', 'NLD', 'NOR'],
    source: 'Natural Earth Admin 0 country polygons, 1:50m.',
    note: 'Countries with a North Sea shoreline in the generalized map layer.',
  },
  {
    id: 'baltic-sea-coast',
    members: ['DNK', 'EST', 'FIN', 'DEU', 'LVA', 'LTU', 'POL', 'RUS', 'SWE'],
    source: 'Natural Earth Admin 0 country polygons, 1:50m.',
    note: 'Includes the gulfs of Bothnia and Finland as arms of the Baltic Sea.',
  },
  {
    id: 'adriatic-sea-coast',
    members: ['ALB', 'HRV', 'ITA', 'MNE', 'SVN'],
    source: 'Natural Earth Admin 0 country polygons, 1:50m.',
    note: 'Countries with an Adriatic Sea shoreline in the generalized map layer.',
  },
  {
    id: 'danube-capital-cities',
    members: ['AUT', 'HUN', 'SRB', 'SVK'],
    source: 'GeoNames national-capital coordinates and Natural Earth 1:50m rivers.',
    note: 'Vienna, Budapest, Belgrade, and Bratislava are on the Danube; the clue concerns national capitals, not every city in the basin.',
  },
  {
    id: 'former-yugoslav-republics',
    members: ['BIH', 'HRV', 'MKD', 'MNE', 'SRB', 'SVN'],
    source: 'Former constituent republics of the Socialist Federal Republic of Yugoslavia.',
    note: 'The set follows the six federal republics; Kosovo was not one of those republics.',
  },
  {
    id: 'asean-founding-members',
    members: ['IDN', 'MYS', 'PHL', 'SGP', 'THA'],
    source: 'ASEAN founding members, 1967 Bangkok Declaration.',
    note: 'Founding members only, not the current membership.',
  },
  {
    id: 'g7-members',
    members: ['CAN', 'DEU', 'FRA', 'GBR', 'ITA', 'JPN', 'USA'],
    source: 'G7 member countries.',
    note: 'The European Union is not a country and is not a tile in this clue.',
  },
  {
    id: 'cplp-portuguese-official',
    members: ['AGO', 'BRA', 'CPV', 'GNB', 'GNQ', 'MOZ', 'PRT', 'STP', 'TLS'],
    source: 'Community of Portuguese Language Countries (CPLP) member-state language designations.',
    note: 'Portuguese is an official language in each listed state; Equatorial Guinea is included as a multilingual state.',
  },
  {
    id: 'nordic-sovereign-states',
    members: ['DNK', 'FIN', 'ISL', 'NOR', 'SWE'],
    source: 'Nordic Council member countries, limited to sovereign states.',
    note: 'Autonomous territories are not included as country tiles.',
  },
  {
    id: 'central-asian-former-soviet-republics',
    members: ['KAZ', 'KGZ', 'TJK', 'TKM', 'UZB'],
    source: 'Former Soviet republics in Central Asia.',
    note: 'A historical subset of Central Asia, not all countries currently catalogued in the subregion.',
  },
  {
    id: 'lake-chad-shore-countries',
    members: ['CMR', 'NER', 'NGA', 'TCD'],
    source: 'International Lake Environment Committee World Lake Database; NASA Earth Observatory Lake Chad overview.',
    note: 'The lake spans Cameroon, Niger, Nigeria and Chad. This is the shoreline-country set, not the much larger drainage basin.',
  },
  {
    id: 'visegrad-four',
    members: ['CZE', 'HUN', 'POL', 'SVK'],
    source: 'International Visegrad Fund and Visegrad Group official overview.',
    note: 'The Visegrad Four are Czechia, Hungary, Poland and Slovakia.',
  },
  {
    id: 'opec-founding-members',
    members: ['IRN', 'IRQ', 'KWT', 'SAU', 'VEN'],
    source: 'OPEC official history of its five founder members and the 1960 Baghdad Conference.',
    note: 'The original five were Iran, Iraq, Kuwait, Saudi Arabia and Venezuela. A board may include four of those five.',
  },
  {
    id: 'sacu-members',
    members: ['BWA', 'LSO', 'NAM', 'SWZ', 'ZAF'],
    source: 'Southern African Customs Union official member-state listing.',
    note: 'SACU has five members: Botswana, Eswatini, Lesotho, Namibia and South Africa. A board may include four of those five.',
  },
  {
    id: 'eec-founding-members',
    members: ['BEL', 'DEU', 'FRA', 'ITA', 'LUX', 'NLD'],
    source: 'European Commission, “Together in the EU” founding-members timeline.',
    note: 'The six Treaty of Rome signatories that established the EEC were Belgium, France, Germany, Italy, Luxembourg and the Netherlands. A board may include four of those six.',
  },
]

const g = (
  id: string,
  label: string,
  explanation: string,
  tier: ConnectionsTier,
  countryCodes: string[],
  fact: ConnectionsFactRule,
): ConnectionsEditorialGroup => ({ id, label, explanation, tier, countryCodes, fact })

const setFact = (id: string): ConnectionsFactRule => ({ type: 'named-set', id })
const over100m = (year = '2023'): ConnectionsFactRule => ({ type: 'population-over', value: 100_000_000, year })
const between5mAnd10m = (year = '2023'): ConnectionsFactRule => ({ type: 'population-band', minimum: 5_000_000, maximum: 10_000_000, year })

const puzzle = (id: string, difficulty: ConnectionsDifficulty, groups: ConnectionsEditorialGroup[], editorialNote: string): ConnectionsEditorialPuzzle => ({ id, difficulty, groups, editorialNote })

/** Curated, fixed boards. No group is assembled by combining random predicates at runtime. */
export const CONNECTIONS_PUZZLES: ConnectionsEditorialPuzzle[] = [
  puzzle('atlas-01', 'easy', [
    g('atlas-01-guinea', 'Names containing “Guinea”', 'The country name itself contains Guinea.', 1, ['GIN', 'GNB', 'GNQ', 'PNG'], { type: 'country-name-contains', value: 'Guinea' }),
    g('atlas-01-germany', 'Share a land border with Germany', 'Each country shares a land border with Germany.', 2, ['AUT', 'NLD', 'FRA', 'POL'], { type: 'border-country', countryCode: 'DEU' }),
    g('atlas-01-equator', 'The Equator crosses their land', 'The Equator crosses dry land in each of these countries.', 3, ['BRA', 'COL', 'ECU', 'IDN'], setFact('equator-land-crossings')),
    g('atlas-01-central-america', 'In Central America', 'Each is catalogued in the Central America subregion.', 4, ['GTM', 'HND', 'NIC', 'SLV'], { type: 'subregion', value: 'Central America' }),
  ], 'The name pattern is the entry point; the remaining groups move from border knowledge to physical geography and a regional label.'),
  puzzle('atlas-02', 'easy', [
    g('atlas-02-stan', 'End in “-stan”', 'The common country name ends with the letters stan.', 1, ['KAZ', 'AFG', 'TJK', 'UZB'], { type: 'country-name-suffix', value: 'stan' }),
    g('atlas-02-france', 'Share a land border with France', 'Each country shares a land border with France.', 2, ['BEL', 'ESP', 'MCO', 'LUX'], { type: 'border-country', countryCode: 'FRA' }),
    g('atlas-02-portuguese', 'Portuguese is an official language', 'Portuguese is an official language in all four states.', 3, ['AGO', 'CPV', 'GNB', 'PRT'], setFact('cplp-portuguese-official')),
    g('atlas-02-capricorn', 'The Tropic of Capricorn crosses their land', 'The Tropic of Capricorn crosses dry land in each country.', 4, ['ARG', 'CHL', 'MDG', 'NAM'], setFact('tropic-capricorn-land-crossings')),
  ], 'A visible name pattern gives way to a border set, a language relationship, and a latitude line.'),
  puzzle('atlas-03', 'easy', [
    g('atlas-03-portuguese', 'Portuguese is an official language', 'Portuguese is an official language in each country.', 1, ['CPV', 'MOZ', 'PRT', 'TLS'], setFact('cplp-portuguese-official')),
    g('atlas-03-caspian', 'Have a Caspian Sea shoreline', 'Each has a shoreline on the Caspian Sea.', 2, ['RUS', 'IRN', 'KAZ', 'TKM'], setFact('caspian-sea-coast')),
    g('atlas-03-danube', 'Their capitals sit on the Danube', 'Vienna, Budapest, Belgrade, and Bratislava stand on the Danube.', 3, ['AUT', 'HUN', 'SRB', 'SVK'], setFact('danube-capital-cities')),
    g('atlas-03-red-sea', 'Border the Red Sea', 'Each has a Red Sea or Gulf of Aqaba shoreline.', 4, ['ISR', 'JOR', 'SAU', 'EGY'], setFact('red-sea-coast')),
  ], 'Language status, two marginal seas, and a river-side capital clue keep political and physical geography in play together.'),
  puzzle('atlas-04', 'easy', [
    g('atlas-04-landlocked', 'Landlocked countries', 'Each has no sea coastline.', 1, ['CZE', 'LAO', 'UZB', 'UGA'], { type: 'landlocked' }),
    g('atlas-04-india', 'Share a land border with India', 'Each country shares a land border with India.', 2, ['BGD', 'CHN', 'MMR', 'PAK'], { type: 'border-country', countryCode: 'IND' }),
    g('atlas-04-land', 'End in the letters “land”', 'The common country name ends with land.', 3, ['FIN', 'IRL', 'ISL', 'NZL'], { type: 'country-name-suffix', value: 'land' }),
    g('atlas-04-north-sea', 'Have a North Sea shoreline', 'Each has a shoreline on the North Sea.', 4, ['GBR', 'NOR', 'NLD', 'FRA'], setFact('north-sea-coast')),
  ], 'The board combines landlocked status, a border with India, a country-name ending, and a North Sea shoreline.'),
  puzzle('atlas-05', 'easy', [
    g('atlas-05-name-a', 'Country names beginning with A', 'Each country name starts with the letter A.', 1, ['AFG', 'ALB', 'ARM', 'AUS'], { type: 'country-name-initial', initial: 'A' }),
    g('atlas-05-brazil', 'Share a land border with Brazil', 'Each country shares a land border with Brazil.', 2, ['BOL', 'PER', 'URY', 'VEN'], { type: 'border-country', countryCode: 'BRA' }),
    g('atlas-05-asean', 'Among ASEAN’s five founding members', 'These four were among the five countries that signed the 1967 Bangkok Declaration as ASEAN founders.', 3, ['IDN', 'MYS', 'SGP', 'THA'], setFact('asean-founding-members')),
    g('atlas-05-lusophone', 'Portuguese is an official language', 'Portuguese is an official language in each country.', 4, ['CPV', 'GNB', 'STP', 'TLS'], setFact('cplp-portuguese-official')),
  ], 'A country-name warm-up leads into a Brazil border set, an ASEAN founding subset, and Portuguese official-language clues.'),
  puzzle('atlas-06', 'easy', [
    g('atlas-06-landlocked-africa', 'Landlocked in Africa', 'Each is landlocked and catalogued in Africa.', 1, ['BFA', 'NER', 'TCD', 'UGA'], { type: 'landlocked-continent', continent: 'Africa' }),
    g('atlas-06-g7', 'Among the seven G7 members', 'These four are among the seven G7 member countries.', 2, ['CAN', 'FRA', 'ITA', 'USA'], setFact('g7-members')),
    g('atlas-06-capricorn', 'The Tropic of Capricorn crosses their land', 'The Tropic of Capricorn crosses dry land in each country.', 3, ['ZAF', 'MDG', 'MOZ', 'PRY'], setFact('tropic-capricorn-land-crossings')),
    g('atlas-06-capital-b', 'Their capitals begin with B', 'Brussels, Beijing, Baghdad, and Bangkok all begin with B.', 4, ['BEL', 'CHN', 'IRQ', 'THA'], { type: 'capital-initial', initial: 'B' }),
  ], 'This set blends an attribute, a political group, a latitude, and a capital-city pattern.'),
  puzzle('atlas-07', 'easy', [
    g('atlas-07-saudi', 'Share a land border with Saudi Arabia', 'Each country shares a land border with Saudi Arabia.', 1, ['JOR', 'OMN', 'QAT', 'YEM'], { type: 'border-country', countryCode: 'SAU' }),
    g('atlas-07-population', 'Above 100 million people in 2023', 'Each had a 2023 population above 100 million in the World Bank series.', 2, ['BRA', 'IDN', 'BGD', 'USA'], over100m()),
    g('atlas-07-central-asia', 'Central Asian former Soviet republics', 'Each was a Central Asian republic of the former Soviet Union.', 3, ['KAZ', 'KGZ', 'TJK', 'UZB'], setFact('central-asian-former-soviet-republics')),
    g('atlas-07-black-sea', 'Have a Black Sea shoreline', 'Each has a shoreline on the Black Sea.', 4, ['BGR', 'GEO', 'ROU', 'TUR'], setFact('black-sea-coast')),
  ], 'The clues connect a border, a dated population series, a historical region, and a named sea.'),
  puzzle('atlas-08', 'easy', [
    g('atlas-08-baltic', 'Have a Baltic Sea shoreline', 'Each has a Baltic Sea shoreline, including its gulfs.', 1, ['DEU', 'POL', 'LTU', 'LVA'], setFact('baltic-sea-coast')),
    g('atlas-08-lake-chad', 'Have a Lake Chad shoreline', 'Each country has shoreline on Lake Chad; this is not the full basin.', 2, ['CMR', 'NER', 'NGA', 'TCD'], setFact('lake-chad-shore-countries')),
    g('atlas-08-capricorn', 'The Tropic of Capricorn crosses their land', 'The Tropic of Capricorn crosses dry land in each country.', 3, ['AUS', 'BRA', 'CHL', 'ZAF'], setFact('tropic-capricorn-land-crossings')),
    g('atlas-08-capital', 'Capital and country share a name', 'The national capital has the same name as its country.', 4, ['DJI', 'MCO', 'SGP', 'VAT'], { type: 'capital-country-name' }),
  ], 'The Baltic and Lake Chad shorelines contrast with a southern latitude line and a same-name capital clue.'),

  puzzle('atlas-09', 'medium', [
    g('atlas-09-small', 'Countries under 1,000 km²', 'Each country has a catalogued area below 1,000 square kilometres.', 1, ['BHR', 'SGP', 'DMA', 'GRD'], { type: 'area-under', value: 1_000 }),
    g('atlas-09-china', 'Share a land border with China', 'Each country shares a land border with China.', 2, ['AFG', 'IND', 'LAO', 'MNG'], { type: 'border-country', countryCode: 'CHN' }),
    g('atlas-09-population', 'Between 10 and 20 million people in 2023', 'Each had a 2023 population from 10 million up to, but not including, 20 million.', 3, ['BEL', 'CHL', 'ECU', 'ROU'], { type: 'population-band', minimum: 10_000_000, maximum: 20_000_000, year: '2023' }),
    g('atlas-09-nordic', 'Among the five Nordic sovereign states', 'These four are among the five Nordic Council member countries that are sovereign states.', 4, ['DNK', 'FIN', 'ISL', 'NOR'], setFact('nordic-sovereign-states')),
  ], 'Measured area and dated population clues are balanced with a border set and a political geography set.'),
  puzzle('atlas-10', 'medium', [
    g('atlas-10-central-america', 'In Central America', 'Each is catalogued in the Central America subregion.', 1, ['CRI', 'HND', 'NIC', 'SLV'], { type: 'subregion', value: 'Central America' }),
    g('atlas-10-brazil', 'Share a land border with Brazil', 'Each country shares a land border with Brazil.', 2, ['GUY', 'SUR', 'URY', 'VEN'], { type: 'border-country', countryCode: 'BRA' }),
    g('atlas-10-asean', 'Among ASEAN’s five founding members', 'These four were among the five countries that signed the 1967 Bangkok Declaration as ASEAN founders.', 3, ['IDN', 'PHL', 'SGP', 'THA'], setFact('asean-founding-members')),
    g('atlas-10-visegrad', 'The Visegrad Four', 'Czechia, Hungary, Poland and Slovakia form the Visegrad Four.', 4, ['CZE', 'HUN', 'POL', 'SVK'], setFact('visegrad-four')),
  ], 'A regional clue and a border clue share the board with founding memberships from two distant regions.'),
  puzzle('atlas-11', 'medium', [
    g('atlas-11-caribbean', 'In the Caribbean', 'Each is catalogued in the Caribbean subregion.', 1, ['DMA', 'BHS', 'BRB', 'CUB'], { type: 'subregion', value: 'Caribbean' }),
    g('atlas-11-switzerland', 'Share a land border with Switzerland', 'Each country shares a land border with Switzerland.', 2, ['AUT', 'DEU', 'FRA', 'LIE'], { type: 'border-country', countryCode: 'CHE' }),
    g('atlas-11-adriatic', 'Have an Adriatic Sea shoreline', 'Each has an Adriatic Sea shoreline.', 3, ['ALB', 'HRV', 'MNE', 'SVN'], setFact('adriatic-sea-coast')),
    g('atlas-11-stan', 'End in “-stan”', 'The common country name ends with the letters stan.', 4, ['AFG', 'KGZ', 'TJK', 'TKM'], { type: 'country-name-suffix', value: 'stan' }),
  ], 'The clues intentionally alternate between a broad region, a specific border, a sea, and a word ending.'),
  puzzle('atlas-12', 'medium', [
    g('atlas-12-landlocked', 'Landlocked countries', 'Each has no sea coastline.', 1, ['AND', 'LAO', 'NER', 'UGA'], { type: 'landlocked' }),
    g('atlas-12-red-sea', 'Have a Red Sea shoreline', 'Each has a Red Sea shoreline.', 2, ['DJI', 'EGY', 'ERI', 'SDN'], setFact('red-sea-coast')),
    g('atlas-12-black-sea', 'Have a Black Sea shoreline', 'Each has a shoreline on the Black Sea.', 3, ['BGR', 'GEO', 'TUR', 'UKR'], setFact('black-sea-coast')),
    g('atlas-12-capital-b', 'Their capitals begin with B', 'Bogotá, Beijing, Baghdad, and Bangkok begin with B.', 4, ['COL', 'CHN', 'IRQ', 'THA'], { type: 'capital-initial', initial: 'B' }),
  ], 'The statistical word “landlocked” sits alongside two physical geography clues and a capital pattern.'),
  puzzle('atlas-13', 'medium', [
    g('atlas-13-equator', 'The Equator crosses their land', 'The Equator crosses dry land in each country.', 1, ['COD', 'COL', 'ECU', 'IDN'], setFact('equator-land-crossings')),
    g('atlas-13-population', 'Between 5 and 10 million people in 2023', 'Each had a 2023 population from 5 million up to, but not including, 10 million.', 2, ['AUT', 'CRI', 'FIN', 'IRL'], between5mAnd10m()),
    g('atlas-13-iran', 'Share a land border with Iran', 'Each country shares a land border with Iran.', 3, ['ARM', 'AZE', 'IRQ', 'PAK'], { type: 'border-country', countryCode: 'IRN' }),
    g('atlas-13-capital', 'Capital and country share a name', 'The national capital has the same name as its country.', 4, ['DJI', 'LUX', 'MCO', 'VAT'], { type: 'capital-country-name' }),
  ], 'A dated population band and two border/physical clues are paired with a capital relationship.'),
  puzzle('atlas-14', 'medium', [
    g('atlas-14-population', 'Between 1 and 5 million people in 2023', 'Each had a 2023 population from 1 million up to, but not including, 5 million.', 1, ['ALB', 'BHR', 'BIH', 'ERI'], { type: 'population-band', minimum: 1_000_000, maximum: 5_000_000, year: '2023' }),
    g('atlas-14-nordic', 'Among the five Nordic sovereign states', 'These four are among the five Nordic Council member countries that are sovereign states.', 2, ['DNK', 'ISL', 'NOR', 'SWE'], setFact('nordic-sovereign-states')),
    g('atlas-14-caribbean', 'In the Caribbean', 'Each is catalogued in the Caribbean subregion.', 3, ['CUB', 'DMA', 'GRD', 'HTI'], { type: 'subregion', value: 'Caribbean' }),
    g('atlas-14-france', 'Share a land border with France', 'Each country shares a land border with France.', 4, ['CHE', 'DEU', 'ITA', 'LUX'], { type: 'border-country', countryCode: 'FRA' }),
  ], 'A dated population interval meets a Nordic subset, Caribbean island countries, and a French border set.'),
  puzzle('atlas-15', 'medium', [
    g('atlas-15-population', 'Between 1 and 5 million people in 2023', 'Each had a 2023 population from 1 million up to, but not including, 5 million.', 1, ['ALB', 'BHR', 'BIH', 'BWA'], { type: 'population-band', minimum: 1_000_000, maximum: 5_000_000, year: '2023' }),
    g('atlas-15-black-sea', 'Have a Black Sea shoreline', 'Each has a shoreline on the Black Sea.', 2, ['BGR', 'RUS', 'TUR', 'UKR'], setFact('black-sea-coast')),
    g('atlas-15-asean', 'Among ASEAN’s five founding members', 'These four were among the five countries that signed the 1967 Bangkok Declaration as ASEAN founders.', 3, ['IDN', 'MYS', 'PHL', 'SGP'], setFact('asean-founding-members')),
    g('atlas-15-capital-b', 'Their capitals begin with B', 'Beijing, Brussels, Bridgetown, and Brasília begin with B.', 4, ['CHN', 'BEL', 'BRB', 'BRA'], { type: 'capital-initial', initial: 'B' }),
  ], 'The dated data band is deliberately mixed across continents; other clues use a sea, history, and capital names.'),
  puzzle('atlas-16', 'medium', [
    g('atlas-16-land', 'End in the letters “land”', 'The common country name ends with land.', 1, ['CHE', 'FIN', 'NZL', 'POL'], { type: 'country-name-suffix', value: 'land' }),
    g('atlas-16-capricorn', 'The Tropic of Capricorn crosses their land', 'The Tropic of Capricorn crosses dry land in each country.', 2, ['CHL', 'MDG', 'NAM', 'PRY'], setFact('tropic-capricorn-land-crossings')),
    g('atlas-16-southeast-asia', 'In South-Eastern Asia', 'Each is catalogued in the South-Eastern Asia subregion.', 3, ['IDN', 'MYS', 'PHL', 'TLS'], { type: 'subregion', value: 'South-Eastern Asia' }),
    g('atlas-16-opec', 'Among OPEC’s five founding members', 'These four were among the five countries that founded OPEC in 1960.', 4, ['IRN', 'IRQ', 'KWT', 'SAU'], setFact('opec-founding-members')),
  ], 'The board pairs a language-like name pattern with latitude, a subregion, and a political grouping.'),
  puzzle('atlas-17', 'hard', [
    g('atlas-17-central-asia', 'Central Asian former Soviet republics', 'Each was a Central Asian republic of the former Soviet Union.', 1, ['KAZ', 'KGZ', 'TJK', 'TKM'], setFact('central-asian-former-soviet-republics')),
    g('atlas-17-lake-chad', 'Have a Lake Chad shoreline', 'Each country has shoreline on Lake Chad; this is not the full basin.', 2, ['CMR', 'NER', 'NGA', 'TCD'], setFact('lake-chad-shore-countries')),
    g('atlas-17-germany', 'Share a land border with Germany', 'Each country shares a land border with Germany.', 3, ['AUT', 'CHE', 'BEL', 'POL'], { type: 'border-country', countryCode: 'DEU' }),
    g('atlas-17-population', 'Between 1 and 5 million people in 2023', 'Each had a 2023 population from 1 million up to, but not including, 5 million.', 4, ['ALB', 'BHR', 'BIH', 'GEO'], { type: 'population-band', minimum: 1_000_000, maximum: 5_000_000, year: '2023' }),
  ], 'Historical language and state groupings sit beside a dated statistical range and a specific border relation.'),
  puzzle('atlas-18', 'hard', [
    g('atlas-18-north-africa', 'In Northern Africa', 'Each is catalogued in the Northern Africa subregion.', 1, ['EGY', 'MAR', 'LBY', 'TUN'], { type: 'subregion', value: 'Northern Africa' }),
    g('atlas-18-caspian', 'Have a Caspian Sea shoreline', 'Each has a shoreline on the Caspian Sea.', 2, ['AZE', 'IRN', 'KAZ', 'RUS'], setFact('caspian-sea-coast')),
    g('atlas-18-capital-k', 'Their capitals begin with K', 'Kuwait City, Kinshasa, Kingston, and Kathmandu begin with K.', 3, ['KWT', 'COD', 'JAM', 'NPL'], { type: 'capital-initial', initial: 'K' }),
    g('atlas-18-capital-name', 'Capital and country share a name', 'The national capital has the same name as its country.', 4, ['DJI', 'LUX', 'SGP', 'VAT'], { type: 'capital-country-name' }),
  ], 'A subregion, two precise geographic relations, and capital-name initials form the four links.'),
  puzzle('atlas-19', 'hard', [
    g('atlas-19-asean', 'Among ASEAN’s five founding members', 'These four were among the five countries that signed the 1967 Bangkok Declaration as ASEAN founders.', 1, ['IDN', 'MYS', 'PHL', 'THA'], setFact('asean-founding-members')),
    g('atlas-19-direction', 'Begin with north or south', 'The common country name begins with North or South.', 2, ['KOR', 'PRK', 'MKD', 'ZAF'], { type: 'country-name-direction' }),
    g('atlas-19-small', 'Countries under 1,000 km²', 'Each country has a catalogued area below 1,000 square kilometres.', 3, ['BHR', 'BRB', 'DMA', 'GRD'], { type: 'area-under', value: 1_000 }),
    g('atlas-19-eec', 'Among the six EEC founding states', 'These four were among the six states that signed the Treaty of Rome to establish the EEC.', 4, ['DEU', 'NLD', 'FRA', 'ITA'], setFact('eec-founding-members')),
  ], 'A name pattern, two founding or membership histories, and a small-country area threshold pull in different directions.'),
  puzzle('atlas-20', 'hard', [
    g('atlas-20-portuguese', 'Portuguese is an official language', 'Portuguese is an official language in each state.', 1, ['CPV', 'AGO', 'PRT', 'TLS'], setFact('cplp-portuguese-official')),
    g('atlas-20-equator', 'The Equator crosses their land', 'The Equator crosses dry land in each country.', 2, ['COL', 'ECU', 'GAB', 'KEN'], setFact('equator-land-crossings')),
    g('atlas-20-population', 'Above 100 million people in 2023', 'Each had a 2023 population above 100 million in the World Bank series.', 3, ['EGY', 'IND', 'NGA', 'USA'], over100m()),
    g('atlas-20-opec', 'Among OPEC’s five founding members', 'These four were among the five countries that founded OPEC in 1960.', 4, ['IRN', 'KWT', 'SAU', 'VEN'], setFact('opec-founding-members')),
  ], 'Language, latitude, population scale, and an explicitly partial founding membership each supply a different clue.'),

  puzzle('atlas-21', 'hard', [
    g('atlas-21-china', 'Share a land border with China', 'Each country shares a land border with China.', 1, ['AFG', 'IND', 'LAO', 'PAK'], { type: 'border-country', countryCode: 'CHN' }),
    g('atlas-21-danube', 'Their capitals sit on the Danube', 'Vienna, Budapest, Belgrade, and Bratislava stand on the Danube.', 2, ['AUT', 'HUN', 'SRB', 'SVK'], setFact('danube-capital-cities')),
    g('atlas-21-red-sea', 'Have a Red Sea shoreline', 'Each has a Red Sea or Gulf of Aqaba shoreline.', 3, ['EGY', 'ISR', 'SDN', 'YEM'], setFact('red-sea-coast')),
    g('atlas-21-population', 'Between 1 and 5 million people in 2023', 'Each had a 2023 population from 1 million up to, but not including, 5 million.', 4, ['ALB', 'BIH', 'GAB', 'URY'], { type: 'population-band', minimum: 1_000_000, maximum: 5_000_000, year: '2023' }),
  ], 'Each clue points to a distinct scale: one border, capital river, marginal sea, or a dated population interval.'),
  puzzle('atlas-22', 'hard', [
    g('atlas-22-sacu', 'Among SACU’s five member states', 'These four are members of the five-country Southern African Customs Union.', 1, ['BWA', 'LSO', 'NAM', 'ZAF'], setFact('sacu-members')),
    g('atlas-22-eec', 'Among the six EEC founding states', 'These four were among the six states that signed the Treaty of Rome to establish the EEC.', 2, ['BEL', 'FRA', 'ITA', 'LUX'], setFact('eec-founding-members')),
    g('atlas-22-opec', 'Among OPEC’s five founding members', 'These four were among the five countries that founded OPEC in 1960.', 3, ['IRN', 'IRQ', 'SAU', 'VEN'], setFact('opec-founding-members')),
    g('atlas-22-black-sea', 'Have a Black Sea shoreline', 'Each has a shoreline on the Black Sea.', 4, ['BGR', 'ROU', 'RUS', 'UKR'], setFact('black-sea-coast')),
  ], 'Customs, European integration and oil-export histories compete with a generalized Black Sea shoreline.'),
  puzzle('atlas-23', 'hard', [
    g('atlas-23-yugoslav', 'Among the former Yugoslav republics', 'These four were among the six republics of the Socialist Federal Republic of Yugoslavia.', 1, ['HRV', 'MNE', 'SRB', 'SVN'], setFact('former-yugoslav-republics')),
    g('atlas-23-g7', 'Among the seven G7 members', 'These four are among the seven G7 member countries.', 2, ['CAN', 'FRA', 'GBR', 'USA'], setFact('g7-members')),
    g('atlas-23-india', 'Share a land border with India', 'Each country shares a land border with India.', 3, ['BGD', 'MMR', 'NPL', 'PAK'], { type: 'border-country', countryCode: 'IND' }),
    g('atlas-23-capital', 'Capital and country share a name', 'The national capital has the same name as its country.', 4, ['DJI', 'LUX', 'MCO', 'SGP'], { type: 'capital-country-name' }),
  ], 'A history set, an explicitly partial G7 set, a border clue and matching capital names form four different kinds of link.'),
  puzzle('atlas-24', 'hard', [
    g('atlas-24-guinea', 'Names containing “Guinea”', 'The country name itself contains Guinea.', 1, ['GIN', 'GNB', 'GNQ', 'PNG'], { type: 'country-name-contains', value: 'Guinea' }),
    g('atlas-24-india', 'Share a land border with India', 'Each country shares a land border with India.', 2, ['BGD', 'BTN', 'NPL', 'PAK'], { type: 'border-country', countryCode: 'IND' }),
    g('atlas-24-eec', 'Among the six EEC founding states', 'These four were among the six states that signed the Treaty of Rome to establish the EEC.', 3, ['LUX', 'NLD', 'FRA', 'ITA'], setFact('eec-founding-members')),
    g('atlas-24-opec', 'Among OPEC’s five founding members', 'These four were among the five countries that founded OPEC in 1960.', 4, ['IRQ', 'KWT', 'SAU', 'VEN'], setFact('opec-founding-members')),
  ], 'A lexical quartet sits beside political and physical clues. The selection uses four different country-code sets, so every tile has one intended home.'),
]
