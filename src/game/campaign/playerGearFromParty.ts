import { cloneModSlots } from '../memento/modSlotsClone'
import type { ModSlotState, PartyMemberBattleSnapshot } from '../types'

const GEAR_HIT_SLOTS = ['armor', 'accessory'] as const

/** Filled mod slots from equipped armor and accessory per player unit id. */
export function playerGearModSlotsByUnitFromParty(
  party: readonly PartyMemberBattleSnapshot[],
): Record<string, ModSlotState[]> {
  const out: Record<string, ModSlotState[]> = {}
  for (const member of party) {
    const slots: ModSlotState[] = []
    for (const slot of GEAR_HIT_SLOTS) {
      const itemId = member.equipment[slot]
      if (itemId === null) continue
      const item = member.items.find((i) => i.id === itemId)
      if (!item) continue
      for (const modSlot of item.modSlots) {
        if (modSlot.status === 'filled') slots.push(modSlot)
      }
    }
    if (slots.length > 0) {
      out[member.characterId] = cloneModSlots(slots)
    }
  }
  return out
}
