import type { ItemTemplate } from '../../game/content/itemTemplates'
import {
  aggregateGearCardLevelBonus,
  aggregateGearHpBonus,
} from '../../game/equipment/aggregates'
import type { CampaignState, EquipmentSlot } from '../../game/types'

export type EquipDelta = { deltaHp: number; deltaCardLevel: number }

export function previewEquipDelta(
  campaign: CampaignState,
  itemId: string,
  slot: EquipmentSlot,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): EquipDelta | null {
  const item = campaign.items.find((i) => i.id === itemId)
  if (!item) return null
  const tmpl = getTemplate(item.templateId)
  if (!tmpl || tmpl.slot !== slot) return null

  const beforeHp = aggregateGearHpBonus(campaign.items, campaign.equipment, getTemplate)
  const beforeCard = aggregateGearCardLevelBonus(
    campaign.items,
    campaign.equipment,
    getTemplate,
  )

  const nextEquipment = { ...campaign.equipment, [slot]: itemId }
  const afterHp = aggregateGearHpBonus(campaign.items, nextEquipment, getTemplate)
  const afterCard = aggregateGearCardLevelBonus(campaign.items, nextEquipment, getTemplate)

  return {
    deltaHp: afterHp - beforeHp,
    deltaCardLevel: afterCard - beforeCard,
  }
}
