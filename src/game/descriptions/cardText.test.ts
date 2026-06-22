import { describe, expect, it } from 'vitest'
import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { getCardAttackTemplate } from '../content/cardTemplates'
import type { CardInstance } from '../types'
import { describeCardCombatStats, getCardDisplayLabel } from './cardText'

describe('getCardDisplayLabel', () => {
  it('returns label for strike', () => {
    expect(getCardDisplayLabel('strike')).toBe('Удар')
  })

  it('falls back to templateId', () => {
    expect(getCardDisplayLabel('unknown_card')).toBe('unknown_card')
  })
})

describe('describeCardCombatStats', () => {
  it('strike fists damage uses itemLevel 0 plus gear bonus', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'strike',
      global_level: 10,
      uses_count: 0,
      modSlots: [],
    }
    const gear = 3
    const tmpl = getCardAttackTemplate('strike')!
    expect(computeCardAttackDamage(tmpl, gear)).toBe(computeCardAttackDamage(tmpl, 3))

    const d = describeCardCombatStats(card, gear)
    expect(d.expectedDamage).toBe(computeCardAttackDamage(tmpl, 3))
    expect(d.displayLabel).toBe('Удар')
    expect(d.lines.some((l) => l.includes('кулаки'))).toBe(true)
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
    const d = describeCardCombatStats(card, 0, weapon)
    expect(d.expectedDamage).toBe(Math.round(base * 1.4))
  })

  it('missing template: no damage', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'nope',
      global_level: 1,
      uses_count: 0,
      modSlots: [],
    }
    const d = describeCardCombatStats(card, 0)
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
    const d = describeCardCombatStats(card, 0)
    expect(d.expectedDamage).toBe(Math.round(base * 1.5))
  })
})
