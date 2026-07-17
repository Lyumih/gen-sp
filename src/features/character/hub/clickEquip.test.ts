import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../../../game/campaign/runReducer'
import {
  firstEmptyCardSlot,
  firstEmptyPassiveSlot,
  resolveItemClickEquip,
} from './clickEquip'

describe('resolveItemClickEquip', () => {
  it('equips to template slot when no focus', () => {
    const campaign = initialCampaignState()
    const heroId = campaign.characters[0]!.id
    const itemId = campaign.characters[0]!.items[0]?.id
    if (!itemId) return
    const result = resolveItemClickEquip(campaign, heroId, itemId, null)
    expect(result.type).toBe('equip')
  })

  it('rejects wrong slot when focus mismatches', () => {
    let campaign = initialCampaignState()
    const heroId = campaign.characters[0]!.id
    campaign = applyRunAction(campaign, {
      type: 'BUY_SHOP_OFFER',
      offerIndex: 0,
    })
    const weapon = campaign.characters[0]!.items.find((i) => {
      const t = i.templateId
      return t.includes('sword') || t.includes('weapon')
    })
    if (!weapon) return
    const result = resolveItemClickEquip(campaign, heroId, weapon.id, {
      kind: 'equip',
      slot: 'armor',
    })
    expect(result).toEqual({ type: 'invalid', reason: 'wrong_slot' })
  })
})

describe('firstEmptyCardSlot', () => {
  it('returns first null slot in battleLoadout', () => {
    const campaign = initialCampaignState()
    const heroId = campaign.characters[0]!.id
    expect(firstEmptyCardSlot(campaign, heroId)).toBe(1)

    const empty = {
      ...campaign,
      characters: campaign.characters.map((c) =>
        c.id === heroId
          ? { ...c, battleLoadout: [null, null, null, null] as typeof c.battleLoadout }
          : c,
      ),
    }
    expect(firstEmptyCardSlot(empty, heroId)).toBe(0)

    const withCard = {
      ...campaign,
      characters: campaign.characters.map((c) =>
        c.id === heroId
          ? { ...c, battleLoadout: ['c1', null, null, null] as typeof c.battleLoadout }
          : c,
      ),
    }
    expect(firstEmptyCardSlot(withCard, heroId)).toBe(1)

    const full = {
      ...campaign,
      characters: campaign.characters.map((c) =>
        c.id === heroId
          ? {
              ...c,
              battleLoadout: ['c1', 'c2', 'c3', 'c4'] as typeof c.battleLoadout,
            }
          : c,
      ),
    }
    expect(firstEmptyCardSlot(full, heroId)).toBeNull()
  })
})

describe('firstEmptyPassiveSlot', () => {
  it('returns first null slot in passiveEquip', () => {
    const campaign = initialCampaignState()
    const heroId = campaign.characters[0]!.id
    expect(firstEmptyPassiveSlot(campaign, heroId)).toBe(0)

    const withPassive = {
      ...campaign,
      characters: campaign.characters.map((c) =>
        c.id === heroId
          ? { ...c, passiveEquip: ['p1', null, null, null, null] as typeof c.passiveEquip }
          : c,
      ),
    }
    expect(firstEmptyPassiveSlot(withPassive, heroId)).toBe(1)
  })
})
