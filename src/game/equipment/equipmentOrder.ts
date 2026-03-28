import type { EquipmentSlot } from '../types'

/** Порядок бросков Memento за победу и обхода слотов. */
export const EQUIPMENT_ROLL_ORDER: readonly EquipmentSlot[] = [
  'weapon',
  'armor',
  'accessory',
]

export const EMPTY_EQUIPMENT: Record<EquipmentSlot, string | null> = {
  weapon: null,
  armor: null,
  accessory: null,
}

export function occupiedEquipmentSlotsInOrder(
  equipment: Record<EquipmentSlot, string | null>,
): { slot: EquipmentSlot; itemId: string }[] {
  const out: { slot: EquipmentSlot; itemId: string }[] = []
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    const id = equipment[slot]
    if (id !== null) out.push({ slot, itemId: id })
  }
  return out
}
