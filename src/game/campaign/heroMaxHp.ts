import { computeUnitStat } from '../balance'
import { getItemTemplate } from '../content/itemTemplates'
import { computeCharacterMaxHp } from '../stats/effectiveStats'
import type { PartyMemberBattleSnapshot } from '../types'
import type { BattleScenario } from './scenarios'

/**
 * Max HP персонажа при входе в сценарий: base health stat + level/worldPower + gear.
 */
export function computeCharacterMaxHpForScenario(
  member: Pick<PartyMemberBattleSnapshot, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>,
  _scenario: BattleScenario,
  worldPower: number,
): number {
  return computeCharacterMaxHp(member, worldPower, getItemTemplate)
}

/** @deprecated use computeCharacterMaxHpForScenario */
export const computeHeroMaxHpForScenario = computeCharacterMaxHpForScenario

export { computeUnitStat }
