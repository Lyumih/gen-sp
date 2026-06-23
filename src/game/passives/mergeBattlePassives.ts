import type { PassiveInstance } from '../types'
import { afterCarrierLevelChange, modOfferSeed } from '../memento/carrierLevelChange'
import { cloneModSlots } from '../memento/modSlotsClone'

export function mergeBattlePassivesIntoCollection(
  collection: readonly PassiveInstance[],
  battlePassives: readonly PassiveInstance[],
): PassiveInstance[] {
  const battleById = new Map(battlePassives.map((p) => [p.id, p]))
  return collection.map((p) => {
    const fromBattle = battleById.get(p.id)
    if (!fromBattle) return { ...p, modSlots: cloneModSlots(p.modSlots) }
    const merged: PassiveInstance = {
      id: fromBattle.id,
      templateId: fromBattle.templateId,
      global_level: fromBattle.global_level,
      uses_count: fromBattle.uses_count,
      modSlots: cloneModSlots(fromBattle.modSlots),
    }
    if (fromBattle.global_level > p.global_level) {
      return afterCarrierLevelChange(
        merged,
        'passive',
        fromBattle.templateId,
        fromBattle.global_level,
        modOfferSeed(fromBattle.id, 0, fromBattle.global_level),
      )
    }
    return merged
  })
}
