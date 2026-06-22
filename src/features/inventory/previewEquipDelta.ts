import type { ItemTemplate } from '../../game/content/itemTemplates'
import {
  aggregateGearCardLevelBonus,
} from '../../game/equipment/aggregates'
import { computeGearStatBonuses } from '../../game/stats/effectiveStats'
import { getCharacter } from '../../game/character/selectors'
import type { CampaignState, EquipmentSlot } from '../../game/types'

export type EquipDelta = { deltaHp: number; deltaCardLevel: number }

export function previewEquipDelta(
  campaign: CampaignState,
  characterId: string,
  itemId: string,
  slot: EquipmentSlot,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): EquipDelta | null {
  const hero = getCharacter(campaign, characterId)
  if (!hero) return null
  const item = hero.items.find((i) => i.id === itemId)
  if (!item) return null
  const tmpl = getTemplate(item.templateId)
  if (!tmpl || tmpl.slot !== slot) return null

  const beforeHp = computeGearStatBonuses(hero.items, hero.equipment, getTemplate).health ?? 0
  const beforeCard = aggregateGearCardLevelBonus(
    hero.items,
    hero.equipment,
    getTemplate,
  )

  const nextEquipment = { ...hero.equipment, [slot]: itemId }
  const afterHp = computeGearStatBonuses(hero.items, nextEquipment, getTemplate).health ?? 0
  const afterCard = aggregateGearCardLevelBonus(hero.items, nextEquipment, getTemplate)

  return {
    deltaHp: afterHp - beforeHp,
    deltaCardLevel: afterCard - beforeCard,
  }
}
