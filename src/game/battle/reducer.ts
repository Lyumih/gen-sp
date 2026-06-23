import type { BattleAction, BattleLogEntry, BattleModContext, BattleState, ModSlotState, Unit } from '../types'
import { isUnitRooted } from './unitStatus'
import { canMeleeAttack, canRangedAttack, withDamage, withHeal } from './combat'
import { cellKey, manhattan, orthoNeighbors, wallSet } from './grid'
import { advanceTurn } from './initiative'
import { hasLineOfSight } from './lineOfSight'
import { isPartyWipe } from './outcomes'
import { cellsInAoE, reachableMoveCells } from './rangeOverlay'
import {
  computeHealSplashAmount,
  computeLifestealHeal,
  computeReflectDamage,
  computeSelfHealOnDamaged,
  computeSelfHealOnUse,
  applyAoeCenterDamageMods,
  rollProcExtraHits,
  type ModCombatContext,
} from '../mods/modPipeline'
import { getModTemplate } from '../content/modTemplates'

/** Приращение worldPower за смерть врага (MVP-заглушка §6). */
export const WORLD_POWER_PER_ENEMY_KILL = 1

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

function gearModSlots(state: BattleState, unitId: string): readonly ModSlotState[] {
  return state.playerGearModSlotsByUnitId?.[unitId] ?? []
}

function toModCtx(modCtx: BattleModContext | undefined): ModCombatContext | undefined {
  if (!modCtx) return undefined
  return { carrierTags: [], modSlots: modCtx.modSlots, rng: modCtx.rng }
}

function appendLog(state: BattleState, entries: BattleLogEntry[]): BattleState {
  if (entries.length === 0) return state
  return { ...state, battleLog: [...state.battleLog, ...entries] }
}

function updateUnit(state: BattleState, unitId: string, next: Unit): BattleState {
  return {
    ...state,
    units: state.units.map((u) => (u.id === unitId ? next : u)),
  }
}

function modProcLog(modTemplateId: string, label: string, unitId: string): BattleLogEntry {
  return { type: 'mod_proc', modTemplateId, label, unitId }
}

function applyEnemyKillRewards(state: BattleState, killedEnemy: Unit): BattleState {
  if (killedEnemy.side !== 'enemy') return state
  return { ...state, worldPower: state.worldPower + WORLD_POWER_PER_ENEMY_KILL }
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
  const enemiesAlive = next.units.some((u) => u.side === 'enemy' && u.hp > 0)
  if (isPartyWipe(next)) return { ...next, phase: 'defeat' }
  if (!enemiesAlive) return { ...next, phase: 'victory' }
  return next
}

type StrikeParams = {
  attackerId: string
  targetId: string
  damage: number
  attackKind: 'melee' | 'ranged' | 'aoe'
  fromCard?: { cardId: string; templateId: string }
  modCtx?: BattleModContext
}

function applyGearOnHitProcs(
  state: BattleState,
  targetId: string,
  attackerId: string,
): { state: BattleState; killed: Unit | null } {
  const target = getUnit(state, targetId)
  const attacker = getUnit(state, attackerId)
  if (!isAliveUnit(target) || !isAliveUnit(attacker)) {
    return { state, killed: null }
  }

  const gearSlots = gearModSlots(state, targetId)
  if (gearSlots.length === 0) return { state, killed: null }

  const gearCtx: ModCombatContext = { carrierTags: [], modSlots: gearSlots, rng: () => 50 }
  const reflect = computeReflectDamage(gearCtx)
  const selfHeal = computeSelfHealOnDamaged(gearCtx)
  const log: BattleLogEntry[] = []
  let next = state
  let killed: Unit | null = null

  if (reflect > 0) {
    const updatedAttacker = withDamage(attacker, reflect)
    const wasKill = updatedAttacker.hp <= 0 && attacker.hp > 0
    next = updateUnit(next, attackerId, updatedAttacker)
    log.push({
      type: 'strike',
      attackerId: targetId,
      targetId: attackerId,
      damage: reflect,
      attackKind: 'melee',
      targetKilled: wasKill,
    })
    for (const slot of gearSlots) {
      if (slot.status !== 'filled') continue
      const tmpl = getModTemplate(slot.templateId)
      if (tmpl?.ops.some((op) => op.kind === 'reflect_on_hit')) {
        log.push(modProcLog(tmpl.id, tmpl.label, targetId))
      }
    }
    if (wasKill) killed = updatedAttacker
  }

  if (selfHeal > 0 && isAliveUnit(getUnit(next, targetId))) {
    const healed = withHeal(getUnit(next, targetId)!, selfHeal)
    next = updateUnit(next, targetId, healed)
    log.push({
      type: 'heal',
      healerId: targetId,
      targetId,
      amount: selfHeal,
    })
    for (const slot of gearSlots) {
      if (slot.status !== 'filled') continue
      const tmpl = getModTemplate(slot.templateId)
      if (tmpl?.ops.some((op) => op.kind === 'self_heal_on_damaged')) {
        log.push(modProcLog(tmpl.id, tmpl.label, targetId))
      }
    }
  }

  next = appendLog(next, log)
  return { state: next, killed }
}

