export const MOD_SLOT_MILESTONES = import.meta.env.DEV
  ? { firstThreshold: 5, step: 5 }
  : { firstThreshold: 75, step: 100 }

export function milestoneThreshold(slotIndex: number): number {
  const { firstThreshold, step } = MOD_SLOT_MILESTONES
  return firstThreshold + step * slotIndex
}
