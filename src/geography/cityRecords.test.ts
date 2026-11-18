import { describe, expect, it } from 'vitest'
import { isCurrentWholeSettlement } from './cityRecords'

describe('GeoNames settlement eligibility', () => {
  it('keeps current whole populated places and excludes non-current or section records', () => {
    expect(isCurrentWholeSettlement({ featureCode: 'PPL' })).toBe(true)
    expect(isCurrentWholeSettlement({ featureCode: 'PPLA2' })).toBe(true)
    expect(isCurrentWholeSettlement({ featureCode: 'PPLC' })).toBe(true)
    for (const featureCode of ['PPLH', 'PPLQ', 'PPLW', 'PPLX']) {
      expect(isCurrentWholeSettlement({ featureCode })).toBe(false)
    }
  })
})
