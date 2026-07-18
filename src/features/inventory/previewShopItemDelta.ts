import type { ItemTemplate } from '../../game/content/itemTemplates'
import {
  aggregateGearDamageMult,
} from '../../game/equipment/aggregates'
import { getCharacter } from '../../game/character/selectors'
import { computeCharacterMaxHp } from '../../game/stats/effectiveStats'
import type { CampaignState, ItemInstance } from '../../game/types'
import type { EquipDelta } from './previewEquipDelta'

export function previewShopItemEquipDelta(
  campaign: CampaignState,
  characterId: string,
  templateId: string,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): EquipDelta | null {
  const hero = getCharacter(campaign, characterId)
  const tmpl = getTemplate(templateId)
  if (!hero || !tmpl) return null

  const previewItem: ItemInstance = {
    id: '__shop_preview__',
    templateId,
    itemLevel: 1,
    modSlots: [],
  }
  const slot = tmpl.slot
  const prevEquippedId = hero.equipment[slot]
  const prevItem = prevEquippedId
    ? hero.items.find((i) => i.id === prevEquippedId)
    : undefined

  const itemsWithoutSlot = hero.items.filter((i) => i.id !== prevEquippedId)
  const itemsWithPreview = prevItem
    ? [...itemsWithoutSlot, previewItem]
    : [...hero.items, previewItem]

  const worldPower = campaign.worldPower
  const beforeHp = computeCharacterMaxHp(hero, worldPower, getTemplate)
  const beforeMult = aggregateGearDamageMult(hero.items, hero.equipment, getTemplate)

  const nextEquipment = { ...hero.equipment, [slot]: previewItem.id }
  const previewHero = { ...hero, items: itemsWithPreview, equipment: nextEquipment }
  const afterHp = computeCharacterMaxHp(previewHero, worldPower, getTemplate)
  const afterMult = aggregateGearDamageMult(itemsWithPreview, nextEquipment, getTemplate)

  return {
    deltaMaxHp: afterHp - beforeHp,
    deltaDamageMult: afterMult - beforeMult,
  }
}
