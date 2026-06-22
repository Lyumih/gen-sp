import type { EquipmentSlot } from '../types'

export type CharacterClassTemplate = {
  id: string
  label: string
  hirePrice: number
  gearPool: { slot: EquipmentSlot; templateId: string; weight: number }[]
}

const WARRIOR_GEAR = [
  { slot: 'weapon' as const, templateId: 'wooden_sword', weight: 3 },
  { slot: 'armor' as const, templateId: 'leather_armor', weight: 2 },
  { slot: 'accessory' as const, templateId: 'copper_ring', weight: 1 },
]

const RANGER_GEAR = [
  { slot: 'weapon' as const, templateId: 'wooden_sword', weight: 2 },
  { slot: 'armor' as const, templateId: 'leather_armor', weight: 1 },
  { slot: 'accessory' as const, templateId: 'copper_ring', weight: 2 },
]

export const CHARACTER_CLASSES: Readonly<Record<string, CharacterClassTemplate>> = {
  warrior: {
    id: 'warrior',
    label: 'Воин',
    hirePrice: 25,
    gearPool: WARRIOR_GEAR,
  },
  mage: {
    id: 'mage',
    label: 'Маг',
    hirePrice: 35,
    gearPool: RANGER_GEAR,
  },
  ranger: {
    id: 'ranger',
    label: 'Лучник',
    hirePrice: 30,
    gearPool: RANGER_GEAR,
  },
  healer: {
    id: 'healer',
    label: 'Лекарь',
    hirePrice: 32,
    gearPool: WARRIOR_GEAR,
  },
  rogue: {
    id: 'rogue',
    label: 'Разбойник',
    hirePrice: 28,
    gearPool: RANGER_GEAR,
  },
  paladin: {
    id: 'paladin',
    label: 'Паладин',
    hirePrice: 38,
    gearPool: WARRIOR_GEAR,
  },
  warlock: {
    id: 'warlock',
    label: 'Колдун',
    hirePrice: 34,
    gearPool: RANGER_GEAR,
  },
  berserker: {
    id: 'berserker',
    label: 'Берсерк',
    hirePrice: 30,
    gearPool: WARRIOR_GEAR,
  },
}

export const CHARACTER_CLASS_IDS: readonly string[] = Object.keys(CHARACTER_CLASSES)

export function getCharacterClass(classId: string): CharacterClassTemplate | undefined {
  return CHARACTER_CLASSES[classId]
}
