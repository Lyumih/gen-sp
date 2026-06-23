import type { StatId } from '../config/baseStats'
import { passiveEquipFromBattlePassives } from '../campaign/playerPassivesFromParty'
import { computeEffectiveStat } from '../stats/effectiveStats'
import { statusCombatModifiers } from '../battle/unitStatus'
import type { BattleState, Unit } from '../types'
import { aggregatePassiveSkillStatBonuses } from './passiveStatBonuses'

export function passiveBonusesForUnit(
  state: BattleState,
  unit: Unit,
): Partial<Record<StatId, number>> {
  if (!unit.baseStats) return {}
  const passives = state.passivesByUnitId?.[unit.id] ?? []
  if (passives.length === 0) return {}
  return aggregatePassiveSkillStatBonuses(
    passives,
    passiveEquipFromBattlePassives(passives),
    unit.baseStats,
  )
}

export function effectiveBattleStat(
  state: BattleState,
  unit: Unit,
  statId: StatId,
): number {
  if (!unit.baseStats) return 0
  const bonuses = passiveBonusesForUnit(state, unit)
  return computeEffectiveStat(
    unit.baseStats,
    statId,
    unit.unitLevel,
    state.worldPower,
    bonuses[statId] ?? 0,
  )
}

export function applyPassiveAttackBonus(
  state: BattleState,
  attacker: Unit,
  baseDamage: number,
): number {
  if (attacker.side !== 'player' || !attacker.baseStats) return baseDamage
  const bonus = passiveBonusesForUnit(state, attacker)
  return baseDamage + (bonus.attack ?? 0) + (bonus.magicPower ?? 0)
}

export function mitigatePassiveDefense(
  state: BattleState,
  target: Unit,
  damage: number,
): number {
  if (target.side !== 'player' || !target.baseStats) return damage
  const bonus = passiveBonusesForUnit(state, target)
  const defense = (bonus.defense ?? 0) + statusCombatModifiers(target).defenseFlat
  if (defense <= 0) return damage
  return Math.max(1, damage - defense)
}

export function applyPassiveHealBonus(
  state: BattleState,
  healer: Unit,
  amount: number,
): number {
  if (healer.side !== 'player' || !healer.baseStats) return amount
  const bonus = passiveBonusesForUnit(state, healer)
  return amount + (bonus.healPower ?? 0)
}

export function rollPassiveCritDamage(
  state: BattleState,
  attacker: Unit,
  damage: number,
  rng: () => number,
): number {
  if (attacker.side !== 'player' || !attacker.baseStats) return damage
  const critStat = effectiveBattleStat(state, attacker, 'critChance')
  if (critStat <= 0) return damage
  const chance = Math.min(100, critStat) / 100
  if (rng() <= chance) return Math.round(damage * 1.5)
  return damage
}
