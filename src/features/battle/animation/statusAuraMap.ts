import type { UnitStatusKind } from '../../../game/battle/unitStatus'

const BUFF_KINDS = new Set<UnitStatusKind>([
  'attack_up',
  'defense_up',
  'card_damage_up',
  'damage_reduction',
  'regen',
  'elemental_resist',
])

export type StatusAuraPolarity = 'buff' | 'debuff'

export function statusAuraPolarity(statusKind: string): StatusAuraPolarity {
  if (BUFF_KINDS.has(statusKind as UnitStatusKind)) return 'buff'
  return 'debuff'
}

export function isHolyBuffStatus(statusKind: string, sourceTemplateId?: string): boolean {
  return statusKind === 'damage_reduction' && sourceTemplateId === 'divine_shield'
}
