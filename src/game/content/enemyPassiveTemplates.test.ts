import { describe, expect, it } from 'vitest'
import type { PassiveTrigger } from './passiveTemplates'
import { PASSIVE_TEMPLATE_IDS, getPassiveTemplate } from './passiveTemplates'
import {
  ENEMY_PASSIVE_TEMPLATE_IDS,
  ENEMY_PASSIVE_TEMPLATES,
  getEnemyPassiveTemplate,
} from './enemyPassiveTemplates'

const EXPECTED_IDS = [
  'enemy_anti_heal_aura',
  'enemy_anti_mana',
  'enemy_rage_trait',
  'enemy_holy_ward',
  'enemy_thorns',
  'enemy_dark_affinity',
  'boss_ignore_armor',
  'boss_ranged_ward',
  'boss_no_flank',
  'boss_reflect_rage',
] as const

const VALID_TRIGGERS: readonly PassiveTrigger[] = [
  'on_strike',
  'on_card_attack',
  'on_card_heal',
  'on_regen_tick',
  'on_damaged',
  'on_move',
  'on_turn_start',
  'on_kill',
]

describe('enemyPassiveTemplates', () => {
  it('exports exactly 10 enemy and boss passive templates', () => {
    expect(ENEMY_PASSIVE_TEMPLATE_IDS).toHaveLength(10)
    expect(Object.keys(ENEMY_PASSIVE_TEMPLATES)).toHaveLength(10)
    for (const id of EXPECTED_IDS) {
      expect(ENEMY_PASSIVE_TEMPLATES[id]).toBeDefined()
    }
  })

  it('each template has valid levelTrigger and descriptionRu', () => {
    for (const tmpl of Object.values(ENEMY_PASSIVE_TEMPLATES)) {
      expect(VALID_TRIGGERS).toContain(tmpl.levelTrigger)
      expect(tmpl.descriptionRu.trim().length).toBeGreaterThan(0)
      expect(tmpl.label.trim().length).toBeGreaterThan(0)
      expect(tmpl.semanticEmojiId.trim().length).toBeGreaterThan(0)
    }
  })

  it('getPassiveTemplate merges enemy pool like card lookup', () => {
    expect(getPassiveTemplate('enemy_thorns')?.label).toBe('Шипы')
    expect(getPassiveTemplate('boss_no_flank')?.label).toBe('Без фланга')
    expect(getEnemyPassiveTemplate('enemy_anti_heal_aura')?.levelTrigger).toBe('on_turn_start')
  })

  it('hero passive pool stays at 32 templates', () => {
    expect(PASSIVE_TEMPLATE_IDS).toHaveLength(32)
    expect(PASSIVE_TEMPLATE_IDS).not.toContain('enemy_thorns')
  })
})
