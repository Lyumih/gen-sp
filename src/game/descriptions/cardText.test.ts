import { describe, expect, it } from 'vitest'
import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { getCardAttackTemplate } from '../content/cardTemplates'
import type { CardInstance } from '../types'
import { describeCardCombatStats, getCardDisplayLabel } from './cardText'

describe('getCardDisplayLabel', () => {
  it('returns label for strike', () => {
    expect(getCardDisplayLabel('strike')).toBe('Сильный удар')
  })

  it('falls back to templateId', () => {
    expect(getCardDisplayLabel('unknown_card')).toBe('unknown_card')
  })
})

describe('describeCardCombatStats', () => {
  it('strike fists damage uses weapon level 0 and gear strike mult', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'strike',
      global_level: 10,
      uses_count: 0,
      modSlots: [],
    }
    const gearStrikeDamageMult = 1.03
    const tmpl = getCardAttackTemplate('strike')!
    const base = computeCardAttackDamage(tmpl, 0)
    const afterGear = Math.round(base * gearStrikeDamageMult)

    const d = describeCardCombatStats(card, 1, gearStrikeDamageMult)
    expect(d.expectedDamage).toBe(afterGear)
    expect(d.displayLabel).toBe('Сильный удар')
    expect(d.lines.some((l) => l.includes('кулаки'))).toBe(true)
    expect(d.lines.some((l) => l.includes('Экипировка: ×1.03'))).toBe(true)
    expect(d.lines.some((l) => l.includes(`💥 база (⭐0): ${base}`))).toBe(true)
  })

  it('strike with equipped weapon uses weapon itemLevel and mods', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'strike',
      global_level: 1,
      uses_count: 0,
      modSlots: [],
    }
    const weapon = {
      id: 'w1',
      templateId: 'wooden_sword',
      itemLevel: 50,
      modSlots: [{ status: 'filled' as const, templateId: 'mod-weapon-damage', lm: 0 }],
    }
    const tmpl = getCardAttackTemplate('strike')!
    const base = computeCardAttackDamage(tmpl, 50)
    const afterGear = Math.round(base * 1)
    const d = describeCardCombatStats(card, 1, 1, weapon)
    expect(d.expectedDamage).toBe(Math.round(afterGear * 1.4))
    expect(d.lines.some((l) => l.includes('Моды: ×1.4'))).toBe(true)
  })

  it('missing template: no damage', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'nope',
      global_level: 1,
      uses_count: 0,
      modSlots: [],
    }
    const d = describeCardCombatStats(card, 1, 1)
    expect(d.expectedDamage).toBeNull()
    expect(d.lines[0]).toContain('не найден')
  })

  it('fireball uses card modSlots for damage preview', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'fireball',
      global_level: 10,
      uses_count: 0,
      modSlots: [{ status: 'filled', templateId: 'mod-damage-up', lm: 0 }],
    }
    const tmpl = getCardAttackTemplate('fireball')!
    const base = computeCardAttackDamage(tmpl, 10)
    const afterGear = Math.round(base * 1.05)
    const d = describeCardCombatStats(card, 1.05, 1)
    expect(d.expectedDamage).toBe(Math.round(afterGear * 1.5))
    expect(d.lines.some((l) => l.includes('Экипировка: ×1.05'))).toBe(true)
    expect(d.lines.some((l) => l.includes('Моды: ×1.5'))).toBe(true)
    expect(d.lines.some((l) => l.includes('Итого:'))).toBe(true)
  })
})
