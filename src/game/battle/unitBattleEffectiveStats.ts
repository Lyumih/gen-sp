import type { BaseStats } from '../config/baseStats'
import { getItemTemplate } from '../content/itemTemplates'
import { getCharacter } from '../character/selectors'
import { passiveBonusesForUnit } from '../passives/passiveCombatStats'
import { aggregatePassiveSkillStatBonuses } from '../passives/passiveStatBonuses'
import { computeEffectiveStats, computeGearStatBonuses } from '../stats/effectiveStats'
import type { BattleState, CampaignState, Unit } from '../types'

export function unitBattleEffectiveStats(
  battle: BattleState,
  unit: Unit,
  campaign: CampaignState,
): { base: BaseStats; effective: BaseStats } | null {
  if (!unit.baseStats) return null
  const character = getCharacter(campaign, unit.id)
  const gearBonuses = character
    ? computeGearStatBonuses(character.items, character.equipment, getItemTemplate)
    : {}
  const battlePassives = battle.passivesByUnitId?.[unit.id]
  const passiveBonuses =
    battlePassives !== undefined && battlePassives.length > 0
      ? passiveBonusesForUnit(battle, unit)
      : character
        ? aggregatePassiveSkillStatBonuses(
            character.passives,
            character.passiveEquip,
            unit.baseStats,
          )
        : passiveBonusesForUnit(battle, unit)
  const effective = computeEffectiveStats(
    unit.baseStats,
    unit.unitLevel,
    battle.worldPower,
    gearBonuses,
    passiveBonuses,
  )
  effective.health = unit.maxHp
  effective.initiative = unit.initiativeBase ?? effective.initiative
  return { base: unit.baseStats, effective }
}
