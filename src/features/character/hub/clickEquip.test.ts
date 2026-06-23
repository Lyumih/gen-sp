import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../../../game/campaign/runReducer'
import { resolveItemClickEquip } from './clickEquip'

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
