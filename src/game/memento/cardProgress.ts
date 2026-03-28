import type { CardProgressSlice } from '../types'
import { rollCardLevelUp } from './rollCardLevelUp'

export type CardProgressFields = Readonly<CardProgressSlice>

/**
 * Одно использование карточки: uses_count + 1, затем бросок §4.3.
 * Возвращает новый объект (иммутабельно).
 */
export function applyCardUse<T extends CardProgressFields>(
  card: T,
  randomInt1to100: number,
): T & { leveledUp: boolean } {
  const uses_count = card.uses_count + 1
  const leveledUp = rollCardLevelUp(card.global_level, randomInt1to100)
  const global_level = leveledUp ? card.global_level + 1 : card.global_level
  return { ...card, uses_count, global_level, leveledUp }
}
