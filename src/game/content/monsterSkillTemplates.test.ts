import { describe, expect, it } from 'vitest'
import { getCardAttackTemplate } from './cardTemplates'
import {
  MONSTER_SKILL_TEMPLATE_IDS,
  MONSTER_SKILL_TEMPLATES,
  getMonsterSkillTemplate,
} from './monsterSkillTemplates'

describe('monsterSkillTemplates', () => {
  it('getCardAttackTemplate resolves monster_bite as melee with poison or dot', () => {
    const tmpl = getCardAttackTemplate('monster_bite')
    expect(tmpl?.kind).toBe('melee')
    expect(tmpl?.tags.some((t) => t === 'poison' || t === 'dot')).toBe(true)
  })

  it('exports 6 monster_* and 10 boss_* templates', () => {
    const monsterIds = MONSTER_SKILL_TEMPLATE_IDS.filter((id) => id.startsWith('monster_'))
    const bossIds = MONSTER_SKILL_TEMPLATE_IDS.filter((id) => id.startsWith('boss_'))
    expect(monsterIds).toHaveLength(6)
    expect(bossIds).toHaveLength(10)
    expect(Object.keys(MONSTER_SKILL_TEMPLATES)).toHaveLength(16)
  })

  it('getMonsterSkillTemplate returns boss_blink_adjacent utility skill', () => {
    const tmpl = getMonsterSkillTemplate('boss_blink_adjacent')
    expect(tmpl?.label).toBe('Мгновенный рывок')
    expect(tmpl?.kind).toBe('utility')
    expect(tmpl?.tags).toContain('mobility')
  })

  it('all templates have stat scaling fields', () => {
    for (const tmpl of Object.values(MONSTER_SKILL_TEMPLATES)) {
      expect(tmpl.statSource).toBeTruthy()
      expect(tmpl.scaleToken).toMatch(/^\d+%%$/)
      expect(typeof tmpl.skillFlat).toBe('number')
      expect(tmpl.tags.length).toBeGreaterThan(0)
      expect(tmpl.semanticEmojiId).toBeTruthy()
    }
  })

  it('hero templates still resolve from CARD_ATTACK_TEMPLATES', () => {
    expect(getCardAttackTemplate('strike')?.kind).toBe('melee')
    expect(getCardAttackTemplate('fireball')?.kind).toBe('aoe')
  })
})
