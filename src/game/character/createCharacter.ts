import type { BaseStats } from '../config/baseStats'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import type { Character } from '../types'
import { defaultIconEmojiForClass } from './iconCatalog'

export type CreateCharacterInput = {
  id: string
  name: string
  classId: string
  baseStats: BaseStats
  baseStatRating: number
  unitLevel?: number
}

export function createCharacter(input: CreateCharacterInput): Character {
  return {
    id: input.id,
    name: input.name,
    classId: input.classId,
    unitLevel: input.unitLevel ?? 1,
    baseStats: { ...input.baseStats },
    baseStatRating: input.baseStatRating,
    equipment: { ...EMPTY_EQUIPMENT },
    items: [],
    cards: [],
    passives: [],
    passiveEquip: [null, null, null, null],
    battleLoadout: [null, null],
    iconEmoji: defaultIconEmojiForClass(input.classId),
    iconAccent: 'default',
    iconSkinTone: 'default',
  }
}
