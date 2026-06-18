import type { BattlePlayerCard, CardInstance } from '../types'

export type BattleLoadout = [string | null, string | null]

export function playerCardsFromLoadout(
  collection: readonly CardInstance[],
  loadout: BattleLoadout | undefined,
): BattlePlayerCard[] {
  const slots = loadout ?? (['c1', 'c2'] as BattleLoadout)
  const out: BattlePlayerCard[] = []
  for (const id of slots) {
    if (id === null) continue
    const c = collection.find((x) => x.id === id)
    if (!c) continue
    out.push({
      ...c,
      modifications: c.modifications.map((m) => ({ ...m })),
      cooldownRemaining: 0,
    })
  }
  return out
}