function applyAttackerOnHitProcs(
  state: BattleState,
  params: StrikeParams,
  damageDealt: number,
): { state: BattleState; killed: Unit | null } {
  const ctx = toModCtx(params.modCtx)
  if (!ctx) return { state, killed: null }

  let next = state
  const log: BattleLogEntry[] = []
  let killed: Unit | null = null

  const lifesteal = computeLifestealHeal(damageDealt, ctx)
  if (lifesteal > 0 && isAliveUnit(getUnit(next, params.attackerId))) {
    const healed = withHeal(getUnit(next, params.attackerId)!, lifesteal)
    next = updateUnit(next, params.attackerId, healed)
    log.push({
      type: 'heal',
      healerId: params.attackerId,
      targetId: params.attackerId,
      amount: lifesteal,
      ...(params.fromCard ? { fromCard: params.fromCard } : {}),
    })
    for (const slot of ctx.modSlots) {
      if (slot.status !== 'filled') continue
      const tmpl = getModTemplate(slot.templateId)
      if (tmpl?.ops.some((op) => op.kind === 'lifesteal_pct')) {
        log.push(modProcLog(tmpl.id, tmpl.label, params.attackerId))
      }
    }
  }

  const procs = rollProcExtraHits(ctx)
  for (const proc of procs) {
    log.push(modProcLog(proc.modTemplateId, proc.label, params.attackerId))
    for (let h = 0; h < proc.extraHits; h++) {
      const target = getUnit(next, params.targetId)
      if (!isAliveUnit(target)) break
      const updated = withDamage(target, params.damage)
      const wasKill = updated.hp <= 0 && target.hp > 0
      next = updateUnit(next, params.targetId, updated)
      log.push({
        type: 'strike',
        attackerId: params.attackerId,
        targetId: params.targetId,
        damage: params.damage,
        attackKind: params.attackKind,
        targetKilled: wasKill,
        ...(params.fromCard ? { fromCard: params.fromCard } : {}),
      })
      if (wasKill) {
        killed = updated
        break
      }
      const gearResult = applyGearOnHitProcs(next, params.targetId, params.attackerId)
      next = gearResult.state
      if (gearResult.killed) killed = gearResult.killed
    }
  }

  next = appendLog(next, log)
  return { state: next, killed }
}

function applySelfHealOnUse(
  state: BattleState,
  unitId: string,
  modCtx: BattleModContext | undefined,
  fromCard?: { cardId: string; templateId: string },
): BattleState {
  const ctx = toModCtx(modCtx)
  if (!ctx) return state
  const amount = computeSelfHealOnUse(ctx)
  if (amount <= 0) return state
  const unit = getUnit(state, unitId)
  if (!isAliveUnit(unit)) return state
  const healed = withHeal(unit, amount)
  const log: BattleLogEntry[] = [
    {
      type: 'heal',
      healerId: unitId,
      targetId: unitId,
      amount,
      ...(fromCard ? { fromCard } : {}),
    },
  ]
  for (const slot of modCtx!.modSlots) {
    if (slot.status !== 'filled') continue
    const tmpl = getModTemplate(slot.templateId)
    if (tmpl?.ops.some((op) => op.kind === 'self_heal_on_use')) {
      log.push(modProcLog(tmpl.id, tmpl.label, unitId))
    }
  }
  return appendLog(updateUnit(state, unitId, healed), log)
}

