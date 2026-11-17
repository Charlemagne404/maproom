import { STANDARD_CODES, SPECIAL_GEOGRAPHIC_CODES } from '../../geography/catalogue-rules.mjs'

function reviewedCodeSet(label, codes) {
  const result = new Set(codes)
  if (result.size !== codes.length) throw new Error(`Duplicate ISO3 in ${label} outline review set`)
  return result
}

// Every bundled identity is reviewed here. A remaining reviewed identity is a
// Medium outline; adding a new catalogue identity without reviewing it fails QA.
export const REVIEWED_OUTLINE_CODES = reviewedCodeSet('reviewed', `
AFG AGO ALB ALA AND ARE ARG ARM ASM ATC ATF ATG AUS AUT ABW AZE BDI BEL BEN BFA BGD BGR BHR BHS BIH BLR BLZ BOL BRA BRB BRN BTN BWA CAF CAN CHE CHL CHN CIV CMR COD COG COL COM CPV CRI CUB CYP CZE DEU DJI DMA DNK DOM DZA ECU EGY ERI ESP EST ETH FIN FJI FRA FSM GAB GBR GEO GHA GIN GMB GNB GNQ GRC GRD GTM GUY HND HRV HTI HUN IDN IND IRL IRN IRQ ISL ISR ITA JAM JOR JPN KAZ KEN KGZ KHM KIR KNA KOR KWT LAO LBN LBR LBY LCA LIE LKA LSO LTU LUX LVA MAR MCO MDA MDG MDV MEX MHL MKD MLI MLT MMR MNE MNG MOZ MRT MUS MWI MYS NAM NER NGA NIC NLD NOR NPL NRU NZL OMN PAK PAN PER PHL PLW PNG POL PRK PRT PRY QAT ROU RUS RWA SAU SDN SEN SGP SLB SLE SLV SMR SOM SRB SSD STP SUR SVK SVN SWE SWZ SYC SYR TCD TGO THA TJK TKM TLS TON TTO TUN TUR TUV TZA UGA UKR URY USA UZB VAT VCT VEN VNM VUT WSM YEM ZAF ZMB ZWE PSE
 AIA BES BLM BMU BVT CCK CXR CLP COK CUW CYM ESB FLK FRO GGY GIB GLP GRL GUF HKG HMD IMN IOT JEY MAC MAF MSR MTQ MYT NCL NFK NIU MNP PCN PRI PYF REU SGS SHN SJM SPM SXM TCA TKL UMI VGB VIR WLF WSB CSI GUM
ATA ESH UNK TWN
`.trim().split(/\s+/))

export const EASY_OUTLINE_CODES = reviewedCodeSet('easy', `
AFG ARG AUS BRA CAN CHL CHN COL CUB DEU DZA EGY ESP FIN FRA GBR IDN IND IRN IRQ ITA JPN KAZ KEN KOR MEX MNG MYS NGA NOR NZL PAK PER PHL POL PRT RUS SAU SWE THA TUR UKR USA VEN VNM ZAF GRL
`.trim().split(/\s+/))

export const HARD_OUTLINE_CODES = reviewedCodeSet('hard', `
BHR BRB BRN DJI DMA ESH FLK FRO GMB GNQ GRD GLP GUM GUF IMN ISR KWT LBN LCA MTQ MYT NCL NIU PRI QAT REU SGS SLB TGO TLS TTO TWN UNK VUT WSM ABW CUW CXR BMU
`.trim().split(/\s+/))

const SPECIAL_REASON = 'Special geographic record; kept in the catalogue but outside ordinary country-outline play.'
const MICROSTATE_REASON = 'The detailed boundary is still a small, generic silhouette; a contextual map is needed for a fair question.'

