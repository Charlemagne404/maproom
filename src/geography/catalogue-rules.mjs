// Shared geography-pool conventions used by the app and reproducible QA scripts.
// Standard is a quiz rule: 193 UN members plus the two observer-state map records.
export const STANDARD_CODES = new Set(`
AFG AGO ALB AND ARE ARG ARM ATG AUS AUT AZE BDI BEL BEN BFA BGD BGR BHR BHS BIH BLR BLZ BOL BRA BRB BRN BTN BWA CAF CAN CHE CHL CHN CIV CMR COD COG COL COM CPV CRI CUB CYP CZE DEU DJI DMA DNK DOM DZA ECU EGY ERI ESP EST ETH FIN FJI FRA FSM GAB GBR GEO GHA GIN GMB GNB GNQ GRC GRD GTM GUY HND HRV HTI HUN IDN IND IRL IRN IRQ ISL ISR ITA JAM JOR JPN KAZ KEN KGZ KHM KIR KNA KOR KWT LAO LBN LBR LBY LCA LIE LKA LSO LTU LUX LVA MAR MCO MDA MDG MDV MEX MHL MKD MLI MLT MMR MNE MNG MOZ MRT MUS MWI MYS NAM NER NGA NIC NLD NOR NPL NRU NZL OMN PAK PAN PER PHL PLW PNG POL PRK PRT PRY QAT ROU RUS RWA SAU SDN SEN SGP SLB SLE SLV SMR SOM SRB SSD STP SUR SVK SVN SWE SWZ SYC SYR TCD TGO THA TJK TKM TLS TON TTO TUN TUR TUV TZA UGA UKR URY USA UZB VAT VCT VEN VNM VUT WSM YEM ZAF ZMB ZWE PSE
`.trim().split(/\s+/))

// These records are kept in the catalogue for geographic completeness, but are
// not ordinary country identities for game-pool classification purposes.
// Their separate identity and any parent relationship remain available.
export const SPECIAL_GEOGRAPHIC_CODES = new Set([
  'ATA', // Antarctica
  'ATC', // Ashmore and Cartier Islands
  'ATF', // French Southern and Antarctic Lands
  'BVT', // Bouvet Island
  'CLP', // Clipperton Island
  'CSI', // Coral Sea Islands
  'ESB', // Dhekelia Sovereign Base Area
  'HMD', // Heard Island and McDonald Islands
  'IOT', // British Indian Ocean Territory
  'SJM', // Svalbard and Jan Mayen combined map identity
  'UMI', // United States Minor Outlying Islands
  'WSB', // Akrotiri Sovereign Base Area
])

export function classifyGeography(country) {
  if (SPECIAL_GEOGRAPHIC_CODES.has(country.iso3)) return 'special-geographic-entity'
  if (STANDARD_CODES.has(country.iso3)) return 'standard-quiz-identity'
  if (country.parentIso3) return 'separately-represented-territory'
  return 'additional-identity'
}
