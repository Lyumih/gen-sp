import { describe, it, expect } from 'vitest'
import {
  computeUnitStat,
  UNIT_STAT_LEVEL_COEFF,
  UNIT_STAT_WORLD_POWER_COEFF,
} from './balance'

describe('computeUnitStat', () => {
  it('matches §7 formula with exported coefficients', () => {
    const baseStat = 10
    const unitLevel = 2
    const worldPower = 1
    const expected = Math.round(
      baseStat *
        (1 +
          UNIT_STAT_LEVEL_COEFF * unitLevel +
          UNIT_STAT_WORLD_POWER_COEFF * worldPower),
    )
    expect(
      computeUnitStat({ baseStat, unitLevel, worldPower }),
    ).toBe(expected)
    expect(expected).toBe(11)
  })
})
