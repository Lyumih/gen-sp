import type { BattleState, Unit } from '../types'
import { ENEMY_RANGED_MAX_RANGE } from './enemyCombat'
import { cellKey, inBounds, manhattan, orthoNeighbors, wallSet } from './grid'

export function cellsInManhattanRange(
  ox: number,
  oy: number,
  minRange: number,
  maxRange: number,
  width: number,
  height: number,
  walls?: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = manhattan(ox, oy, x, y)
      if (d < minRange || d > maxRange) continue
      const k = cellKey(x, y)
      if (walls?.has(k)) continue
      out.add(k)
    }
  }
  return out
}

/** aoeSize×aoeSize square centered on (cx, cy), clipped to grid. */
export function cellsInAoE(
  cx: number,
  cy: number,
  aoeSize: number,
  width: number,
  height: number,
): Set<string> {
  const half = Math.floor(aoeSize / 2)
  const out = new Set<string>()
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (inBounds(x, y, width, height)) out.add(cellKey(x, y))
    }
  }
  return out
}

export function reachableMoveCells(state: BattleState, unitId: string): Set<string> {
  const unit = state.units.find((u) => u.id === unitId && u.hp > 0)
  if (!unit) return new Set()
  const walls = wallSet(state.walls)
  const out = new Set<string>()
  for (const [x, y] of orthoNeighbors(unit.x, unit.y)) {
    if (!inBounds(x, y, state.width, state.height)) continue
    const k = cellKey(x, y)
    if (walls.has(k)) continue
    if (state.units.some((u) => u.hp > 0 && u.x === x && u.y === y)) continue
    out.add(k)
  }
  return out
}

export function enemyThreatCells(state: BattleState, enemyId: string): Set<string> {
  const enemy = state.units.find((u) => u.id === enemyId && u.side === 'enemy' && u.hp > 0)
  if (!enemy) return new Set()
  const melee = cellsInManhattanRange(enemy.x, enemy.y, 1, 1, state.width, state.height)
  const ranged = cellsInManhattanRange(
    enemy.x,
    enemy.y,
    1,
    ENEMY_RANGED_MAX_RANGE,
    state.width,
    state.height,
  )
  return new Set([...melee, ...ranged])
}

export function aggregateEnemyThreatCells(state: BattleState): Set<string> {
  const out = new Set<string>()
  for (const u of state.units) {
    if (u.side !== 'enemy' || u.hp <= 0) continue
    for (const k of enemyThreatCells(state, u.id)) out.add(k)
  }
  return out
}

export function validSingleTargetCells(
  state: BattleState,
  ox: number,
  oy: number,
  kind: 'melee' | 'ranged',
  maxRange: number,
): Set<string> {
  const maxR = kind === 'melee' ? 1 : maxRange
  const range = cellsInManhattanRange(ox, oy, 1, maxR, state.width, state.height)
  const out = new Set<string>()
  for (const u of state.units) {
    if (u.side !== 'enemy' || u.hp <= 0) continue
    if (range.has(cellKey(u.x, u.y))) out.add(cellKey(u.x, u.y))
  }
  return out
}

export function canCastAoEAt(
  hero: Unit,
  targetX: number,
  targetY: number,
  castRange: number,
): boolean {
  return manhattan(hero.x, hero.y, targetX, targetY) <= castRange
}