function applySingleStrike(
  state: BattleState,
  params: StrikeParams,
): { state: BattleState; killed: Unit | null } {
  const target = getUnit(state, params.targetId)
  if (!isAliveUnit(target)) return { state, killed: null }

  const updated = withDamage(target, params.damage)
  const wasKill = updated.hp <= 0 && target.hp > 0
  let next = updateUnit(state, params.targetId, updated)
  const log: BattleLogEntry[] = [
    {
      type: 'strike',
      attackerId: params.attackerId,
      targetId: params.targetId,
      damage: params.damage,
      attackKind: params.attackKind,
      targetKilled: wasKill,
      ...(params.fromCard ? { fromCard: params.fromCard } : {}),
    },
  ]
  next = appendLog(next, log)

  let killed: Unit | null = wasKill ? updated : null

  const gearResult = applyGearOnHitProcs(next, params.targetId, params.attackerId)
  next = gearResult.state
  if (gearResult.killed) killed = gearResult.killed

  const attackerProcs = applyAttackerOnHitProcs(next, params, params.damage)
  next = attackerProcs.state
  if (attackerProcs.killed) killed = attackerProcs.killed

  return { state: next, killed }
}

function tryMove(state: BattleState, action: Extract<BattleAction, { type: 'move' }>): BattleState {
  const ptr = resolveActorPointer(state)
  const actorId = actorIdAtPointer(state, ptr)
  if (actorId === undefined || action.unitId !== actorId) return state

  const unit = getUnit(state, action.unitId)
  if (!isAliveUnit(unit)) return state
  if (isUnitRooted(unit)) return state

  const { toX, toY } = action
  const walls = wallSet(state.walls)
  const reachable = reachableMoveCells(state, unit.id)
  if (!reachable.has(cellKey(toX, toY))) return state

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
  return advanceTurn(next)
}

function tryAttack(state: BattleState, action: Extract<BattleAction, { type: 'attack' }>): BattleState {
  const ptr = resolveActorPointer(state)
  const actorId = actorIdAtPointer(state, ptr)
  if (actorId === undefined || action.attackerId !== actorId) return state

  const attacker = getUnit(state, action.attackerId)
  const target = getUnit(state, action.targetId)
  if (!isAliveUnit(attacker) || !isAliveUnit(target)) return state
  if (attacker.id === target.id) return state

  const walls = wallSet(state.walls)
  const ok =
    action.kind === 'melee'
      ? canMeleeAttack(attacker, target)
      : canRangedAttack(attacker, target, action.maxRange, walls)
  if (!ok) return state

  const strikeParams: StrikeParams = {
    attackerId: action.attackerId,
    targetId: action.targetId,
    damage: action.damage,
    attackKind: action.kind === 'melee' ? 'melee' : 'ranged',
    ...(action.fromCard !== undefined ? { fromCard: action.fromCard } : {}),
    ...(action.modCtx !== undefined ? { modCtx: action.modCtx } : {}),
  }

  const { state: afterStrike, killed } = applySingleStrike(state, strikeParams)
  let next = afterStrike
  next = applySelfHealOnUse(next, action.attackerId, action.modCtx, action.fromCard)
  next = afterHpChange(next, killed)
  if (next.phase !== 'ongoing') return next
  return advanceTurn(next)
}

