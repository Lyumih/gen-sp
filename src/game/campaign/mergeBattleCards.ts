import type { BattlePlayerCard, CardInstance } from '../types'

export function mergeBattleCardsIntoCollection(
  collection: readonly CardInstance[],
  battleCards: readonly BattlePlayerCard[],
): CardInstance[] {
  const battleById = new Map(battleCards.map((c) => [c.id, c]))
  return collection.map((c) => {
    const fromBattle = battleById.get(c.id)
    if (!fromBattle) return { ...c, modifications: c.modifications.map((m) => ({ ...m })) }
    return {
      id: fromBattle.id,
      templateId: fromBattle.templateId,
      global_level: fromBattle.global_level,
      uses_count: fromBattle.uses_count,
      modifications: fromBattle.modifications.map((m) => ({ ...m })),
    }
  })
}
