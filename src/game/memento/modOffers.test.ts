import { describe, expect, it } from 'vitest'
import type { ModTemplate } from '../content/modTemplates'
import { filterModsForCarrier, generateOffer } from './modOffers'

const TEST_POOL: readonly ModTemplate[] = [
  {
    id: 'mod-heal-up',
    label: 'Heal',
    descriptionLines: [],
    requires: ['heal'],
  },
  {
    id: 'mod-weapon-damage',
    label: 'Weapon dmg',
    descriptionLines: [],
    requires: ['weapon', 'attack'],
  },
  {
    id: 'mod-aoe-size',
    label: 'AoE size',
    descriptionLines: [],
    requires: ['aoe'],
    excludes: ['melee'],
  },
  {
    id: 'mod-damage-up',
    label: 'Damage',
    descriptionLines: [],
    requires: ['attack'],
  },
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
      {
        id: 'mod-heal-up',
        label: 'Heal',
        descriptionLines: [],
        requires: ['heal'],
      },
    ]
    const healTags = ['skill', 'heal'] as const
    const offer = generateOffer(healOnlyPool, healTags, [], 0, 99)
    expect(offer.modIds).toEqual(['mod-heal-up', 'mod-heal-up', 'mod-heal-up'])
  })
})
