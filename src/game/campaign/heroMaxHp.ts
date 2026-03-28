import { computeUnitStat } from '../balance'
import { getItemTemplate } from '../content/itemTemplates'
import { aggregateGearHpBonus } from '../equipment/aggregates'
import type { BattleAttemptSnapshot } from '../types'
import type { BattleScenario } from './scenarios'

/**
 * Max HP героя при входе в сценарий: база от сценария и снимка + бонус от экипировки.
 */
export function computeHeroMaxHpForScenario(
  snapshot: BattleAttemptSnapshot,
  scenario: BattleScenario,
): number {
  const baseMaxHp = computeUnitStat({
    baseStat: scenario.heroBaseHpStat,
    unitLevel: snapshot.playerUnitLevel,
    worldPower: snapshot.worldPower,
  })
  const gearHp = aggregateGearHpBonus(snapshot.items, snapshot.equipment, getItemTemplate)
  return baseMaxHp + gearHp
}
