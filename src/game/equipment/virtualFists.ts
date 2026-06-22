import type { ItemInstance, ModSlotState } from '../types'

/** Template id for unarmed strikes — not persisted in save. */
export const VIRTUAL_FISTS_TEMPLATE_ID = 'virtual_fists' as const

export type StrikeWeaponChannel = {
  templateId: string
  itemLevel: number
  modSlots: readonly ModSlotState[]
  /** Equipped weapon item id, or null for virtual fists. */
  itemId: string | null
}

export const VIRTUAL_FISTS: StrikeWeaponChannel = {
  templateId: VIRTUAL_FISTS_TEMPLATE_ID,
  itemLevel: 0,
  modSlots: [],
  itemId: null,
}

/** Resolves equipped weapon or virtual fists for strike damage and mods. */
export function resolveStrikeWeaponChannel(
  equipmentWeaponId: string | null,
  items: readonly ItemInstance[],
): StrikeWeaponChannel {
  if (equipmentWeaponId === null) return VIRTUAL_FISTS
  const item = items.find((i) => i.id === equipmentWeaponId)
  if (!item) return VIRTUAL_FISTS
  return {
    templateId: item.templateId,
    itemLevel: item.itemLevel,
    modSlots: item.modSlots,
    itemId: item.id,
  }
}
