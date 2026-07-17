import { describe, expect, it } from 'vitest'
import {
  FLOAT_ABSORB_STAGGER_MS,
  formatDamageFloat,
  formatHealFloat,
  formatStatusFloat,
  statusKindEmoji,
} from './floatTextMap'
import {
  UI_ATTACK,
  UI_DAMAGE,
  UI_DEBUFF,
  UI_DEFENSE,
  UI_DOT,
  UI_HEAL,
  UI_HEART,
  UI_MAGIC,
} from '../../../game/ui/labels'

describe('formatDamageFloat', () => {
  it('returns single damage line', () => {
    expect(formatDamageFloat(12)).toEqual([
      { text: `-12 ${UI_DAMAGE}`, variant: 'damage' },
    ])
  })

  it('appends absorb line with stagger', () => {
    expect(formatDamageFloat(3, 7)).toEqual([
      { text: `-3 ${UI_DAMAGE}`, variant: 'damage' },
      { text: `(7 ${UI_DEFENSE})`, variant: 'absorb', delayMs: FLOAT_ABSORB_STAGGER_MS },
    ])
  })

  it('omits absorb when zero', () => {
    expect(formatDamageFloat(5, 0)).toHaveLength(1)
  })
})

describe('formatHealFloat', () => {
  it('formats positive heal', () => {
    expect(formatHealFloat(8)).toEqual([
      { text: `+8 ${UI_HEART}`, variant: 'heal' },
    ])
  })
})

describe('statusKindEmoji', () => {
  it('maps known kinds', () => {
    expect(statusKindEmoji('attack_up', 'buff')).toBe(UI_ATTACK)
    expect(statusKindEmoji('dot', 'debuff')).toBe(UI_DOT)
    expect(statusKindEmoji('regen', 'buff')).toBe(UI_HEAL)
  })

  it('falls back by polarity', () => {
    expect(statusKindEmoji('unknown_xyz', 'buff')).toBe(UI_MAGIC)
    expect(statusKindEmoji('unknown_xyz', 'debuff')).toBe(UI_DEBUFF)
  })
})

describe('formatStatusFloat', () => {
  it('returns buff variant for buff polarity', () => {
    expect(formatStatusFloat('attack_up', 'buff')).toEqual([
      { text: UI_ATTACK, variant: 'buff' },
    ])
  })

  it('returns debuff variant for debuff polarity', () => {
    expect(formatStatusFloat('unknown_xyz', 'debuff')).toEqual([
      { text: UI_DEBUFF, variant: 'debuff' },
    ])
  })
})
