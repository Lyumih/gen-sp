import { getItemTemplate } from '../../../game/content/itemTemplates'
import { getCharacter } from '../../../game/character/selectors'
import { EQUIPMENT_ROLL_ORDER } from '../../../game/equipment/equipmentOrder'
import { maxPassiveEquipSlots, maxSkillLoadoutSlots } from '../../../game/specialization/loadoutCaps'
import type { CampaignState, EquipmentSlot } from '../../../game/types'
import type { LoadoutFocus } from './types'

export type ClickEquipResult =
  | { type: 'equip'; slot: EquipmentSlot; itemId: string }
  | { type: 'card'; slotIndex: 0 | 1 | 2 | 3; cardId: string }
  | { type: 'passive'; slotIndex: 0 | 1 | 2 | 3 | 4; passiveId: string }
  | { type: 'invalid'; reason: string }

export function resolveItemClickEquip(
  campaign: CampaignState,
  characterId: string,
  itemId: string,
  focus: LoadoutFocus,
): ClickEquipResult {
  const hero = getCharacter(campaign, characterId)
  if (!hero) return { type: 'invalid', reason: 'no_hero' }
  const item = hero.items.find((i) => i.id === itemId)
  if (!item) return { type: 'invalid', reason: 'no_item' }
  const tmpl = getItemTemplate(item.templateId)
  if (!tmpl) return { type: 'invalid', reason: 'no_template' }

  const targetSlot: EquipmentSlot =
    focus?.kind === 'equip' ? focus.slot : tmpl.slot

  if (tmpl.slot !== targetSlot) {
    return { type: 'invalid', reason: 'wrong_slot' }
  }
  if (hero.equipment[targetSlot] === itemId) {
    return { type: 'invalid', reason: 'already_equipped' }
  }
  return { type: 'equip', slot: targetSlot, itemId }
}

export function firstEmptyEquipSlot(
  equipment: CampaignState['characters'][0]['equipment'],
): EquipmentSlot | null {
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    if (equipment[slot] === null) return slot
  }
  return null
}

export function firstEmptyCardSlot(
  campaign: CampaignState,
  characterId: string,
): 0 | 1 | 2 | 3 | null {
  const hero = getCharacter(campaign, characterId)
  if (!hero) return null
  const max = maxSkillLoadoutSlots(hero)
  for (let i = 0; i < max; i++) {
    if (hero.battleLoadout[i] === null) return i as 0 | 1 | 2 | 3
  }
  return null
}

export function firstEmptyPassiveSlot(
  campaign: CampaignState,
  characterId: string,
): 0 | 1 | 2 | 3 | 4 | null {
  const hero = getCharacter(campaign, characterId)
  if (!hero) return null
  const max = maxPassiveEquipSlots(hero)
  for (let i = 0; i < max; i++) {
    if (hero.passiveEquip[i] === null) return i as 0 | 1 | 2 | 3 | 4
  }
  return null
}
