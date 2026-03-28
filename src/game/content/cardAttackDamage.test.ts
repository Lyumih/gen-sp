import { describe, expect, it } from 'vitest'
import { computeCardAttackDamage } from './cardAttackDamage'
import type { CardAttackTemplate } from './cardTemplates'

describe('computeCardAttackDamage', () => {
  it('uses resolvePercentValue for token 40%% at L=100', () => {
    const t: CardAttackTemplate = {
      label: 'T',
      kind: 'melee',
      maxRange: 1,
      damageToken: '40%%',
      fallbackDamage: 5,
    }
    expect(computeCardAttackDamage(t, 100)).toBe(80)
  })

  it('uses fallback when no token', () => {
    const t: CardAttackTemplate = {
      label: 'T',
      kind: 'melee',
      maxRange: 1,
      fallbackDamage: 7,
    }
    expect(computeCardAttackDamage(t, 50)).toBe(7)
  })
})
