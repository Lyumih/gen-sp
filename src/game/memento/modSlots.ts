import { milestoneThreshold, MOD_SLOT_MILESTONES } from '../config/modSlotMilestones'
import type { ModOffer, ModSlotState } from '../types'

export { milestoneThreshold, MOD_SLOT_MILESTONES }

export function unlockedSlotCount(carrierLevel: number): number {
  if (carrierLevel < MOD_SLOT_MILESTONES.firstThreshold) return 0
  let count = 0
  while (carrierLevel >= milestoneThreshold(count)) {
    count++
  }
  return count
}

export function rollbackCarrierLevel(slotIndex: number): number {
  if (slotIndex <= 0) return 0
  return milestoneThreshold(slotIndex - 1)
}

export function syncModSlotsForLevel(
  slots: ModSlotState[],
  carrierLevel: number,
  makeOffer: (slotIndex: number) => ModOffer,
): ModSlotState[] {
  const targetCount = unlockedSlotCount(carrierLevel)
  const result: ModSlotState[] = []

  for (let i = 0; i < targetCount; i++) {
    const existing = slots[i]
    if (existing?.status === 'filled' || existing?.status === 'empty') {
      result.push(existing)
    } else {
      result.push({ status: 'empty', offer: makeOffer(i) })
    }
  }

  return result
}
