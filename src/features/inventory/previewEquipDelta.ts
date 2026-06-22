import type { ItemTemplate } from '../../game/content/itemTemplates'
import {
  aggregateGearCardLevelBonus,
  aggregateGearHpBonus,
} from '../../game/equipment/aggregates'
import { getPrimaryCharacter } from '../../game/campaign/selectors'
import type { CampaignState, EquipmentSlot } from '../../game/types'

export type EquipDelta = { deltaHp: number; deltaCardLevel: number }

export function previewEquipDelta(
  campaign: CampaignState,
  itemId: string,
  slot: EquipmentSlot,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): EquipDelta | null {
  const hero = getPrimaryCharacter(campaign)
  const item = hero.items.find((i) => i.id === itemId)
  if (!item) return null
  const tmpl = getTemplate(item.templateId)
  if (!tmpl || tmpl.slot !== slot) return null

  const beforeHp = aggregateGearHpBonus(hero.items, hero.equipment, getTemplate)
  const beforeCard = aggregateGearCardLevelBonus(
    hero.items,
    hero.equipment,
    getTemplate,
  )

  const nextEquipment = { ...hero.equipment, [slot]: itemId }
  const afterHp = aggregateGearHpBonus(hero.items, nextEquipment, getTemplate)
  const afterCard = aggregateGearCardLevelBonus(hero.items, nextEquipment, getTemplate)

  return {
    deltaHp: afterHp - beforeHp,
    deltaCardLevel: afterCard - beforeCard,
  }
}
