import { describe, expect, it } from 'vitest'
import { buildItemsWithStashOrder, sortStashIdsByLevel, sortStashIdsBySlot } from './stashOrder'
import { getItemTemplate } from '../content/itemTemplates'
import type { ItemInstance } from '../types'

const items: ItemInstance[] = [
  { id: 'a', templateId: 'wooden_sword', itemLevel: 1 },
  { id: 'b', templateId: 'leather_armor', itemLevel: 2 },
]
const equipment = { weapon: 'a', armor: null, accessory: null }

describe('buildItemsWithStashOrder', () => {
  it('places equipped first in roll order then stash ids', () => {
    const next = buildItemsWithStashOrder(items, equipment, ['b'])
    expect(next?.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('returns null when stash ids invalid', () => {
    expect(buildItemsWithStashOrder(items, equipment, ['x'])).toBeNull()
  })
})

describe('sortStashIdsBySlot', () => {
  it('orders weapon before armor', () => {
    const stash: ItemInstance[] = [
      { id: 'b', templateId: 'leather_armor', itemLevel: 1 },
      { id: 'a', templateId: 'wooden_sword', itemLevel: 1 },
    ]
    expect(sortStashIdsBySlot(stash, getItemTemplate)).toEqual(['a', 'b'])
  })
})

describe('sortStashIdsByLevel', () => {
  it('orders higher level first', () => {
    const stash: ItemInstance[] = [
      { id: 'a', templateId: 'wooden_sword', itemLevel: 1 },
      { id: 'b', templateId: 'leather_armor', itemLevel: 3 },
    ]
    expect(sortStashIdsByLevel(stash)).toEqual(['b', 'a'])
  })
})