export const EXCLUDED_OUTLINE_RULES = Object.freeze({
  ATA: { reason: 'Antarctica is a continental boundary record, not an ordinary country-outline question.', quality: 'special-record' },
  ATC: { reason: SPECIAL_REASON, quality: 'special-record' },
  ATF: { reason: 'The French Southern and Antarctic Lands combine widely separated island groups; one fitted silhouette is unbalanced.', quality: 'dispersed' },
  BVT: { reason: 'Uninhabited Bouvet Island is represented by a coarse 18-vertex polygon.', quality: 'low-detail' },
  CLP: { reason: 'Uninhabited Clipperton Island is represented by a generic 7-vertex polygon.', quality: 'low-detail' },
  CSI: { reason: SPECIAL_REASON, quality: 'special-record' },
  ESB: { reason: 'Military sovereign-base area; retained as a special geographic record, not a normal country-outline answer.', quality: 'special-record' },
  HMD: { reason: 'Remote uninhabited island group; its isolated components do not form a useful standalone silhouette.', quality: 'dispersed' },
  IOT: { reason: 'Remote atolls collapse into tiny, widely separated marks at the bundled scale.', quality: 'dispersed' },
  SJM: { reason: 'The single catalogue identity combines Svalbard and Jan Mayen, which are too far apart for a balanced silhouette.', quality: 'dispersed' },
  UMI: { reason: 'Remote United States island groups are separated by thousands of kilometres and cannot form one recognizable outline.', quality: 'dispersed' },
  WSB: { reason: 'Military sovereign-base area; retained as a special geographic record, not a normal country-outline answer.', quality: 'special-record' },
  AND: { reason: MICROSTATE_REASON, quality: 'low-distinctiveness' },
  LIE: { reason: 'The narrow 29-vertex shape is a generic sliver without regional context.', quality: 'low-distinctiveness' },
  MCO: { reason: 'Monaco is rendered as a simple 12-vertex polygon, too generic to identify fairly.', quality: 'low-detail' },
  SMR: { reason: 'San Marino is rendered as a compact 19-vertex polygon with too few distinctive cues.', quality: 'low-detail' },
  VAT: { reason: 'Vatican City is rendered as a simple 7-vertex enclave polygon, not a fair standalone silhouette.', quality: 'low-detail' },
  ALA: { reason: 'The Åland archipelago is a sparse scatter of islands rather than one recognizable silhouette.', quality: 'dispersed' },
  AIA: { reason: 'Anguilla is a small chain of islands that reads as tiny marks without regional context.', quality: 'dispersed' },
  ATG: { reason: 'Antigua and Barbuda are too small and separated to make a clear country silhouette.', quality: 'dispersed' },
  BHS: { reason: 'The Bahamas are hundreds of islands; the bundled silhouette is a sparse scatter rather than a coherent shape.', quality: 'dispersed' },
  BES: { reason: 'The Caribbean Netherlands combines three detached island groups into a sparse, unrecognizable silhouette.', quality: 'dispersed' },
  BLM: { reason: 'Saint Barthélemy is a tiny, coarse polygon with no reliable standalone outline cues.', quality: 'low-detail' },
  CCK: { reason: 'The Cocos (Keeling) Islands are too small and simplified to distinguish from a generic atoll.', quality: 'low-detail' },
  CYM: { reason: 'The Cayman Islands are three small, detached shapes with little silhouette detail.', quality: 'dispersed' },
  GGY: { reason: 'Guernsey and its neighbouring islands form a tiny, generic cluster at this scale.', quality: 'low-distinctiveness' },
  GIB: { reason: 'Gibraltar is a tiny, nearly rectangular enclave outline.', quality: 'low-detail' },
  JEY: { reason: 'Jersey is a small, generic island silhouette that is not fairly identifiable on its own.', quality: 'low-distinctiveness' },
  KNA: { reason: 'Saint Kitts and Nevis are two very small island shapes with insufficient distinctive detail.', quality: 'dispersed' },
  MAF: { reason: 'Saint Martin is a small island split into two administrative identities; its partial shape is misleading alone.', quality: 'low-distinctiveness' },
  MSR: { reason: 'Montserrat is a small, coarse polygon with too little contour detail for a fair silhouette question.', quality: 'low-detail' },
  SPM: { reason: 'Saint Pierre and Miquelon are small detached islands whose combined shape is difficult to recognize.', quality: 'dispersed' },
  SXM: { reason: 'Sint Maarten is the small southern part of a shared island; its isolated outline is misleading.', quality: 'low-distinctiveness' },
  TCA: { reason: 'Turks and Caicos are a widely scattered chain of small islands with little silhouette structure.', quality: 'dispersed' },
  VGB: { reason: 'The British Virgin Islands form a sparse archipelago that does not read as a country silhouette.', quality: 'dispersed' },
  VIR: { reason: 'The United States Virgin Islands are several small detached shapes without a distinctive combined outline.', quality: 'dispersed' },
  VCT: { reason: 'Saint Vincent and the Grenadines appear as a sparse string of small islands, not a coherent silhouette.', quality: 'dispersed' },
  COM: { reason: 'The Comoros reduce to three small island marks with little identifying outline detail.', quality: 'dispersed' },
  CPV: { reason: 'Cape Verde is a widely spaced island group; the isolated marks are not a fair silhouette-only question.', quality: 'dispersed' },
  MUS: { reason: 'Mauritius and its small detached islands are too small to give a reliable standalone silhouette.', quality: 'low-distinctiveness' },
  SHN: { reason: 'Saint Helena, Ascension and Tristan da Cunha combine distant islands into an unbalanced map extent.', quality: 'dispersed' },
  STP: { reason: 'São Tomé and Príncipe are small detached islands whose outlines are too generic at this scale.', quality: 'dispersed' },
  SYC: { reason: 'Seychelles are a large, scattered archipelago that renders as tiny isolated marks.', quality: 'dispersed' },
  HKG: { reason: 'Hong Kong’s many small detached islands are not visually identifiable at this country-outline scale.', quality: 'low-distinctiveness' },
  MAC: { reason: 'Macau is an extremely compact boundary and a few small reclaimed or detached polygons.', quality: 'low-detail' },
  MDV: { reason: 'The Maldives span a long chain of tiny atolls and render as dots rather than a recognizable silhouette.', quality: 'dispersed' },
  SGP: { reason: 'Singapore’s compact silhouette is a generic blob at this scale and needs surrounding map context.', quality: 'low-distinctiveness' },
  BDI: { reason: 'Burundi’s compact outline is too similar to several small inland polygons without regional context.', quality: 'low-distinctiveness' },
  NRU: { reason: 'Nauru is a simple 9-vertex oval with no distinctive silhouette cues.', quality: 'low-detail' },
  FJI: { reason: 'Fiji’s islands are small and separated across the Date Line; the combined shape renders as scattered marks.', quality: 'dispersed' },
  FSM: { reason: 'Micronesia’s islands are widely scattered and too small to make a coherent country silhouette.', quality: 'dispersed' },
  KIR: { reason: 'Kiribati spans both sides of the Date Line and its islands are too dispersed for one balanced outline.', quality: 'dispersed' },
  MHL: { reason: 'The Marshall Islands are a widely dispersed collection of atolls that render as tiny marks.', quality: 'dispersed' },
  MNP: { reason: 'The Northern Mariana Islands are a long string of tiny islands without a coherent silhouette.', quality: 'dispersed' },
  PCN: { reason: 'Pitcairn’s isolated island group is too small and sparse to form a distinctive silhouette.', quality: 'dispersed' },
  PLW: { reason: 'Palau’s islands are too small and scattered to read as a fair standalone outline.', quality: 'dispersed' },
  TON: { reason: 'Tonga’s many small islands form a sparse chain with no recognizable single silhouette.', quality: 'dispersed' },
  TUV: { reason: 'Tuvalu’s atolls are too small and widely separated to make a fair outline-only question.', quality: 'dispersed' },
  TKL: { reason: 'Tokelau’s tiny atolls are widely separated and collapse into a few marks.', quality: 'dispersed' },
  WLF: { reason: 'Wallis and Futuna comprise two detached island groups too small for a fair combined outline.', quality: 'dispersed' },
  COK: { reason: 'The Cook Islands are a widely spread group of small islands without a recognizable combined silhouette.', quality: 'dispersed' },
  NFK: { reason: 'Norfolk Island is a small, coarse 26-vertex polygon with few identifying outline cues.', quality: 'low-detail' },
  ASM: { reason: 'American Samoa is rendered as several small detached island marks without enough silhouette structure.', quality: 'dispersed' },
  PYF: { reason: 'French Polynesia combines widely separated island groups that cannot fit one recognizable silhouette.', quality: 'dispersed' },
})

