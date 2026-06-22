import type { CardInstance } from '../types'

/** Число разблокированных слотов модификаций — спека §5: floor(cardLevel / 75) */
export function modSlotsUnlocked(cardLevel: number): number {
  return Math.floor(cardLevel / 75)
}

/** Начисление очков на первый заполненный слот карты за убийство врага (MVP). */
export function applyModKillReward(card: CardInstance, points: number): CardInstance {
  if (card.modSlots.length === 0) return card
  const modSlots = card.modSlots.map((slot, i) =>
    i === 0 && slot.status === 'filled' ? { ...slot, lm: slot.lm + points } : slot,
  )
  return { ...card, modSlots }
}
