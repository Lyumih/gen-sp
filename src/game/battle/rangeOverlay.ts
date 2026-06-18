import type { BattleState, Unit } from '../types'
import { HERO_MOVE_RANGE } from './combat'
import { ENEMY_RANGED_MAX_RANGE } from './enemyCombat'
import { cellKey, inBounds, manhattan, orthoNeighbors, wallSet } from './grid'
import { hasLineOfSight } from './lineOfSight'

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

function cellsInManhattanRangeWithLos(
  ox: number,
  oy: number,
  minRange: number,
  maxRange: number,
  width: number,
  height: number,
  walls: ReadonlySet<string>,
): Set<string> {
  const disk = cellsInManhattanRange(ox, oy, minRange, maxRange, width, height, walls)
  const out = new Set<string>()
  for (const k of disk) {
    const [xs, ys] = k.split(',')
    const x = Number(xs)
    const y = Number(ys)
    if (hasLineOfSight(ox, oy, x, y, walls)) out.add(k)
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

/** BFS: все свободные клетки, достижимые за ≤ maxSteps ортогональных шагов. */
export function reachableMoveCells(
  state: BattleState,
  unitId: string,
  maxSteps: number = HERO_MOVE_RANGE,
): Set<string> {
  const unit = state.units.find((u) => u.id === unitId && u.hp > 0)
  if (!unit) return new Set()
  const walls = wallSet(state.walls)
  const out = new Set<string>()
  const startK = cellKey(unit.x, unit.y)
  const visited = new Set<string>([startK])
  let frontier: [number, number][] = [[unit.x, unit.y]]

  for (let step = 0; step < maxSteps; step++) {
    const nextFrontier: [number, number][] = []
    for (const [fx, fy] of frontier) {
      for (const [x, y] of orthoNeighbors(fx, fy)) {
        if (!inBounds(x, y, state.width, state.height)) continue
        const k = cellKey(x, y)
        if (visited.has(k)) continue
        if (walls.has(k)) continue
        if (state.units.some((u) => u.hp > 0 && u.x === x && u.y === y && u.id !== unitId)) {
          continue
        }
        visited.add(k)
        out.add(k)
        nextFrontier.push([x, y])
      }
    }
    frontier = nextFrontier
    if (frontier.length === 0) break
  }
  return out
}

export function enemyThreatCells(state: BattleState, enemyId: string): Set<string> {
  const enemy = state.units.find((u) => u.id === enemyId && u.side === 'enemy' && u.hp > 0)
  if (!enemy) return new Set()
  const walls = wallSet(state.walls)
  const melee = cellsInManhattanRange(enemy.x, enemy.y, 1, 1, state.width, state.height)
  const ranged = cellsInManhattanRangeWithLos(
    enemy.x,
    enemy.y,
    1,
    ENEMY_RANGED_MAX_RANGE,
    state.width,
    state.height,
    walls,
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
  const walls = wallSet(state.walls)
  const maxR = kind === 'melee' ? 1 : maxRange
  const range =
    kind === 'melee'
      ? cellsInManhattanRange(ox, oy, 1, maxR, state.width, state.height)
      : cellsInManhattanRangeWithLos(ox, oy, 1, maxR, state.width, state.height, walls)
  const out = new Set<string>()
  for (const u of state.units) {
    if (u.side !== 'enemy' || u.hp <= 0) continue
    if (range.has(cellKey(u.x, u.y))) out.add(cellKey(u.x, u.y))
  }
  return out
}

export function canHealTarget(
  hero: Unit,
  target: Unit,
  maxRange: number,
  walls: ReadonlySet<string>,
): boolean {
  if (target.side !== 'player' || target.hp <= 0 || target.hp >= target.maxHp) return false
  const d = manhattan(hero.x, hero.y, target.x, target.y)
  if (d > maxRange) return false
  if (d === 0) return true
  return hasLineOfSight(hero.x, hero.y, target.x, target.y, walls)
}

export function validHealTargetCells(
  state: BattleState,
  hero: Unit,
  maxRange: number,
): Set<string> {
  const walls = wallSet(state.walls)
  const out = new Set<string>()
  for (const u of state.units) {
    if (canHealTarget(hero, u, maxRange, walls)) out.add(cellKey(u.x, u.y))
  }
  return out
}

export function castRangeCells(
  state: BattleState,
  ox: number,
  oy: number,
  castRange: number,
): Set<string> {
  const walls = wallSet(state.walls)
  return cellsInManhattanRangeWithLos(ox, oy, 0, castRange, state.width, state.height, walls)
}

export function attackRangeCells(
  state: BattleState,
  ox: number,
  oy: number,
  maxRange: number,
): Set<string> {
  const walls = wallSet(state.walls)
  return cellsInManhattanRangeWithLos(ox, oy, 1, maxRange, state.width, state.height, walls)
}

export function canCastAoEAt(
  hero: Unit,
  targetX: number,
  targetY: number,
  castRange: number,
  walls?: ReadonlySet<string>,
): boolean {
  if (manhattan(hero.x, hero.y, targetX, targetY) > castRange) return false
  if (walls === undefined) return true
  return hasLineOfSight(hero.x, hero.y, targetX, targetY, walls)
}

/** Все клетки, куда можно кастовать AoE с текущей позиции героя. */
export function aoeCastTargetCells(state: BattleState, hero: Unit, castRange: number): Set<string> {
  const walls = wallSet(state.walls)
  const out = new Set<string>()
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (walls.has(cellKey(x, y))) continue
      if (canCastAoEAt(hero, x, y, castRange, walls)) out.add(cellKey(x, y))
    }
  }
  return out
}
