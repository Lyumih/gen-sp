import { describe, expect, it } from 'vitest'
import type { ItemInstance } from '../../../game/types'
import { totalSellPriceForIds } from './shopSellUtils'

const stash: ItemInstance[] = [
  { id: 'a', templateId: 'leather_armor', itemLevel: 1, modSlots: [] },
  { id: 'b', templateId: 'wooden_sword', itemLevel: 1, modSlots: [] },
]

describe('totalSellPriceForIds', () => {
  it('sums sell prices for selected ids', () => {
    const sum = totalSellPriceForIds(new Set(['a', 'b']), stash)
    expect(sum).toBeGreaterThan(0)
  })

  it('ignores unknown ids', () => {
    expect(totalSellPriceForIds(new Set(['missing']), stash)).toBe(0)
  })
})
