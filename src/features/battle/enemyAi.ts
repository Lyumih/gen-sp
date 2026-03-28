import type { BattleAction, BattleState, Unit } from '../../game/types'
import { getCurrentActorId } from '../../game/battle/reducer'
import { canMeleeAttack, canRangedAttack } from '../../game/battle/combat'
import { ORTHO_DELTAS, cellKey, manhattan, wallSet } from '../../game/battle/grid'

function aliveHero(state: BattleState): Unit | undefined {
  return state.units.find((u) => u.side === 'player' && u.hp > 0)
}

/**
 * Один шаг простого ИИ: атака в упор/на дистанции, иначе шаг, уменьшающий манхэттен до героя.
 */
export function pickEnemyAiAction(state: BattleState): BattleAction | null {
  const id = getCurrentActorId(state)
  const actor = state.units.find((u) => u.id === id)
  if (!actor || actor.side !== 'enemy') return null
  const hero = aliveHero(state)
  if (!hero) return null

  if (canMeleeAttack(actor, hero)) {
    return {
      type: 'attack',
      attackerId: actor.id,
      targetId: hero.id,
      damage: 4,
      kind: 'melee',
    }
  }
  if (canRangedAttack(actor, hero, 8)) {
    return {
      type: 'attack',
      attackerId: actor.id,
      targetId: hero.id,
      damage: 3,
      kind: 'ranged',
      maxRange: 8,
    }
  }

  const walls = wallSet(state.walls)
  let best: { x: number; y: number; d: number } | null = null
  for (const d of ORTHO_DELTAS) {
    const x = actor.x + d.dx
    const y = actor.y + d.dy
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue
    if (walls.has(cellKey(x, y))) continue
    if (state.units.some((u) => u.hp > 0 && u.x === x && u.y === y)) continue
    const dist = manhattan(x, y, hero.x, hero.y)
    if (!best || dist < best.d) best = { x, y, d: dist }
  }
  if (best) {
    return { type: 'move', unitId: actor.id, toX: best.x, toY: best.y }
  }
  return null
}
