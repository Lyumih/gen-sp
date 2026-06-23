import { describe, expect, it } from 'vitest'
import {
  computePassiveFlatBonus,
  computePassivePctBonus,
  passiveTierMult,
} from './passiveBonus'

describe('passiveBonus', () => {
  it('tier mult steps every 100 levels', () => {
    expect(passiveTierMult(0)).toBe(1)
    expect(passiveTierMult(99)).toBe(1)
    expect(passiveTierMult(100)).toBe(1.5)
    expect(passiveTierMult(200)).toBe(2)
  })

  it('flat bonus scales with tier', () => {
    expect(computePassiveFlatBonus(2, 0)).toBe(2)
    expect(computePassiveFlatBonus(2, 100)).toBe(3)
  })

  it('pct bonus scales with tier', () => {
    expect(computePassivePctBonus(20, 15, 0)).toBe(3)
    expect(computePassivePctBonus(20, 15, 100)).toBe(5)
  })
})
