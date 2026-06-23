import type { EquipmentSlot } from '../../../game/types'

export type StashTabKey = 'items' | 'cards' | 'passives' | 'chest'

export type LoadoutFocus =
  | { kind: 'equip'; slot: EquipmentSlot }
  | { kind: 'card'; slotIndex: 0 | 1 | 2 | 3 }
  | { kind: 'passive'; slotIndex: 0 | 1 | 2 | 3 | 4 }
  | null
