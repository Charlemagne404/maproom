import { describe, expect, it } from 'vitest'
import type { Country } from '../geography/types'
import countriesRaw from '../../public/data/countries.json?raw'
import {
  auditConnectionsLibrary,
  auditConnectionsPuzzle,
  connectionsBoardIsUnambiguous,
  generateConnectionsPuzzle,
} from './connections'
import { CONNECTIONS_NAMED_FACT_SETS, CONNECTIONS_PUZZLES } from './connections-content'

const catalog = JSON.parse(countriesRaw) as { countries: Country[] }

describe('Geography Connections editorial boards', () => {
  it('ships 24 distinct fixed boards with eight puzzles at each overall difficulty', () => {
    expect(CONNECTIONS_PUZZLES).toHaveLength(24)
    expect(new Set(CONNECTIONS_PUZZLES.map((puzzle) => puzzle.id)).size).toBe(24)
    expect(CONNECTIONS_PUZZLES.filter((puzzle) => puzzle.difficulty === 'easy')).toHaveLength(8)
    expect(CONNECTIONS_PUZZLES.filter((puzzle) => puzzle.difficulty === 'medium')).toHaveLength(8)
    expect(CONNECTIONS_PUZZLES.filter((puzzle) => puzzle.difficulty === 'hard')).toHaveLength(8)
    for (const puzzle of CONNECTIONS_PUZZLES) {
      expect(puzzle.groups.map((group) => group.tier).sort()).toEqual([1, 2, 3, 4])
      expect(puzzle.editorialNote.length).toBeGreaterThan(30)
    }
  })

  it('does not repeat an exact country quartet within a difficulty pool', () => {
    const groupsByDifficultyAndQuartet = new Map<string, string[]>()
    for (const puzzle of CONNECTIONS_PUZZLES) {
      for (const group of puzzle.groups) {
        const quartet = [...group.countryCodes].sort().join(',')
        const key = `${puzzle.difficulty}:${quartet}`
        const groups = groupsByDifficultyAndQuartet.get(key) ?? []
        groups.push(`${puzzle.id}/${group.id}`)
        groupsByDifficultyAndQuartet.set(key, groups)
      }
    }
    const repeated = [...groupsByDifficultyAndQuartet.entries()].filter(([, groups]) => groups.length > 1)
    expect(repeated, repeated.map(([key, groups]) => `${key}: ${groups.join(' and ')}`).join('\n')).toEqual([])
  })

  it('keeps only the three documented exact-quartet repeats across difficulty pools', () => {
    const groupsByQuartet = new Map<string, string[]>()
    for (const puzzle of CONNECTIONS_PUZZLES) {
      for (const group of puzzle.groups) {
        const quartet = [...group.countryCodes].sort().join(',')
        const groups = groupsByQuartet.get(quartet) ?? []
        groups.push(`${puzzle.id}/${group.id}`)
        groupsByQuartet.set(quartet, groups)
      }
    }
    const repeated = Object.fromEntries([...groupsByQuartet.entries()]
      .filter(([, groups]) => groups.length > 1)
      .map(([quartet, groups]) => [quartet, groups.sort()]))
    expect(repeated).toEqual({
      'AUT,HUN,SRB,SVK': ['atlas-03/atlas-03-danube', 'atlas-21/atlas-21-danube'],
      'CMR,NER,NGA,TCD': ['atlas-08/atlas-08-lake-chad', 'atlas-17/atlas-17-lake-chad'],
      'GIN,GNB,GNQ,PNG': ['atlas-01/atlas-01-guinea', 'atlas-24/atlas-24-guinea'],
    })
  })

  it('makes larger named membership sets explicit in their group labels', () => {
    const fullMembershipGroups = new Set([
      'asean-founding-members',
      'eec-founding-members',
      'former-yugoslav-republics',
      'g7-members',
      'nordic-sovereign-states',
      'opec-founding-members',
      'sacu-members',
    ])
    for (const puzzle of CONNECTIONS_PUZZLES) {
      for (const group of puzzle.groups) {
        if (group.fact.type !== 'named-set' || !fullMembershipGroups.has(group.fact.id)) continue
        expect(group.label.toLocaleLowerCase('en').startsWith('among '), `${puzzle.id}/${group.id} label`).toBe(true)
        expect(group.explanation.toLocaleLowerCase('en'), `${puzzle.id}/${group.id} explanation`).toMatch(/five|six|seven/)
      }
    }
  })

  it('validates every country code, answer group, declared fact and exact alternative quartet', () => {
    const result = auditConnectionsLibrary(catalog.countries)
    expect(result.issues, result.issues.join('\n')).toEqual([])
  })

  it('surfaces current euro-area overlaps as editorial advisories, not validated answer rules', () => {
    const result = auditConnectionsLibrary(catalog.countries)
    expect(result.advisories).toEqual([
      'atlas-02: euro-area-members matches 4 board tiles (BEL, ESP, LUX, PRT).',
      'atlas-04: euro-area-members matches 4 board tiles (FIN, FRA, IRL, NLD).',
      'atlas-11: euro-area-members matches 5 board tiles (AUT, DEU, FRA, HRV, SVN).',
      'atlas-13: euro-area-members matches 4 board tiles (AUT, FIN, IRL, LUX).',
      'atlas-22: euro-area-members matches 5 board tiles (BEL, BGR, FRA, ITA, LUX).',
      'atlas-23: euro-area-members matches 4 board tiles (FRA, HRV, LUX, SVN).',
    ])
  })

  it('documents every hand-authored fact set and uses unique, known members', () => {
    expect(CONNECTIONS_NAMED_FACT_SETS.length).toBeGreaterThanOrEqual(12)
    const ids = new Set<string>()
    const countryCodes = new Set(catalog.countries.map((country) => country.iso3))
    for (const set of CONNECTIONS_NAMED_FACT_SETS) {
      expect(ids.has(set.id)).toBe(false)
      ids.add(set.id)
      expect(set.source.trim()).not.toBe('')
      expect(set.note.trim()).not.toBe('')
      expect(new Set(set.members).size).toBe(set.members.length)
      for (const code of set.members) expect(countryCodes.has(code), `${set.id} contains ${code}`).toBe(true)
    }
  })

  it('selects boards deterministically and advances to a new fixed board on replay', () => {
    const first = generateConnectionsPuzzle(catalog.countries, 'daily-seed', 'medium', 'standard', 0)
    const repeat = generateConnectionsPuzzle(catalog.countries, 'daily-seed', 'medium', 'standard', 0)
    const replay = generateConnectionsPuzzle(catalog.countries, 'daily-seed', 'medium', 'standard', 1)
    expect(first.id).toBe(repeat.id)
    expect(first.tiles.map((country) => country.iso3)).toEqual(repeat.tiles.map((country) => country.iso3))
    expect(replay.id).not.toBe(first.id)
    expect(new Set(replay.tiles.map((country) => country.iso3)).size).toBe(16)
  })

  it('keeps each authored difficulty pool playable in the standard and extended catalogues', () => {
    for (const eligibility of ['standard', 'extended'] as const) {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        const board = generateConnectionsPuzzle(catalog.countries, `${eligibility}:${difficulty}`, difficulty, eligibility)
        expect(board.tiles).toHaveLength(16)
        expect(new Set(board.tiles.map((country) => country.iso3)).size).toBe(16)
        expect(board.groups.every((group) => group.countryCodes.every((code) => board.tiles.some((tile) => tile.iso3 === code)))).toBe(true)
      }
    }
  })

  it('rejects a different exact quartet created by a shared country attribute', () => {
    const codes = ['AFG', 'ALB', 'DZA', 'CMR', 'NER', 'NGA', 'AND', 'CZE', 'HUN', 'SVK', 'ARG', 'BRA', 'CHL', 'COL', 'ECU', 'PER']
    const toyCountries = codes.map((iso3, index) => ({
      ...catalog.countries[0],
      iso3,
      name: `Place ${index + 1}`,
      continent: index === 2 || index === 3 || index === 4 || index === 5 ? 'Africa' : 'Other',
      subregion: `answer-${Math.floor(index / 4)}`,
      landlocked: false,
      borders: [],
      capital: `City ${index + 1}`,
    }))
    const groups = Array.from({ length: 4 }, (_, index) => ({
      id: `answer-${index}`,
      label: `Subregion ${index + 1}`,
      explanation: 'All four are assigned to the same toy subregion.',
      tier: (index + 1) as 1 | 2 | 3 | 4,
      countryCodes: codes.slice(index * 4, index * 4 + 4),
      fact: { type: 'subregion' as const, value: `answer-${index}` },
    }))
    const result = auditConnectionsPuzzle({ id: 'synthetic-overlap', groups, tiles: toyCountries, difficulty: 'easy', eligibility: 'standard' }, toyCountries)
    expect(result.issues.some((issue) => issue.includes('same continent (Africa)'))).toBe(true)
  })

  it('rejects a repeated tile and a changed fact answer during authoring review', () => {
    const source = CONNECTIONS_PUZZLES[0]
    const board = generateConnectionsPuzzle(catalog.countries, 'audit-seed', source.difficulty, 'standard')
    expect(connectionsBoardIsUnambiguous(board, catalog.countries)).toBe(true)
    const repeated = { ...board, tiles: [...board.tiles.slice(0, 15), board.tiles[0]] }
    expect(auditConnectionsPuzzle(repeated, catalog.countries).issues.some((issue) => issue.includes('distinct'))).toBe(true)
    const invalidFact = {
      ...board,
      groups: board.groups.map((group, index) => index === 0 ? { ...group, countryCodes: ['USA', 'CAN', 'MEX', 'BRA'] } : group),
    }
    expect(auditConnectionsPuzzle(invalidFact, catalog.countries).issues.length).toBeGreaterThan(0)
  })
})
