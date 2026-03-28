/** Число разблокированных слотов модификаций — спека §5: floor(cardLevel / 75) */
export function modSlotsUnlocked(cardLevel: number): number {
  return Math.floor(cardLevel / 75)
}
