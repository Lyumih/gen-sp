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
      tags: ['skill', 'attack', 'melee'],
      semanticEmojiId: 'sword-red',
    }
    expect(computeCardAttackDamage(t, 100)).toBe(80)
  })

  it('uses fallback when no token', () => {
    const t: CardAttackTemplate = {
      label: 'T',
      kind: 'melee',
      maxRange: 1,
      fallbackDamage: 7,
      tags: ['skill', 'attack', 'melee'],
      semanticEmojiId: 'sword-red',
    }
    expect(computeCardAttackDamage(t, 50)).toBe(7)
  })
})
