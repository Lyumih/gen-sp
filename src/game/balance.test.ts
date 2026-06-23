import { describe, it, expect } from 'vitest'
import {
  computeUnitStat,
  PER_LEVEL_RATE,
  scalePercentPerLevel,
  UNIT_STAT_LEVEL_COEFF,
  UNIT_STAT_WORLD_POWER_COEFF,
} from './balance'

describe('scalePercentPerLevel', () => {
  it('doubles base at level 100 with default rate', () => {
    expect(scalePercentPerLevel(10, 100)).toBe(20)
    expect(scalePercentPerLevel(40, 0)).toBe(40)
  })
})

describe('computeUnitStat', () => {
  it('uses 1% per unitLevel and worldPower', () => {
    expect(UNIT_STAT_LEVEL_COEFF).toBe(0.01)
    expect(UNIT_STAT_WORLD_POWER_COEFF).toBe(0.01)
    expect(PER_LEVEL_RATE).toBe(0.01)
    expect(computeUnitStat({ baseStat: 10, unitLevel: 100, worldPower: 0 })).toBe(20)
    expect(computeUnitStat({ baseStat: 10, unitLevel: 0, worldPower: 100 })).toBe(20)
    expect(computeUnitStat({ baseStat: 10, unitLevel: 2, worldPower: 1 })).toBe(10)
  })
})
