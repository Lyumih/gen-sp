import { rollCardLevelUp } from './rollCardLevelUp'

/** Минимальные поля карточки для прогресса за использование (полный тип — Task 5). */
export type CardProgressFields = Readonly<{
  global_level: number
  uses_count: number
}>

/**
 * Одно использование карточки: uses_count + 1, затем бросок §4.3.
 * Возвращает новый объект (иммутабельно).
 */
export function applyCardUse(
  card: CardProgressFields,
  randomInt1to100: number,
): CardProgressFields & { leveledUp: boolean } {
  const uses_count = card.uses_count + 1
  const leveledUp = rollCardLevelUp(card.global_level, randomInt1to100)
  const global_level = leveledUp ? card.global_level + 1 : card.global_level
  return { ...card, uses_count, global_level, leveledUp }
}
