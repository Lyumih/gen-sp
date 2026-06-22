import { computeUnitStat } from '../balance'
import { getItemTemplate } from '../content/itemTemplates'
import { aggregateGearHpBonus } from '../equipment/aggregates'
import type { PartyMemberBattleSnapshot } from '../types'
import type { BattleScenario } from './scenarios'

/**
 * Max HP персонажа при входе в сценарий: база от сценария и уровня + бонус от экипировки.
 */
export function computeCharacterMaxHpForScenario(
  member: Pick<PartyMemberBattleSnapshot, 'unitLevel' | 'items' | 'equipment'>,
  scenario: BattleScenario,
  worldPower: number,
): number {
  const baseMaxHp = computeUnitStat({
    baseStat: scenario.heroBaseHpStat,
    unitLevel: member.unitLevel,
    worldPower,
  })
  const gearHp = aggregateGearHpBonus(member.items, member.equipment, getItemTemplate)
  return baseMaxHp + gearHp
}

/** @deprecated use computeCharacterMaxHpForScenario */
export const computeHeroMaxHpForScenario = computeCharacterMaxHpForScenario
