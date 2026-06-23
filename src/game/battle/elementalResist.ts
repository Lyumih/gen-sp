import type { UnitStatusEffect } from './unitStatus'

export const SHIFTING_RESIST_TAGS = ['fire', 'ice', 'poison'] as const
export type ShiftingResistTag = (typeof SHIFTING_RESIST_TAGS)[number]

export function rotateShiftingResistTag(current: string | undefined): ShiftingResistTag {
  const idx = SHIFTING_RESIST_TAGS.indexOf(current as ShiftingResistTag)
  const nextIdx = idx < 0 ? 0 : (idx + 1) % SHIFTING_RESIST_TAGS.length
  return SHIFTING_RESIST_TAGS[nextIdx]!
}

export function createShiftingResistStatus(
  unitSeed: string,
  startingTag: ShiftingResistTag,
): UnitStatusEffect {
  return {
    id: `${unitSeed}-elemental-resist`,
    kind: 'elemental_resist',
    remainingTurns: 3,
    magnitude: 30,
    sourceTemplateId: startingTag,
  }
}
