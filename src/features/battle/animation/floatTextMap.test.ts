import { describe, expect, it } from 'vitest'
import {
  formatDamageFloat,
  formatHealFloat,
  formatStatusFloat,
  statusKindEmoji,
} from './floatTextMap'
import { UI_DAMAGE, UI_DEFENSE, UI_HEART } from '../../../game/ui/labels'

describe('formatDamageFloat', () => {
  it('returns single damage line', () => {
    expect(formatDamageFloat(12)).toEqual([
      { text: `-12 ${UI_DAMAGE}`, variant: 'damage' },
    ])
  })

  it('appends absorb line with stagger', () => {
    expect(formatDamageFloat(3, 7)).toEqual([
      { text: `-3 ${UI_DAMAGE}`, variant: 'damage' },
      { text: `(7 ${UI_DEFENSE})`, variant: 'absorb', delayMs: 100 },
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
    expect(statusKindEmoji('attack_up', 'buff')).toBe('⚔')
    expect(statusKindEmoji('dot', 'debuff')).toBe('🔥')
    expect(statusKindEmoji('regen', 'buff')).toBe('💚')
  })

  it('falls back by polarity', () => {
    expect(statusKindEmoji('unknown_xyz', 'buff')).toBe('✨')
    expect(statusKindEmoji('unknown_xyz', 'debuff')).toBe('💀')
  })
})

describe('formatStatusFloat', () => {
  it('returns buff variant for buff polarity', () => {
    expect(formatStatusFloat('attack_up', 'buff')).toEqual([
      { text: '⚔', variant: 'buff' },
    ])
  })
})
