export const POPULATION_AGE_COHORTS = [
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
] as const

export interface PopulationAgeProfile {
  iso3: string
  male: number[]
  female: number[]
  age65Plus: number
}

export interface PopulationAgeProfiles {
  schemaVersion: 1
  year: 2023
  worldBankApiRelease: string
  cohortCodes: string[]
  profiles: PopulationAgeProfile[]
}

let profilesPromise: Promise<PopulationAgeProfiles> | undefined

export function loadPopulationAgeProfiles(): Promise<PopulationAgeProfiles> {
  profilesPromise ??= fetch('/data/population-age-profiles.json')
    .then(async (response) => {
      if (!response.ok) throw new Error(`Population age profiles could not be loaded (${response.status}).`)
      const data = await response.json() as unknown
      if (!isPopulationAgeProfiles(data)) throw new Error('The population age profile data is malformed.')
      return data
    })
    .catch((error: unknown) => {
      profilesPromise = undefined
      throw error
    })
  return profilesPromise
}

export function isPopulationAgeProfiles(value: unknown): value is PopulationAgeProfiles {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<PopulationAgeProfiles>
  if (data.schemaVersion !== 1 || data.year !== 2023 || typeof data.worldBankApiRelease !== 'string') return false
  if (!Array.isArray(data.cohortCodes) || data.cohortCodes.join(',') !== POPULATION_AGE_COHORTS.map(({ code }) => code).join(',')) return false
  if (!Array.isArray(data.profiles) || data.profiles.length < 190) return false
  const identities = new Set<string>()
  for (const item of data.profiles) {
    if (!item || !/^[A-Z]{3}$/.test(item.iso3) || identities.has(item.iso3)) return false
    identities.add(item.iso3)
    if (!Number.isFinite(item.age65Plus) || item.age65Plus < 0 || item.age65Plus > 100) return false
    if (!validCohorts(item.male) || !validCohorts(item.female)) return false
    const total = sum(item.male) + sum(item.female)
    const age65Plus = sum(item.male.slice(13)) + sum(item.female.slice(13))
    if (Math.abs(total - 100) > 0.03 || Math.abs(age65Plus - item.age65Plus) > 0.03) return false
  }
  return true
}

export function resetPopulationAgeProfilesForTests(): void {
  profilesPromise = undefined
}

function validCohorts(values: number[]): boolean {
  return Array.isArray(values)
    && values.length === POPULATION_AGE_COHORTS.length
    && values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
