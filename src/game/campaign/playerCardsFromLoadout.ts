import type { BattleLoadout, BattlePlayerCard, CardInstance } from '../types'
import { cloneModSlots } from '../memento/modSlotsClone'

export function playerCardsFromLoadout(
  collection: readonly CardInstance[],
  loadout: BattleLoadout | undefined,
): BattlePlayerCard[] {
  const slots = loadout ?? (['c1', 'c2', null, null] as BattleLoadout)
  const out: BattlePlayerCard[] = []
  for (const id of slots) {
    if (id === null) continue
    const c = collection.find((x) => x.id === id)
    if (!c) continue
    out.push({
      ...c,
      modSlots: cloneModSlots(c.modSlots),
      cooldownRemaining: 0,
    })
  }
  return out
}
