import { describe, expect, it } from 'vitest'
import type { ModTemplate } from '../content/modTemplates'
import { filterModsForCarrier, generateOffer } from './modOffers'

function testMod(partial: Pick<ModTemplate, 'id' | 'requires'> & Partial<ModTemplate>): ModTemplate {
  return {
    label: partial.id,
    group: 'utility',
    tags: [],
    descriptionLines: [],
    ops: [],
    ...partial,
  }
}

const TEST_POOL: readonly ModTemplate[] = [
  testMod({ id: 'mod-heal-up', label: 'Heal', requires: ['heal'], group: 'survival' }),
  testMod({
    id: 'mod-weapon-damage',
    label: 'Weapon dmg',
    requires: ['weapon', 'attack'],
    group: 'damage',
  }),
  testMod({
    id: 'mod-aoe-size',
    label: 'AoE size',
    requires: ['aoe'],
    excludes: ['melee'],
    group: 'utility',
  }),
  testMod({ id: 'mod-damage-up', label: 'Damage', requires: ['attack'], group: 'damage' }),
]

describe('filterModsForCarrier', () => {
  it('includes heal mod for heal carrier tags, not weapon mod', () => {
    const healTags = ['skill', 'heal'] as const
    const filtered = filterModsForCarrier(TEST_POOL, healTags, [])
    expect(filtered.map((m) => m.id)).toContain('mod-heal-up')
    expect(filtered.map((m) => m.id)).not.toContain('mod-weapon-damage')
  })

  it('includes weapon mod for weapon carrier tags, not heal mod', () => {
    const weaponTags = ['weapon', 'attack', 'melee'] as const
    const filtered = filterModsForCarrier(TEST_POOL, weaponTags, [])
    expect(filtered.map((m) => m.id)).toContain('mod-weapon-damage')
    expect(filtered.map((m) => m.id)).not.toContain('mod-heal-up')
  })

  it('excludes mod when carrier has excluded tag', () => {
    const meleeTags = ['skill', 'attack', 'melee'] as const
    const filtered = filterModsForCarrier(TEST_POOL, meleeTags, [])
    expect(filtered.map((m) => m.id)).not.toContain('mod-aoe-size')
  })

  it('excludes mods already occupying other slots', () => {
    const attackTags = ['skill', 'attack', 'aoe', 'ranged'] as const
    const filtered = filterModsForCarrier(TEST_POOL, attackTags, ['mod-damage-up'])
    expect(filtered.map((m) => m.id)).not.toContain('mod-damage-up')
    expect(filtered.map((m) => m.id)).toContain('mod-aoe-size')
  })
})

describe('generateOffer', () => {
  const fireballTags = ['skill', 'ranged', 'aoe', 'attack'] as const

  it('returns deterministic 3 mod ids for same seed', () => {
    const a = generateOffer(TEST_POOL, fireballTags, [], 0, 4242)
    const b = generateOffer(TEST_POOL, fireballTags, [], 0, 4242)
    expect(a).toEqual(b)
    expect(a.modIds).toHaveLength(3)
    expect(a.rollSeed).toBe(4242)
  })

  it('repeats sole eligible mod three times when pool filters to one', () => {
    const healOnlyPool: ModTemplate[] = [
      testMod({ id: 'mod-heal-up', label: 'Heal', requires: ['heal'], group: 'survival' }),
    ]
    const healTags = ['skill', 'heal'] as const
    const offer = generateOffer(healOnlyPool, healTags, [], 0, 99)
    expect(offer.modIds).toEqual(['mod-heal-up', 'mod-heal-up', 'mod-heal-up'])
  })
})
