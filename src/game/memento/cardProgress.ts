import type { CardProgressSlice } from '../types'
import { rollCardLevelUp } from './rollCardLevelUp'
import { rollWithLuckyRetry } from '../specialization/resolve'

export type CardProgressFields = Readonly<CardProgressSlice>

function resolveRoll(randomInt1to100: number | (() => number)): () => number {
  if (typeof randomInt1to100 === 'function') return randomInt1to100
  return () => randomInt1to100
}

/**
 * Одно использование карточки: uses_count + 1, затем бросок §4.3.
 * Возвращает новый объект (иммутабельно).
 */
export function applyCardUse<T extends CardProgressFields>(
  card: T,
  randomInt1to100: number | (() => number),
  options?: { lucky?: boolean },
): T & { leveledUp: boolean } {
  const uses_count = card.uses_count + 1
  const roll = resolveRoll(randomInt1to100)
  const leveledUp = options?.lucky
    ? rollWithLuckyRetry(card.global_level, roll, true)
    : rollCardLevelUp(card.global_level, roll())
  const global_level = leveledUp ? card.global_level + 1 : card.global_level
  return { ...card, uses_count, global_level, leveledUp }
}
