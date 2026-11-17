import type { Country, GeoFeature } from './types'

export type GeographyEligibility = 'standard' | 'extended'

// 193 UN members plus the Holy See and Palestine as the two observer states.
// The catalogue marks 194 ISO records independent; Palestine is added explicitly.
// XKX/Kosovo and other disputed or limited-recognition places remain Extended.
const STANDARD_CODES = new Set(`
AFG AGO ALB AND ARE ARG ARM ATG AUS AUT AZE BDI BEL BEN BFA BGD BGR BHR BHS BIH BLR BLZ BOL BRA BRB BRN BTN BWA CAF CAN CHE CHL CHN CIV CMR COD COG COL COM CPV CRI CUB CYP CZE DEU DJI DMA DNK DOM DZA ECU EGY ERI ESP EST ETH FIN FJI FRA FSM GAB GBR GEO GHA GIN GMB GNB GNQ GRC GRD GTM GUY HND HRV HTI HUN IDN IND IRL IRN IRQ ISL ISR ITA JAM JOR JPN KAZ KEN KGZ KHM KIR KNA KOR KWT LAO LBN LBR LBY LCA LIE LKA LSO LTU LUX LVA MAR MCO MDA MDG MDV MEX MHL MKD MLI MLT MMR MNE MNG MOZ MRT MUS MWI MYS NAM NER NGA NIC NLD NOR NPL NRU NZL OMN PAK PAN PER PHL PLW PNG POL PRK PRT PRY QAT ROU RUS RWA SAU SDN SEN SGP SLB SLE SLV SMR SOM SRB SSD STP SUR SVK SVN SWE SWZ SYC SYR TCD TGO THA TJK TKM TLS TON TTO TUN TUR TUV TZA UGA UKR URY USA UZB VAT VCT VEN VNM VUT WSM YEM ZAF ZMB ZWE PSE
`.trim().split(/\s+/))

export function isStandardCountry(code: string): boolean {
  return STANDARD_CODES.has(code)
}

export function eligibleCountries(countries: Country[], eligibility: GeographyEligibility = 'standard'): Country[] {
  return countries.filter((country) => eligibility === 'extended' || isStandardCountry(country.iso3))
}

export function eligibleFeatures(features: GeoFeature[], eligibility: GeographyEligibility = 'standard'): GeoFeature[] {
  return features.filter((feature) => {
    const code = feature.properties.iso3
    return Boolean(code && (eligibility === 'extended' || isStandardCountry(code)))
  })
}

export function standardCountryCount(): number {
  return STANDARD_CODES.size
}
