export function turnBadgeLabel(
  unitId: string,
  turnOrder: readonly string[],
  currentTurnIndex: number,
  isAlive: (id: string) => boolean,
): string | null {
  if (!isAlive(unitId)) return null
  if (turnOrder.length === 0) return null
  const currentId = turnOrder[currentTurnIndex % turnOrder.length]
  if (currentId === unitId) return null

  const unitIndex = turnOrder.indexOf(unitId)
  if (unitIndex < 0) return null

  if (unitIndex > currentTurnIndex) {
    return String(unitIndex - currentTurnIndex)
  }

  let positionInNextRound = 0
  for (let i = 0; i <= unitIndex; i++) {
    const id = turnOrder[i]
    if (id !== undefined && isAlive(id)) positionInNextRound++
  }
  return `R+${positionInNextRound}`
}
