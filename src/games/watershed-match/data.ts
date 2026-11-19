import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'

export interface WatershedQuestionData {
  id: string
  region: string
  sourceId: string
  answerId: string
  optionIds: string[]
}

export interface WatershedUnitProperties {
  huc12: string
  name: string
}

export interface WatershedMatchData {
  schemaVersion: 1
  collection: 'wbd12_20250107'
  regions: string[]
  units: GeoJSON.FeatureCollection<GeoJSON.GeometryObject, WatershedUnitProperties>
  unitsById: Map<string, GeoJSON.Feature<GeoJSON.GeometryObject, WatershedUnitProperties>>
  questions: WatershedQuestionData[]
}

interface WatershedRawData {
  schemaVersion: 1
  collection: 'wbd12_20250107'
  regions: string[]
  topology: Topology<{ units: GeometryCollection<WatershedUnitProperties> }>
  questions: WatershedQuestionData[]
}

let dataPromise: Promise<WatershedMatchData> | undefined

export function loadWatershedMatchData(): Promise<WatershedMatchData> {
  dataPromise ??= fetch('/data/watershed-match.json')
    .then(async (response) => {
      if (!response.ok) throw new Error(`Watershed data could not be loaded (${response.status}).`)
      return parseWatershedMatchData(await response.json() as unknown)
    })
    .catch((error: unknown) => {
      dataPromise = undefined
      throw error
    })
  return dataPromise
}

export function parseWatershedMatchData(value: unknown): WatershedMatchData {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.collection !== 'wbd12_20250107'
    || !Array.isArray(value.regions) || !value.regions.every((region) => typeof region === 'string')
    || !Array.isArray(value.questions) || value.questions.length < 50
    || !isRecord(value.topology) || value.topology.type !== 'Topology'
    || !isRecord(value.topology.objects) || !isRecord(value.topology.objects.units)
    || value.topology.objects.units.type !== 'GeometryCollection') {
    throw new Error('The watershed map data has an unsupported format or insufficient question coverage.')
  }

  const topology = value.topology as unknown as WatershedRawData['topology']
  const units = feature(topology, topology.objects.units) as GeoJSON.FeatureCollection<GeoJSON.GeometryObject, WatershedUnitProperties>
  if (!units.features.length) throw new Error('The watershed map does not contain any geometry.')

  const unitsById = new Map<string, GeoJSON.Feature<GeoJSON.GeometryObject, WatershedUnitProperties>>()
  for (const unit of units.features) {
    const id = unit.id === undefined ? unit.properties?.huc12 : String(unit.id)
    if (!id || !/^\d{12}$/.test(id) || !unit.properties || unit.properties.huc12 !== id
      || typeof unit.properties.name !== 'string' || !unit.properties.name.trim()
      || !unit.geometry || (unit.geometry.type !== 'Polygon' && unit.geometry.type !== 'MultiPolygon')
      || unitsById.has(id)) {
      throw new Error(`The watershed geometry is invalid for unit ${id ?? 'unknown'}.`)
    }
    unitsById.set(id, unit)
  }

  const sourceIds = new Set<string>()
  const questionIds = new Set<string>()
  const questions: WatershedQuestionData[] = []
  for (const valueQuestion of value.questions) {
    if (!isRecord(valueQuestion) || typeof valueQuestion.id !== 'string' || typeof valueQuestion.region !== 'string'
      || typeof valueQuestion.sourceId !== 'string' || typeof valueQuestion.answerId !== 'string'
      || !Array.isArray(valueQuestion.optionIds) || !valueQuestion.optionIds.every((id) => typeof id === 'string')) {
      throw new Error('A watershed question is malformed.')
    }
    const question = valueQuestion as unknown as WatershedQuestionData
    if (questionIds.has(question.id) || sourceIds.has(question.sourceId) || !value.regions.includes(question.region)
      || !unitsById.has(question.sourceId) || !unitsById.has(question.answerId)
      || question.sourceId === question.answerId || question.optionIds.length !== 3
      || new Set(question.optionIds).size !== 3 || !question.optionIds.includes(question.answerId)
      || question.optionIds.some((id) => id === question.sourceId || !unitsById.has(id))) {
      throw new Error(`The watershed question is invalid for source ${question.sourceId}.`)
    }
    questionIds.add(question.id)
    sourceIds.add(question.sourceId)
    questions.push(question)
  }

  return {
    schemaVersion: 1,
    collection: 'wbd12_20250107',
    regions: value.regions,
    units,
    unitsById,
    questions,
  }
}

export function resetWatershedDataForTests(): void {
  dataPromise = undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
