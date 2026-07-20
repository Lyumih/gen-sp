import { describe, expect, it } from 'vitest'
import {
  CARD_ATTACK_TEMPLATES,
  getCardAttackTemplate,
  isCardTemplateEnabled,
  usesCardAttackDispatch,
} from './cardTemplates'
import { MONSTER_SKILL_TEMPLATES } from './monsterSkillTemplates'

describe('CARD_ATTACK_TEMPLATES', () => {
  it('strike is enabled melee skill', () => {
    expect(isCardTemplateEnabled('strike')).toBe(true)
    expect(getCardAttackTemplate('strike')?.kind).toBe('melee')
    expect(getCardAttackTemplate('strike')?.cooldownTurns).toBe(3)
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

describe('manaCost on templates', () => {
  it('every hero template has manaCost', () => {
    for (const [id, tmpl] of Object.entries(CARD_ATTACK_TEMPLATES)) {
      expect(tmpl.manaCost, id).toBeGreaterThan(0)
    }
  })

  it('fireball costs 13', () => {
    expect(CARD_ATTACK_TEMPLATES.fireball.manaCost).toBe(13)
  })

  it('every monster template has manaCost', () => {
    for (const [id, tmpl] of Object.entries(MONSTER_SKILL_TEMPLATES)) {
      expect(tmpl.manaCost, id).toBeGreaterThan(0)
    }
  })
})
