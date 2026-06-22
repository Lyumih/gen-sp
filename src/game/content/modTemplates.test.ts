import { describe, expect, it } from 'vitest'
import { filterModsForCarrier } from '../memento/modOffers'
import { resolveCarrierTags } from '../mods/carrierTags'
import {
  MOD_OFFER_POOL,
  MOD_TEMPLATES,
  SPEC_MOD_IDS,
  getModTemplate,
} from './modTemplates'

describe('modTemplates catalog', () => {
  it('includes every spec §4.3 mod id', () => {
    for (const id of SPEC_MOD_IDS) {
      expect(MOD_TEMPLATES[id], `missing mod template ${id}`).toBeDefined()
      expect(getModTemplate(id)?.id).toBe(id)
    }
  })

  it('gives each spec mod requires, ops, and group', () => {
    for (const id of SPEC_MOD_IDS) {
      const mod = MOD_TEMPLATES[id]!
      expect(mod.group, `${id} group`).toBeTruthy()
      expect(mod.requires.length, `${id} requires`).toBeGreaterThan(0)
      expect(mod.ops.length, `${id} ops`).toBeGreaterThan(0)
    }
  })

  it('excludes mod-mana-save from offer pool', () => {
    expect(MOD_OFFER_POOL).toHaveLength(SPEC_MOD_IDS.length - 1)
    expect(MOD_OFFER_POOL.some((m) => m.id === 'mod-mana-save')).toBe(false)
    expect(MOD_TEMPLATES['mod-mana-save']?.enabled).toBe(false)
  })

  it('keeps legacy kill_reward for migration bridge', () => {
    expect(getModTemplate('kill_reward')).toBeDefined()
    expect(getModTemplate('kill_reward')?.enabled).toBe(false)
  })
})

describe('filterModsForCarrier with MOD_OFFER_POOL', () => {
  it('returns mod-heal-up for heal card, not mod-weapon-damage', () => {
    const healTags = resolveCarrierTags('card', 'heal')
    const filtered = filterModsForCarrier(MOD_OFFER_POOL, healTags, [])
    expect(filtered.map((m) => m.id)).toContain('mod-heal-up')
    expect(filtered.map((m) => m.id)).not.toContain('mod-weapon-damage')
  })

  it('returns mod-weapon-damage for weapon, not mod-heal-up', () => {
    const weaponTags = resolveCarrierTags('item', 'wooden_sword')
    const filtered = filterModsForCarrier(MOD_OFFER_POOL, weaponTags, [])
    expect(filtered.map((m) => m.id)).toContain('mod-weapon-damage')
    expect(filtered.map((m) => m.id)).not.toContain('mod-heal-up')
  })
})
