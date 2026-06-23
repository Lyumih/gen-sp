import { describe, expect, it } from 'vitest'
import { resolveCarrierTags } from './carrierTags'

describe('resolveCarrierTags', () => {
  it('strike card has no mod carrier tags', () => {
    expect(resolveCarrierTags('card', 'strike')).toEqual([])
  })

  it('fireball card tags skill, ranged, aoe, attack', () => {
    const tags = resolveCarrierTags('card', 'fireball')
    expect(tags).toContain('skill')
    expect(tags).toContain('ranged')
    expect(tags).toContain('aoe')
    expect(tags).toContain('attack')
    expect(tags).toHaveLength(4)
  })

  it('wooden_sword item tags weapon, attack, melee', () => {
    expect(resolveCarrierTags('item', 'wooden_sword')).toEqual([
      'weapon',
      'attack',
      'melee',
    ])
  })

  it('leather_armor item tags armor', () => {
    expect(resolveCarrierTags('item', 'leather_armor')).toEqual(['armor'])
  })

  it('ranger_bow uses explicit ranged tag from template', () => {
    expect(resolveCarrierTags('item', 'ranger_bow')).toContain('ranged')
    expect(resolveCarrierTags('item', 'ranger_bow')).not.toContain('melee')
  })
})
