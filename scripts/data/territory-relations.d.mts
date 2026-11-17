export interface TerritoryRelation {
  parentIso3: string
  radiusKm?: number
  anchors?: Array<{ lat: number; lon: number }>
}

export const territoryRelations: Record<string, TerritoryRelation>
export const excludedParentRelations: Set<string>
