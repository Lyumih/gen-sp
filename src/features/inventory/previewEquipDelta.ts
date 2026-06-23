import type { ItemTemplate } from '../../game/content/itemTemplates'
import {
  aggregateGearDamageMult,
} from '../../game/equipment/aggregates'
import { computeCharacterMaxHp } from '../../game/stats/effectiveStats'
import { getCharacter } from '../../game/character/selectors'
import type { CampaignState, EquipmentSlot } from '../../game/types'

export type EquipDelta = { deltaMaxHp: number; deltaDamageMult: number }

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

  const worldPower = campaign.worldPower
  const beforeHp = computeCharacterMaxHp(hero, worldPower, getTemplate)
  const nextEquipment = { ...hero.equipment, [slot]: itemId }
  const afterHp = computeCharacterMaxHp({ ...hero, equipment: nextEquipment }, worldPower, getTemplate)
  const beforeMult = aggregateGearDamageMult(hero.items, hero.equipment, getTemplate)
  const afterMult = aggregateGearDamageMult(hero.items, nextEquipment, getTemplate)

  return {
    deltaMaxHp: afterHp - beforeHp,
    deltaDamageMult: afterMult - beforeMult,
  }
}