function tryAoEStrike(
  state: BattleState,
  action: Extract<BattleAction, { type: 'aoe_strike' }>,
): BattleState {
  const ptr = resolveActorPointer(state)
  const actorId = actorIdAtPointer(state, ptr)
  if (actorId === undefined || action.attackerId !== actorId) return state

  const attacker = getUnit(state, action.attackerId)
  if (!isAliveUnit(attacker)) return state

  const aoeKeys = cellsInAoE(
    action.centerX,
    action.centerY,
    action.aoeSize,
    state.width,
    state.height,
  )
  const hitIds = state.units
    .filter((u) => u.hp > 0 && aoeKeys.has(cellKey(u.x, u.y)))
    .map((u) => u.id)
  if (hitIds.length === 0) return state

  const modCtx = toModCtx(action.modCtx)
  let next: BattleState = state
  const killedEnemies: Unit[] = []

  for (const id of hitIds) {
    const target = getUnit(next, id)
    if (!isAliveUnit(target)) continue
    const isCenter = target.x === action.centerX && target.y === action.centerY
    const damage =
      modCtx !== undefined
        ? applyAoeCenterDamageMods(action.damage, isCenter, modCtx)
        : action.damage

    const strikeParams: StrikeParams = {
      attackerId: action.attackerId,
      targetId: id,
      damage,
      attackKind: 'aoe',
      ...(action.fromCard !== undefined ? { fromCard: action.fromCard } : {}),
      ...(action.modCtx !== undefined ? { modCtx: action.modCtx } : {}),
    }
    const result = applySingleStrike(next, strikeParams)
    next = result.state
    if (result.killed && result.killed.side === 'enemy') killedEnemies.push(result.killed)
  }

  next = applySelfHealOnUse(next, action.attackerId, action.modCtx, action.fromCard)
  for (const killed of killedEnemies) {
    next = afterHpChange(next, killed)
    if (next.phase !== 'ongoing') return next
  }
  const enemiesAlive = next.units.some((u) => u.side === 'enemy' && u.hp > 0)
  if (isPartyWipe(next)) return { ...next, phase: 'defeat' }
  if (!enemiesAlive) return { ...next, phase: 'victory' }
  return advanceTurn(next)
}

function findHealSplashTargets(state: BattleState, target: Unit): Unit[] {
  const out: Unit[] = []
  for (const [nx, ny] of orthoNeighbors(target.x, target.y)) {
    const neighbor = state.units.find(
      (u) => u.hp > 0 && u.side === 'player' && u.x === nx && u.y === ny && u.id !== target.id,
    )
    if (neighbor) out.push(neighbor)
  }
  return out
}

function tryHeal(state: BattleState, action: Extract<BattleAction, { type: 'heal' }>): BattleState {
  const ptr = resolveActorPointer(state)
  const actorId = actorIdAtPointer(state, ptr)
  if (actorId === undefined || action.healerId !== actorId) return state

  const healer = getUnit(state, action.healerId)
  const target = getUnit(state, action.targetId)
  if (!isAliveUnit(healer) || !isAliveUnit(target)) return state
  if (target.side !== 'player' || target.hp >= target.maxHp) return state

  const walls = wallSet(state.walls)
  const d = manhattan(healer.x, healer.y, target.x, target.y)
  if (d > 2) return state
  if (d > 0 && !hasLineOfSight(healer.x, healer.y, target.x, target.y, walls)) return state

  const updated = withHeal(target, action.amount)
  let next = updateUnit(state, action.targetId, updated)
  const log: BattleLogEntry[] = [
    {
      type: 'heal',
      healerId: action.healerId,
      targetId: action.targetId,
      amount: action.amount,
      ...(action.fromCard !== undefined ? { fromCard: action.fromCard } : {}),
    },
  ]

  const ctx = toModCtx(action.modCtx)
  if (ctx) {
    const splashAmount = computeHealSplashAmount(action.amount, ctx)
    if (splashAmount > 0) {
      log.push(modProcLog('mod-ally-heal-splash', 'Окружение светом', action.healerId))
      for (const ally of findHealSplashTargets(next, target)) {
        const splashed = withHeal(ally, splashAmount)
        next = updateUnit(next, ally.id, splashed)
        log.push({
          type: 'heal',
          healerId: action.healerId,
          targetId: ally.id,
          amount: splashAmount,
          ...(action.fromCard !== undefined ? { fromCard: action.fromCard } : {}),
        })
      }
    }
  }

  next = appendLog(next, log)
  next = applySelfHealOnUse(next, action.healerId, action.modCtx, action.fromCard)
  next = afterHpChange(next, null)
  if (next.phase !== 'ongoing') return next
  return advanceTurn(next)
}

export function applyAction(state: BattleState, action: BattleAction): BattleState {
  if (state.phase !== 'ongoing') return state
  switch (action.type) {
    case 'move':
      return tryMove(state, action)
    case 'attack':
      return tryAttack(state, action)
    case 'aoe_strike':
      return tryAoEStrike(state, action)
    case 'heal':
      return tryHeal(state, action)
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
