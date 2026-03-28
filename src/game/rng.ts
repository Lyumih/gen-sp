/** Равномерный целый RNG 1..100 для бросков карты §4 (UI и сиды). */
export function randomInt1to100(): number {
  return Math.floor(Math.random() * 100) + 1
}
