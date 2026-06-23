import { describe, expect, it } from 'vitest'
import { seededRng } from '../tavern/generateCandidates'
import { generateShopOffers, SHOP_ITEM_SLOT_COUNT } from './generateShopOffers'

describe('generateShopOffers', () => {
  it('returns 5 unique item offers by default', () => {
    const offers = generateShopOffers(seededRng(42), {
      battleDropChance: 0,
      shopSkillOfferChance: 0,
      shopSkillPrice: 100,
      shopRefreshCost: 10,
    })
    const items = offers.filter((o) => o.kind === 'item')
    expect(items).toHaveLength(SHOP_ITEM_SLOT_COUNT)
    const ids = items.map((o) => o.templateId)
    expect(new Set(ids).size).toBe(SHOP_ITEM_SLOT_COUNT)
  })

  it('may append skill offer when roll succeeds', () => {
    const offers = generateShopOffers(seededRng(1), {
      battleDropChance: 0,
      shopSkillOfferChance: 1,
      shopSkillPrice: 100,
      shopRefreshCost: 10,
    })
    expect(offers.some((o) => o.kind === 'skill')).toBe(true)
    expect(offers.length).toBe(SHOP_ITEM_SLOT_COUNT + 1)
  })
})
