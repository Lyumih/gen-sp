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
  it('damage matches computeCardAttackDamage with gear bonus', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'strike',
      global_level: 10,
      uses_count: 0,
      modSlots: [],
    }
    const gear = 3
    const tmpl = getCardAttackTemplate('strike')!
    expect(computeCardAttackDamage(tmpl, 13)).toBe(
      computeCardAttackDamage(tmpl, card.global_level + gear),
    )

    const d = describeCardCombatStats(card, gear)
    expect(d.expectedDamage).toBe(computeCardAttackDamage(tmpl, 13))
    expect(d.displayLabel).toBe('Удар')
    expect(d.lines.some((l) => l.includes('13'))).toBe(true)
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

  it('shows mod-adjusted damage when modSlots filled', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'strike',
      global_level: 10,
      uses_count: 0,
      modSlots: [{ status: 'filled', templateId: 'mod-damage-up', lm: 0 }],
    }
    const tmpl = getCardAttackTemplate('strike')!
    const base = computeCardAttackDamage(tmpl, 10)
    const d = describeCardCombatStats(card, 0)
    expect(d.expectedDamage).toBe(Math.round(base * 1.5))
  })
})
