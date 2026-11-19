import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STANDARD_CODES } from '../../src/geography/catalogue-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dataDir = path.join(root, 'public', 'data')
const outputPath = path.join(dataDir, 'population-age-profiles.json')
const manifestPath = path.join(dataDir, 'data-manifest.json')

export const POPULATION_COHORTS = [
  { code: '0004', label: '0–4' },
  { code: '0509', label: '5–9' },
  { code: '1014', label: '10–14' },
  { code: '1519', label: '15–19' },
  { code: '2024', label: '20–24' },
  { code: '2529', label: '25–29' },
  { code: '3034', label: '30–34' },
  { code: '3539', label: '35–39' },
  { code: '4044', label: '40–44' },
  { code: '4549', label: '45–49' },
  { code: '5054', label: '50–54' },
  { code: '5559', label: '55–59' },
  { code: '6064', label: '60–64' },
  { code: '6569', label: '65–69' },
  { code: '7074', label: '70–74' },
  { code: '7579', label: '75–79' },
  { code: '80UP', label: '80+' },
]

const WORLD_BANK_API = 'https://api.worldbank.org/v2/country/all/indicator/{indicator}?date=2023&format=json&per_page=20000'
const SOURCE_NAME = 'World Bank World Development Indicators population age profiles'

export async function buildPopulationAgeProfiles() {
  const cohortCodes = POPULATION_COHORTS.map(({ code }) => code)
  const indicatorCodes = [
    ...cohortCodes.flatMap((cohort) => ['MA', 'FE'].map((sex) => `SP.POP.${cohort}.${sex}.5Y`)),
    'SP.POP.TOTL.MA.IN',
    'SP.POP.TOTL.FE.IN',
    'SP.POP.65UP.TO.ZS',
  ]
  const valuesByIndicator = new Map()
  const releaseDates = new Set()
  let nextIndex = 0

  async function fetchIndicator(indicator) {
    const url = WORLD_BANK_API.replace('{indicator}', indicator)
    let issue
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: { 'user-agent': 'Maproom-population-age-profile-builder/1.0' },
          signal: AbortSignal.timeout(20_000),
        })
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        const payload = await response.json()
        if (!Array.isArray(payload) || !payload[0] || !Array.isArray(payload[1])) {
          throw new Error('World Bank returned an unexpected indicator response.')
        }
        if (payload[0].lastupdated) releaseDates.add(payload[0].lastupdated)
        const observations = new Map(payload[1]
          .filter((row) => row?.date === '2023' && row.countryiso3code && Number.isFinite(row.value))
          .map((row) => [row.countryiso3code, row.value]))
        valuesByIndicator.set(indicator, observations)
        return
      } catch (error) {
        issue = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
      }
    }
    throw new Error(`Could not load ${indicator}: ${issue instanceof Error ? issue.message : String(issue)}`)
  }

  async function worker() {
    while (nextIndex < indicatorCodes.length) {
      const indicator = indicatorCodes[nextIndex]
      nextIndex += 1
      if (indicator) await fetchIndicator(indicator)
    }
  }

  await Promise.all(Array.from({ length: 8 }, worker))
  if (releaseDates.size !== 1) throw new Error(`Expected one World Bank release date; found ${[...releaseDates].join(', ') || 'none'}.`)

  const maleTotal = valuesByIndicator.get('SP.POP.TOTL.MA.IN')
  const femaleTotal = valuesByIndicator.get('SP.POP.TOTL.FE.IN')
  const age65Plus = valuesByIndicator.get('SP.POP.65UP.TO.ZS')
  if (!maleTotal || !femaleTotal || !age65Plus) throw new Error('World Bank population totals are missing.')

  const profiles = []
  const missingCodes = []
  for (const iso3 of [...STANDARD_CODES].sort()) {
    const maleN = maleTotal.get(iso3)
    const femaleN = femaleTotal.get(iso3)
    const olderShare = age65Plus.get(iso3)
    const maleCohorts = cohortCodes.map((cohort) => valuesByIndicator.get(`SP.POP.${cohort}.MA.5Y`)?.get(iso3))
    const femaleCohorts = cohortCodes.map((cohort) => valuesByIndicator.get(`SP.POP.${cohort}.FE.5Y`)?.get(iso3))
    if (![maleN, femaleN, olderShare, ...maleCohorts, ...femaleCohorts].every(Number.isFinite) || maleN + femaleN <= 0) {
      missingCodes.push(iso3)
      continue
    }

    const total = maleN + femaleN
    const male = maleCohorts.map((share) => round(share * maleN / total, 5))
    const female = femaleCohorts.map((share) => round(share * femaleN / total, 5))
    const sum = male.reduce((subtotal, share) => subtotal + share, 0) + female.reduce((subtotal, share) => subtotal + share, 0)
    const derived65Plus = male.slice(13).reduce((subtotal, share) => subtotal + share, 0)
      + female.slice(13).reduce((subtotal, share) => subtotal + share, 0)
    if (Math.abs(sum - 100) > 0.02) throw new Error(`${iso3} age profile totals ${sum.toFixed(4)}%, expected 100%.`)
    if (Math.abs(derived65Plus - olderShare) > 0.01) throw new Error(`${iso3} age bands disagree with the World Bank 65+ series.`)
    profiles.push({ iso3, male, female, age65Plus: round(olderShare, 5) })
  }
  if (profiles.length < 190) throw new Error(`Only ${profiles.length} Standard identities have complete population age profiles.`)

  const output = {
    schemaVersion: 1,
    year: 2023,
    worldBankApiRelease: [...releaseDates][0],
    cohortCodes,
    profiles,
  }
  const serialized = `${JSON.stringify(output)}\n`
  await writeFile(outputPath, serialized)

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const sha256 = createHash('sha256').update(serialized).digest('hex')
  manifest.sources = (manifest.sources ?? []).filter((source) => source.name !== SOURCE_NAME)
  manifest.sources.push({
    name: SOURCE_NAME,
    source: WORLD_BANK_API,
    series: indicatorCodes,
    version: `2023 observations; World Bank API last updated ${output.worldBankApiRelease}`,
    retrievedAt: new Date().toISOString(),
    sha256,
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0) with World Bank dataset terms',
    licenseUrl: 'https://data.worldbank.org/summary-terms-of-use',
    attribution: 'World Bank, World Development Indicators; age-distribution estimates sourced from the United Nations World Population Prospects 2024 Revision.',
    transformations: [
      'Joined the 2023 observations by ISO3 code and retained Standard quiz identities with complete age bands, sex-specific population totals and the 65+ share.',
      'Converted each male/female age-band percentage from its sex-specific population denominator to a percentage of total population using the 2023 male and female totals.',
      'Checked that each weighted profile totals 100% and its 65+ cohort sum agrees with the separate World Bank SP.POP.65UP.TO.ZS series; identities without complete values have no fallback.',
    ],
  })
  manifest.artifacts = { ...manifest.artifacts, populationAgeProfilesSha256: sha256 }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Built ${profiles.length} population age profiles; missing Standard identities: ${missingCodes.join(', ') || 'none'}.`)
  return output
}

function round(value, places) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildPopulationAgeProfiles()
}
