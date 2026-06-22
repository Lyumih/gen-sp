import { describe, expect, it } from 'vitest'
import { resolveCarrierTags } from './carrierTags'

describe('resolveCarrierTags', () => {
  it('strike card has no mod carrier tags', () => {
    expect(resolveCarrierTags('card', 'strike')).toEqual([])
  })

  it('fireball card tags skill, ranged, aoe, attack', () => {
    expect(resolveCarrierTags('card', 'fireball')).toEqual([
      'skill',
      'ranged',
      'aoe',
      'attack',
    ])
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
})
