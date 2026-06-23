import { describe, expect, it } from 'vitest'
import { filterModsForCarrier } from '../memento/modOffers'
import { afterCarrierLevelChange } from '../memento/carrierLevelChange'
import { resolveCarrierTags } from '../mods/carrierTags'
import { MOD_OFFER_POOL } from './modTemplates'
import {
  PASSIVE_MOD_OFFER_POOL,
  PASSIVE_MOD_TEMPLATES,
  getPassiveModTemplate,
} from './passiveModTemplates'

const IDS = [
  'pmod-flat-up',
  'pmod-pct-up',
  'pmod-proc-up',
  'pmod-move-range',
  'pmod-heal-splash-up',
  'pmod-counter-up',
  'pmod-regen-up',
  'pmod-reflect-up',
  'pmod-lifesteal-up',
  'pmod-range-up',
  'pmod-thorns',
  'pmod-initiative',
] as const

const PASSIVE_FRIENDLY_REQUIRES = new Set([
  'passive',
  'stat_flat',
  'stat_pct',
  'proc',
  'on_move',
  'heal_proc',
  'counter_proc',
  'on_regen_tick',
  'reflect',
  'lifesteal',
  'range_passive',
  'on_damaged',
])

const ACTIVE_CARD_REQUIRES = new Set([
  'skill',
  'attack',
  'melee',
  'ranged',
  'aoe',
  'weapon',
  'armor',
  'accessory',
  'heal',
  'regen',
  'active_card',
])

describe('passiveModTemplates catalog', () => {
  it('includes all 12 spec passive mod ids', () => {
    expect(PASSIVE_MOD_TEMPLATES).toHaveLength(12)
    for (const id of IDS) {
      expect(getPassiveModTemplate(id), `missing passive mod ${id}`).toBeDefined()
      expect(getPassiveModTemplate(id)?.id).toBe(id)
    }
  })

  it('uses only passive-friendly requires tags', () => {
    for (const id of IDS) {
      const mod = getPassiveModTemplate(id)!
      expect(mod.requires.length, `${id} requires`).toBeGreaterThan(0)
      for (const tag of mod.requires) {
        expect(PASSIVE_FRIENDLY_REQUIRES.has(tag), `${id} requires ${tag}`).toBe(true)
        expect(ACTIVE_CARD_REQUIRES.has(tag), `${id} must not require ${tag}`).toBe(false)
      }
    }
  })

  it('gives each passive mod ops and group', () => {
    for (const id of IDS) {
      const mod = getPassiveModTemplate(id)!
      expect(mod.group, `${id} group`).toBeTruthy()
      expect(mod.ops.length, `${id} ops`).toBeGreaterThan(0)
    }
  })

  it('exposes all enabled mods in offer pool', () => {
    expect(PASSIVE_MOD_OFFER_POOL).toHaveLength(12)
    for (const id of IDS) {
      expect(PASSIVE_MOD_OFFER_POOL.some((m) => m.id === id)).toBe(true)
    }
  })

  it('does not overlap card mod offer pool ids', () => {
    const cardIds = new Set(MOD_OFFER_POOL.map((m) => m.id))
    for (const id of IDS) {
      expect(cardIds.has(id)).toBe(false)
    }
  })
})

describe('resolveCarrierTags for passives', () => {
  it('tags stat_flat passive', () => {
    const tags = resolveCarrierTags('passive', 'warrior_fortitude')
    expect(tags).toContain('passive')
    expect(tags).toContain('stat_flat')
    expect(tags).toContain('on_damaged')
  })

  it('tags heal_proc on splash heal passive', () => {
    const tags = resolveCarrierTags('passive', 'healer_splash_heal')
    expect(tags).toContain('passive')
    expect(tags).toContain('proc')
    expect(tags).toContain('heal_proc')
  })

  it('tags counter_proc on riposte', () => {
    const tags = resolveCarrierTags('passive', 'warrior_riposte')
    expect(tags).toContain('counter_proc')
    expect(tags).toContain('proc')
    expect(tags).toContain('on_damaged')
  })

  it('tags reflect on holy reflect, not evasion veil', () => {
    expect(resolveCarrierTags('passive', 'paladin_holy_reflect')).toContain('reflect')
    expect(resolveCarrierTags('passive', 'rogue_smoke_veil')).not.toContain('reflect')
  })

  it('tags lifesteal passive', () => {
    expect(resolveCarrierTags('passive', 'warlock_life_tap')).toContain('lifesteal')
  })

  it('tags range_passive on far sight', () => {
    const tags = resolveCarrierTags('passive', 'ranger_far_sight')
    expect(tags).toContain('range_passive')
    expect(tags).toContain('on_move')
  })

  it('tags on_regen_tick trigger', () => {
    expect(resolveCarrierTags('passive', 'healer_vitality')).toContain('on_regen_tick')
  })
})

describe('filterModsForCarrier with PASSIVE_MOD_OFFER_POOL', () => {
  it('offers pmod-flat-up for stat_flat passive, not pmod-pct-up', () => {
    const tags = resolveCarrierTags('passive', 'warrior_fortitude')
    const filtered = filterModsForCarrier(PASSIVE_MOD_OFFER_POOL, tags, [])
    expect(filtered.map((m) => m.id)).toContain('pmod-flat-up')
    expect(filtered.map((m) => m.id)).not.toContain('pmod-pct-up')
    expect(filtered.map((m) => m.id)).toContain('pmod-initiative')
  })

  it('offers pmod-counter-up for riposte, not card mods', () => {
    const tags = resolveCarrierTags('passive', 'warrior_riposte')
    const filtered = filterModsForCarrier(PASSIVE_MOD_OFFER_POOL, tags, [])
    expect(filtered.map((m) => m.id)).toContain('pmod-counter-up')
    expect(filtered.map((m) => m.id)).not.toContain('mod-damage-up')
  })
})

describe('afterCarrierLevelChange for passives', () => {
  it('uses passive mod pool when kind is passive', () => {
    const carrier = {
      global_level: 49,
      modSlots: [{ status: 'locked' as const }],
    }
    const next = afterCarrierLevelChange(
      carrier,
      'passive',
      'warrior_fortitude',
      50,
      42,
    )
    const offer = next.modSlots[0]
    expect(offer?.status).toBe('empty')
    if (offer?.status !== 'empty') return
    for (const modId of offer.offer.modIds) {
      expect(PASSIVE_MOD_OFFER_POOL.some((m) => m.id === modId)).toBe(true)
      expect(MOD_OFFER_POOL.some((m) => m.id === modId)).toBe(false)
    }
  })
})
