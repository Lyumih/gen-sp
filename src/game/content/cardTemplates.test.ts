import { describe, expect, it } from 'vitest'
import {
  CARD_ATTACK_TEMPLATES,
  getCardAttackTemplate,
  isCardTemplateEnabled,
  usesCardAttackDispatch,
} from './cardTemplates'

describe('CARD_ATTACK_TEMPLATES', () => {
  it('strike is enabled melee skill', () => {
    expect(isCardTemplateEnabled('strike')).toBe(true)
    expect(getCardAttackTemplate('strike')?.kind).toBe('melee')
    expect(usesCardAttackDispatch(getCardAttackTemplate('strike')!.kind)).toBe(true)
  })

  it('all templates have stat scaling fields', () => {
    for (const tmpl of Object.values(CARD_ATTACK_TEMPLATES)) {
      expect(tmpl.statSource).toBeTruthy()
      expect(tmpl.scaleToken).toMatch(/^\d+%%$/)
      expect(typeof tmpl.skillFlat).toBe('number')
    }
  })

  it('fireball cooldown is doubled', () => {
    expect(getCardAttackTemplate('fireball')?.cooldownTurns).toBe(6)
  })

  it('phase-2 kinds are enabled', () => {
    expect(CARD_ATTACK_TEMPLATES.regeneration.enabled).not.toBe(false)
    expect(CARD_ATTACK_TEMPLATES.battle_cry.enabled).not.toBe(false)
    expect(CARD_ATTACK_TEMPLATES.fireball.enabled).not.toBe(false)
  })
})
