import type { Unit } from '../types'
import { manhattan } from './grid'

/** Урон базовой рукопашной атаки героя (см. `BattleScreen` / `dispatchBattle`). */
export const HERO_BASIC_MELEE_DAMAGE = 5

/** Урон базовой дальней атаки героя. */
export const HERO_BASIC_RANGED_DAMAGE = 4

/** Макс. дистанция дальней атаки героя (манхэттен). */
export const HERO_BASIC_RANGED_MAX_RANGE = 6

/**
 * Дальний бой (MVP): дистанция — манхэттен между атакующим и целью.
 * Укрытий и блокировки луча нет (LOS не считаем); это сознательное упрощение v0.
 * Ближний бой: строго соседняя клетка (манхэттен === 1).
 */

export function canMeleeAttack(attacker: Unit, target: Unit): boolean {
  return manhattan(attacker.x, attacker.y, target.x, target.y) === 1
}

export function canRangedAttack(attacker: Unit, target: Unit, maxRange: number): boolean {
  const d = manhattan(attacker.x, attacker.y, target.x, target.y)
  return d >= 1 && d <= maxRange
}

export function withDamage(unit: Unit, damage: number): Unit {
  const hp = Math.max(0, unit.hp - damage)
  return { ...unit, hp }
}
