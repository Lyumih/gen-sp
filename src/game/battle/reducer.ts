import type { BattleAction, BattleLogEntry, BattleState, Unit } from '../types'
import { applyModKillReward } from '../memento/modifications'
import { canMeleeAttack, canRangedAttack, withDamage } from './combat'
import { cellKey, manhattan, wallSet } from './grid'

/** Приращение worldPower за смерть врага (MVP-заглушка §6). */
export const WORLD_POWER_PER_ENEMY_KILL = 1

/** Очков модификации за одно убийство врага (первая модификация целевой карты). */
export const MOD_POINTS_PER_ENEMY_KILL = 1

function getUnit(state: BattleState, id: string): Unit | undefined {
  return state.units.find((u) => u.id === id)
}

function isAliveUnit(u: Unit | undefined): u is Unit {
  return u !== undefined && u.hp > 0
}

function aliveAtCell(
  state: BattleState,
  x: number,
  y: number,
  exceptId?: string,
): boolean {
  return state.units.some(
    (u) => u.hp > 0 && u.id !== exceptId && u.x === x && u.y === y,
  )
}

function resolveActorPointer(state: BattleState): number {
  const n = state.turnOrder.length
  if (n === 0) return 0
  for (let i = 0; i < n; i++) {
    const idx = (state.currentTurnIndex + i) % n
    const id = state.turnOrder[idx]
    if (isAliveUnit(getUnit(state, id))) return idx
  }
  return state.currentTurnIndex
}

function actorIdAtPointer(state: BattleState, ptr: number): string | undefined {
  const id = state.turnOrder[ptr]
  return isAliveUnit(getUnit(state, id)) ? id : undefined
}

function advanceTurnFrom(state: BattleState, fromPtr: number): BattleState {
  const n = state.turnOrder.length
  if (n === 0) return state
  for (let step = 1; step <= n; step++) {
    const idx = (fromPtr + step) % n
    const id = state.turnOrder[idx]
    if (isAliveUnit(getUnit(state, id))) {
      return { ...state, currentTurnIndex: idx }
    }
  }
  return { ...state, currentTurnIndex: (fromPtr + 1) % n }
}

function applyEnemyKillRewards(state: BattleState, killedEnemy: Unit): BattleState {
  let worldPower = state.worldPower
  let playerCards = state.playerCards

  if (killedEnemy.side === 'enemy') {
    worldPower += WORLD_POWER_PER_ENEMY_KILL
    const targetId = state.modKillTargetCardId
    if (targetId !== null) {
      playerCards = playerCards.map((c) =>
        c.id === targetId
          ? applyModKillReward(c, MOD_POINTS_PER_ENEMY_KILL)
          : c,
      )
    }
  }

  return { ...state, worldPower, playerCards }
}

/**
 * После урона: награды за врага, затем фаза победы/поражения.
 * Смерть героя не увеличивает worldPower (§6 MVP).
 */
function afterHpChange(state: BattleState, killedUnit: Unit | null): BattleState {
  let next = state
  if (killedUnit && killedUnit.side === 'enemy' && killedUnit.hp <= 0) {
    next = applyEnemyKillRewards(next, killedUnit)
  }
  const playersAlive = next.units.some((u) => u.side === 'player' && u.hp > 0)
  const enemiesAlive = next.units.some((u) => u.side === 'enemy' && u.hp > 0)
  if (!playersAlive) return { ...next, phase: 'defeat' }
  if (!enemiesAlive) return { ...next, phase: 'victory' }
  return next
}

function tryMove(state: BattleState, action: Extract<BattleAction, { type: 'move' }>): BattleState {
  const ptr = resolveActorPointer(state)
  const actorId = actorIdAtPointer(state, ptr)
  if (actorId === undefined || action.unitId !== actorId) return state

  const unit = getUnit(state, action.unitId)
  if (!isAliveUnit(unit)) return state

  const { toX, toY } = action
  const walls = wallSet(state.walls)
  if (manhattan(unit.x, unit.y, toX, toY) !== 1) return state

  const w = state.width
  const h = state.height
  if (walls.has(cellKey(toX, toY))) return state
  if (toX < 0 || toX >= w || toY < 0 || toY >= h) return state
  if (aliveAtCell(state, toX, toY, unit.id)) return state

  const moved: Unit = { ...unit, x: toX, y: toY }
  const units = state.units.map((u) => (u.id === unit.id ? moved : u))
  const moveLog: BattleLogEntry = {
    type: 'move',
    unitId: unit.id,
    fromX: unit.x,
    fromY: unit.y,
    toX,
    toY,
  }
  let next: BattleState = {
    ...state,
    units,
    battleLog: [...state.battleLog, moveLog],
  }
  next = afterHpChange(next, null)
  if (next.phase !== 'ongoing') return next
  return advanceTurnFrom(next, ptr)
}

function tryAttack(state: BattleState, action: Extract<BattleAction, { type: 'attack' }>): BattleState {
  const ptr = resolveActorPointer(state)
  const actorId = actorIdAtPointer(state, ptr)
  if (actorId === undefined || action.attackerId !== actorId) return state

  const attacker = getUnit(state, action.attackerId)
  const target = getUnit(state, action.targetId)
  if (!isAliveUnit(attacker) || !isAliveUnit(target)) return state
  if (attacker.id === target.id) return state

  const ok =
    action.kind === 'melee'
      ? canMeleeAttack(attacker, target)
      : canRangedAttack(attacker, target, action.maxRange)
  if (!ok) return state

  const updated = withDamage(target, action.damage)
  const units = state.units.map((u) => (u.id === target.id ? updated : u))
  const wasKill = updated.hp <= 0 && target.hp > 0
  const killed = wasKill ? updated : null

  const strikeLog: BattleLogEntry = {
    type: 'strike',
    attackerId: action.attackerId,
    targetId: action.targetId,
    damage: action.damage,
    attackKind: action.kind === 'melee' ? 'melee' : 'ranged',
    targetKilled: wasKill,
    ...(action.fromCard !== undefined ? { fromCard: action.fromCard } : {}),
  }
  let next: BattleState = {
    ...state,
    units,
    battleLog: [...state.battleLog, strikeLog],
  }
  next = afterHpChange(next, killed)
  if (next.phase !== 'ongoing') return next
  return advanceTurnFrom(next, ptr)
}

export function applyAction(state: BattleState, action: BattleAction): BattleState {
  if (state.phase !== 'ongoing') return state
  switch (action.type) {
    case 'move':
      return tryMove(state, action)
    case 'attack':
      return tryAttack(state, action)
  }
}

/** Текущий живой актёр по очереди (для UI). */
export function getCurrentActorId(state: BattleState): string | undefined {
  const n = state.turnOrder.length
  if (n === 0) return undefined
  for (let i = 0; i < n; i++) {
    const idx = (state.currentTurnIndex + i) % n
    const id = state.turnOrder[idx]
    const u = getUnit(state, id)
    if (u !== undefined && u.hp > 0) return id
  }
  return undefined
}
