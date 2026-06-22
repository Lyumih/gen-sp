import { getItemTemplate } from '../../game/content/itemTemplates'
import { EQUIPMENT_ROLL_ORDER } from '../../game/equipment/equipmentOrder'
import { getPrimaryCharacter } from '../../game/campaign/selectors'
import type { CampaignState, EquipmentSlot, ItemInstance } from '../../game/types'

export const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
}

export function getStashItems(campaign: CampaignState): ItemInstance[] {
  const hero = getPrimaryCharacter(campaign)
  const equippedIds = new Set(
    EQUIPMENT_ROLL_ORDER.map((s) => hero.equipment[s]).filter(
      (id): id is string => id !== null,
    ),
  )
  return hero.items.filter((i) => !equippedIds.has(i.id))
}

export function itemsSelectableForSlot(
  campaign: CampaignState,
  slot: EquipmentSlot,
): ItemInstance[] {
  const hero = getPrimaryCharacter(campaign)
  return hero.items.filter((i) => {
    const t = getItemTemplate(i.templateId)
    if (!t || t.slot !== slot) return false
    for (const s of EQUIPMENT_ROLL_ORDER) {
      if (hero.equipment[s] === i.id && s !== slot) return false
    }
    return true
  })
}

export function isBattleContextActive(campaign: CampaignState): boolean {
  return (
    campaign.expedition !== null ||
    campaign.battle !== null ||
    campaign.phase === 'inter_battle' ||
    campaign.phase === 'battle'
  )
}

export type CampaignHubTab = 'character' | 'battle' | 'shop' | 'codex' | 'tavern'
