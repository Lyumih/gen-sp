import { describe, expect, it } from 'vitest'
import { statusAuraPolarity, isHolyBuffStatus } from './statusAuraMap'

describe('statusAuraPolarity', () => {
  it('classifies attack_up as buff', () => {
    expect(statusAuraPolarity('attack_up')).toBe('buff')
  })

  it('classifies dot as debuff', () => {
    expect(statusAuraPolarity('dot')).toBe('debuff')
  })

  it('classifies damage_reduction as buff', () => {
    expect(statusAuraPolarity('damage_reduction')).toBe('buff')
  })

  it('defaults unknown kinds to debuff', () => {
    expect(statusAuraPolarity('future_unknown')).toBe('debuff')
  })
})

describe('isHolyBuffStatus', () => {
  it('returns true for divine_shield source', () => {
    expect(isHolyBuffStatus('damage_reduction', 'divine_shield')).toBe(true)
  })
})