export function outlineRuleFor(code) {
  if (EXCLUDED_OUTLINE_RULES[code]) {
    return {
      status: 'excluded',
      difficulty: null,
      reason: EXCLUDED_OUTLINE_RULES[code].reason,
      contextRequired: EXCLUDED_OUTLINE_RULES[code].quality !== 'special-record',
      quality: EXCLUDED_OUTLINE_RULES[code].quality,
      geometrySource: 'Natural Earth 1:10m',
    }
  }
  if (!REVIEWED_OUTLINE_CODES.has(code)) return undefined
  const difficulty = EASY_OUTLINE_CODES.has(code) ? 'easy' : HARD_OUTLINE_CODES.has(code) ? 'hard' : 'medium'
  const reason = difficulty === 'easy'
    ? 'Distinctive, familiar country silhouette suitable for an approachable outline question.'
    : difficulty === 'hard'
      ? 'A fair but less familiar or smaller silhouette; use only in a Hard outline round.'
      : 'A coherent, adequately detailed silhouette that rewards regional geography knowledge.'
  return {
    status: 'eligible',
    difficulty,
    reason,
    contextRequired: false,
    quality: 'suitable-for-silhouette',
    geometrySource: 'Natural Earth 1:10m',
  }
}

export function reviewedOutlineCodes() {
  return REVIEWED_OUTLINE_CODES
}

export function isOutlineTerritory(country) {
  return Boolean(country.parentIso3) && !STANDARD_CODES.has(country.iso3) && !SPECIAL_GEOGRAPHIC_CODES.has(country.iso3)
}

export function isOutlineStandard(country) {
  return STANDARD_CODES.has(country.iso3)
}

export function outlinePlayabilitySummary(countries) {
  const summary = { easy: 0, medium: 0, hard: 0, excluded: 0, standard: 0, territories: 0, additional: 0, special: 0 }
  for (const country of countries) {
    const rule = outlineRuleFor(country.iso3)
    if (!rule) continue
    if (rule.status === 'excluded') summary.excluded += 1
    else if (rule.difficulty) summary[rule.difficulty] += 1
    if (STANDARD_CODES.has(country.iso3)) summary.standard += 1
    else if (isOutlineTerritory(country)) summary.territories += 1
    else if (SPECIAL_GEOGRAPHIC_CODES.has(country.iso3)) summary.special += 1
    else summary.additional += 1
  }
  return summary
}
