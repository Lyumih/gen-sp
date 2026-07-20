import type { BaseStats } from '../config/baseStats'
import { createCharacter, type CreateCharacterInput } from '../character/createCharacter'
import type { Character } from '../types'
import { computeBaseStatRating } from './computeRating'

/** Fixed base stats for unit tests. */
export const TEST_BASE_STATS: BaseStats = {
  health: 20,
  defense: 2,
  attack: 3,
  magicPower: 1,
  mana: 10,
  manaRegen: 3,
  healPower: 1,
  speed: 2,
  initiative: 8,
  critChance: 5,
}

export function testCreateCharacter(
  input: Pick<CreateCharacterInput, 'id' | 'name' | 'classId'> &
    Partial<Omit<CreateCharacterInput, 'id' | 'name' | 'classId'>>,
): Character {
  const baseStats = input.baseStats ?? TEST_BASE_STATS
  return createCharacter({
    unitLevel: 1,
    ...input,
    baseStats,
    baseStatRating: input.baseStatRating ?? computeBaseStatRating(baseStats),
  })
}
