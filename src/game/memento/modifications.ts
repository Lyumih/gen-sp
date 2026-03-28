import type { CardInstance } from '../types'

/** Число разблокированных слотов модификаций — спека §5: floor(cardLevel / 75) */
export function modSlotsUnlocked(cardLevel: number): number {
  return Math.floor(cardLevel / 75)
}

/** Начисление очков на первую модификацию карты за убийство врага (MVP). */
export function applyModKillReward(card: CardInstance, points: number): CardInstance {
  if (card.modifications.length === 0) return card
  const modifications = card.modifications.map((m, i) =>
    i === 0 ? { level: m.level + points } : m,
  )
  return { ...card, modifications }
}
