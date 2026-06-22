import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../../game/campaign/runReducer'
import { getPrimaryCharacter } from '../../game/campaign/selectors'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { previewEquipDelta } from './previewEquipDelta'

describe('previewEquipDelta', () => {
  it('returns hp and card level delta when equipping into empty weapon slot', () => {
    const s = applyRunAction(
      { ...initialCampaignState(), gold: 100 },
      { type: 'BUY_ITEM', templateId: 'wooden_sword' },
    )
    const itemId = getPrimaryCharacter(s).items[0]!.id
    const delta = previewEquipDelta(s, itemId, 'weapon', getItemTemplate)
    expect(delta).toEqual({ deltaHp: 0, deltaCardLevel: 1 })
  })

  it('returns null for wrong slot type', () => {
    const s = applyRunAction(
      { ...initialCampaignState(), gold: 100 },
      { type: 'BUY_ITEM', templateId: 'wooden_sword' },
    )
    expect(previewEquipDelta(s, getPrimaryCharacter(s).items[0]!.id, 'armor', getItemTemplate)).toBeNull()
  })
})
