import type { ModSlotState } from '../types'

export function cloneModSlot(slot: ModSlotState): ModSlotState {
  if (slot.status === 'filled') return { ...slot }
  return {
    status: 'empty',
    offer: slot.offer
      ? { modIds: [...slot.offer.modIds], rollSeed: slot.offer.rollSeed }
      : null,
  }
}

export function cloneModSlots(slots: readonly ModSlotState[]): ModSlotState[] {
  return slots.map(cloneModSlot)
}
