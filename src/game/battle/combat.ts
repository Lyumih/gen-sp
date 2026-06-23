import type { Unit } from '../types'
import { applyDamageReduction, statusCombatModifiers } from './unitStatus'
import { manhattan } from './grid'
import { hasLineOfSight } from './lineOfSight'

/** Урон базовой рукопашной атаки героя (см. `BattleScreen` / `dispatchBattle`). */
export const HERO_BASIC_MELEE_DAMAGE = 5

/** Урон базовой дальней атаки героя. */
export const HERO_BASIC_RANGED_DAMAGE = 4

/** Макс. дистанция дальней атаки героя (манхэттен). */
export const HERO_BASIC_RANGED_MAX_RANGE = 6

/** Ортогональных шагов за одно действие «ход» (BFS по свободным клеткам). */
export const HERO_MOVE_RANGE = 3

/**
 * Ближний бой: строго соседняя клетка (манхэттен === 1).
 * Дальний: манхэттен в [1, maxRange] и прямая видимость (стены блокируют).
 */

export function canMeleeAttack(attacker: Unit, target: Unit): boolean {
  return manhattan(attacker.x, attacker.y, target.x, target.y) === 1
}

export function canRangedAttack(
  attacker: Unit,
  target: Unit,
  maxRange: number,
  walls?: ReadonlySet<string>,
): boolean {
  const penalty = statusCombatModifiers(attacker).rangePenalty
  const effectiveMax = Math.max(1, maxRange - penalty)
  const d = manhattan(attacker.x, attacker.y, target.x, target.y)
  if (d < 1 || d > effectiveMax) return false
  if (walls === undefined) return true
  return hasLineOfSight(attacker.x, attacker.y, target.x, target.y, walls)
}

export function withDamage(unit: Unit, damage: number): Unit {
  const hp = Math.max(0, unit.hp - applyDamageReduction(damage, unit))
  return { ...unit, hp }
}

export function withHeal(unit: Unit, amount: number): Unit {
  return { ...unit, hp: Math.min(unit.maxHp, unit.hp + amount) }
}
