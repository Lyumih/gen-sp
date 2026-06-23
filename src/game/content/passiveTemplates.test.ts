import { describe, expect, it } from 'vitest'
import { PASSIVE_TEMPLATE_IDS, PASSIVE_TEMPLATES, getPassiveTemplate } from './passiveTemplates'

const EXPECTED_IDS = [
  'warrior_fortitude',
  'warrior_vigor',
  'warrior_riposte',
  'warrior_battle_line',
  'mage_arcane_focus',
  'mage_mana_well',
  'mage_ignite',
  'mage_frost_ward',
  'ranger_keen_eye',
  'ranger_swiftness',
  'ranger_double_tap',
  'ranger_far_sight',
  'healer_gentle_hands',
  'healer_vitality',
  'healer_splash_heal',
  'healer_renewal',
  'rogue_precision',
  'rogue_agility',
  'rogue_venom',
  'rogue_smoke_veil',
  'paladin_aegis',
  'paladin_faith',
  'paladin_holy_reflect',
  'paladin_intercession',
  'warlock_dark_power',
  'warlock_soul_harvest',
  'warlock_spread_plague',
  'warlock_life_tap',
  'berserker_rage',
  'berserker_bloodlust',
  'berserker_twin_cleave',
  'berserker_desperation',
] as const

describe('passiveTemplates', () => {
  it('has exactly 32 enabled templates per spec', () => {
    expect(PASSIVE_TEMPLATE_IDS).toHaveLength(32)
    for (const id of EXPECTED_IDS) {
      expect(PASSIVE_TEMPLATES[id]).toBeDefined()
      expect(PASSIVE_TEMPLATES[id]?.enabled !== false).toBe(true)
    }
  })

  it('stat passives have statId and levelTrigger', () => {
    const fort = getPassiveTemplate('warrior_fortitude')!
    expect(fort.effectKind).toBe('stat_flat')
    expect(fort.statId).toBe('defense')
    expect(fort.levelTrigger).toBe('on_damaged')
  })
})
