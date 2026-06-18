import { describe, expect, it } from 'vitest'
import { computeCardHealAmount } from './cardHealAmount'
import { getCardAttackTemplate } from './cardTemplates'

describe('computeCardHealAmount', () => {
  it('uses healToken 25%% at level 1', () => {
    const tmpl = getCardAttackTemplate('heal')
    expect(tmpl).toBeDefined()
    expect(computeCardHealAmount(tmpl!, 1)).toBe(25)
  })

  it('uses fallbackHeal when no token', () => {
    const tmpl = getCardAttackTemplate('heal')!
    const noToken = { ...tmpl, healToken: undefined }
    expect(computeCardHealAmount(noToken, 1)).toBe(6)
  })
})
