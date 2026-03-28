/** Карточка повышает global_level на +1 после использования — спека §4.3 */
export function rollCardLevelUp(
  currentLevel: number,
  randomInt1to100: number,
): boolean {
  const r = randomInt1to100
  if (currentLevel > 100) return r === 1
  return r === 100 || r >= currentLevel
}
