import { getItemTemplate } from '../../game/content/itemTemplates'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import type { CampaignState, EquipmentSlot, ItemInstance } from '../../game/types'

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
}

export function getStashItems(campaign: CampaignState): ItemInstance[] {
  const equippedIds = new Set(
    EQUIPMENT_ROLL_ORDER.map((s) => campaign.equipment[s]).filter(
      (id): id is string => id !== null,
    ),
  )
  return campaign.items.filter((i) => !equippedIds.has(i.id))
}

export function itemsSelectableForSlot(
  campaign: CampaignState,
  slot: EquipmentSlot,
): ItemInstance[] {
  return campaign.items.filter((i) => {
    const t = getItemTemplate(i.templateId)
    if (!t || t.slot !== slot) return false
    for (const s of EQUIPMENT_ROLL_ORDER) {
      if (campaign.equipment[s] === i.id && s !== slot) return false
    }
    return true
  })
}

export type CampaignHubTab = 'character' | 'battle' | 'shop' | 'codex'
