import { cloneCards } from '../campaign/battleSnapshot'
import { STARTER_CARDS } from '../campaign/runReducer'
import type { BaseStats } from '../config/baseStats'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import type { Character } from '../types'

export type CreateCharacterInput = {
  id: string
  name: string
  classId: string
  baseStats: BaseStats
  baseStatRating: number
  unitLevel?: number
}

export function createCharacter(input: CreateCharacterInput): Character {
  const cards = cloneCards(STARTER_CARDS).map((c, i) => ({
    ...c,
    id: `c-${input.id}-${i + 1}`,
  }))
  const loadout: [string | null, string | null] = [
    cards[0]?.id ?? null,
    cards[1]?.id ?? null,
  ]
  return {
    id: input.id,
    name: input.name,
    classId: input.classId,
    unitLevel: input.unitLevel ?? 1,
    baseStats: { ...input.baseStats },
    baseStatRating: input.baseStatRating,
    equipment: { ...EMPTY_EQUIPMENT },
    items: [],
    cards,
    battleLoadout: loadout,
  }
}
