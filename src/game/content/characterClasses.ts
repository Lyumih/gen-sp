import type { EquipmentSlot } from '../types'

export type CharacterClassTemplate = {
  id: string
  label: string
  initiativeBase: number
  hirePrice: number
  gearPool: { slot: EquipmentSlot; templateId: string; weight: number }[]
}

export const CHARACTER_CLASSES: Readonly<Record<string, CharacterClassTemplate>> = {
  warrior: {
    id: 'warrior',
    label: 'Воин',
    initiativeBase: 10,
    hirePrice: 25,
    gearPool: [
      { slot: 'weapon', templateId: 'wooden_sword', weight: 3 },
      { slot: 'armor', templateId: 'leather_armor', weight: 2 },
      { slot: 'accessory', templateId: 'copper_ring', weight: 1 },
    ],
  },
  ranger: {
    id: 'ranger',
    label: 'Лучник',
    initiativeBase: 12,
    hirePrice: 30,
    gearPool: [
      { slot: 'weapon', templateId: 'wooden_sword', weight: 2 },
      { slot: 'armor', templateId: 'leather_armor', weight: 1 },
      { slot: 'accessory', templateId: 'copper_ring', weight: 2 },
    ],
  },
}

export const CHARACTER_CLASS_IDS: readonly string[] = Object.keys(CHARACTER_CLASSES)

export function getCharacterClass(classId: string): CharacterClassTemplate | undefined {
  return CHARACTER_CLASSES[classId]
}
