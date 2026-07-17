import type { BattleAction, BattleLogEntry, BattleModContext, BattlePlayerCard, BattleState, ModSlotState, PassiveInstance, Unit } from '../types'
import { isUnitRooted } from './unitStatus'
import { appendUnitStatus, statusForSkill } from './unitStatus'
import { canMeleeAttack, canRangedAttack, withDamage, withHeal } from './combat'
import { isHeroRangedReady, setHeroRangedCooldown } from './heroRangedCooldown'
import { cellKey, manhattan, orthoNeighbors, wallSet } from './grid'
import { advanceTurn } from './initiative'
import { hasLineOfSight } from './lineOfSight'
import { isPartyWipe } from './outcomes'
import { canCastAoEAt, cellsInAoE, reachableMoveCells } from './rangeOverlay'
import {
  applyPassiveAttackBonus,
  applyPassiveHealBonus,
  mitigatePassiveDefense,
  rollPassiveCritDamage,
} from '../passives/passiveCombatStats'
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
import {
  applyEnemyAffinityDamageMult,
  antiHealMultiplierFromAdjacentEnemies,
  defenseMitigationFactor,
  mitigateEnemyRangedWard,
} from '../passives/enemyPassiveCombat'
import { passiveEquipFromBattlePassives } from '../campaign/playerPassivesFromParty'
import {
  computePassiveRangedRangeBonus,
  computePassiveStrikeDamageMult,
  firePassives,
  type PassiveCombatPatch,
  type PassiveFireInput,
} from '../passives/passiveEngine'
import type { PassiveTrigger } from '../content/passiveTemplates'
import { applyRaceDamageModifiers, applyElementalResistModifiers, resolveCardDamageTags } from './enemyResists'
import { updateActorEnemyCards } from './enemyCards'
import { resolveEnemySkillAmount, resolveEnemySkillEffectPower } from './enemySkillResolve'
import {
  applyBossSkillUse,
  isBossSkillHandledInMechanics,
  modifyHealReceived,
  stripStealthInAoE,
  tryNegateSpellDamage,
  weakenHolyBuffIfNeeded,
} from './bossMechanics'
import {
  getCardAttackTemplate,
  usesCardAttackDispatch,
  usesCardAoEDispatch,
  usesCardUtilitySingleDispatch,
} from '../content/cardTemplates'

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

function unitPassives(state: BattleState, unitId: string): readonly PassiveInstance[] {
  return state.passivesByUnitId?.[unitId] ?? []
}

function updateUnitPassives(
  state: BattleState,
  unitId: string,
  passives: readonly PassiveInstance[],
): BattleState {
  if (passives.length === 0) return state
  return {
    ...state,
    passivesByUnitId: {
      ...state.passivesByUnitId,
      [unitId]: passives,
    },
  }
}

function passiveChanceRng(state: BattleState): () => number {
  if (state.passiveRng) return state.passiveRng
  return () => ((state.battleLog.length * 17 + 31) % 100) / 100
}

function passiveLevelRng(state: BattleState): () => number {
  let seq = 0
  return () => {
    seq += 1
    if (state.passiveRng) {
      return Math.floor(state.passiveRng() * 100) + 1
    }
    return ((state.battleLog.length * 17 + 31 + seq * 13) % 100) + 1
  }
}

function applyPassivePatches(
  state: BattleState,
  patches: readonly PassiveCombatPatch[],
  fromCard?: { cardId: string; templateId: string },
): { state: BattleState; killed: Unit | null } {
  let next = state
  const log: BattleLogEntry[] = []
  let killed: Unit | null = null

  for (const patch of patches) {
    if (patch.kind === 'dodge') {
      continue
    }

    if (patch.kind === 'dodge_heal') {
      const unit = getUnit(next, patch.targetId)
      if (!isAliveUnit(unit)) continue
      const healed = withHeal(unit, patch.amount)
      next = updateUnit(next, patch.targetId, healed)
      log.push({
        type: 'heal',
        healerId: patch.targetId,
        targetId: patch.targetId,
        amount: patch.amount,
      })
      continue
    }

    if (patch.kind === 'heal' || patch.kind === 'heal_splash') {
      const target = getUnit(next, patch.targetId)
      if (!isAliveUnit(target)) continue
      const healed = withHeal(target, patch.amount)
      next = updateUnit(next, patch.targetId, healed)
      log.push({
        type: 'heal',
        healerId: patch.healerId,
        targetId: patch.targetId,
        amount: patch.amount,
        ...(fromCard ? { fromCard } : {}),
      })
      continue
    }

    if (patch.kind === 'defense_add') {
      const unit = getUnit(next, patch.unitId)
      if (!isAliveUnit(unit)) continue
      const effect = {
        id: `battle-line-def-${patch.unitId}-${next.battleLog.length}`,
        kind: 'defense_up' as const,
        remainingTurns: 1,
        magnitude: patch.amount,
        sourceTemplateId: 'warrior_battle_line',
      }
      next = updateUnit(next, patch.unitId, appendUnitStatus(unit, effect))
      continue
    }

    if (patch.kind === 'regen_bonus') {
      const target = getUnit(next, patch.unitId)
      if (!isAliveUnit(target)) continue
      const healed = withHeal(target, patch.amount)
      next = updateUnit(next, patch.unitId, healed)
      log.push({
        type: 'heal',
        healerId: patch.unitId,
        targetId: patch.unitId,
        amount: patch.amount,
        ...(fromCard ? { fromCard } : {}),
      })
      continue
    }

    if (patch.kind === 'apply_status') {
      const target = getUnit(next, patch.targetId)
      if (!isAliveUnit(target)) continue
      const effect = statusForSkill(patch.statusTemplateId, patch.effectPower)
      if (effect) {
        next = updateUnit(next, patch.targetId, appendUnitStatus(target, effect))
        log.push({
          type: 'status_applied',
          unitId: patch.targetId,
          statusKind: effect.kind,
          sourceTemplateId: patch.statusTemplateId,
        })
      }
      continue
    }

    if (patch.kind === 'aoe_splash') {
      for (const [nx, ny] of orthoNeighbors(patch.centerX, patch.centerY)) {
        const splashTarget = next.units.find(
          (u) => u.hp > 0 && u.x === nx && u.y === ny && u.id !== patch.attackerId,
        )
        if (!splashTarget) continue
        const updated = withDamage(splashTarget, patch.damage)
        const wasKill = updated.hp <= 0 && splashTarget.hp > 0
        next = updateUnit(next, splashTarget.id, updated)
        log.push({
          type: 'strike',
          attackerId: patch.attackerId,
          targetId: splashTarget.id,
          damage: patch.damage,
          attackKind: 'aoe',
          targetKilled: wasKill,
          ...(fromCard ? { fromCard } : {}),
        })
        if (wasKill && splashTarget.side === 'enemy') killed = updated
      }
      continue
    }

    if (patch.kind === 'reflect' || patch.kind === 'counter_strike' || patch.kind === 'extra_strike') {
      const target = getUnit(next, patch.targetId)
      if (!isAliveUnit(target)) continue
      const updated = withDamage(target, patch.damage)
      const wasKill = updated.hp <= 0 && target.hp > 0
      next = updateUnit(next, patch.targetId, updated)
      log.push({
        type: 'strike',
        attackerId: patch.attackerId,
        targetId: patch.targetId,
        damage: patch.damage,
        attackKind: patch.kind === 'extra_strike' ? patch.attackKind : 'melee',
        targetKilled: wasKill,
        ...(fromCard ? { fromCard } : {}),
      })
      if (wasKill) killed = updated
      continue
    }

    if (patch.kind === 'initiative_add') {
      const unit = getUnit(next, patch.unitId)
      if (!isAliveUnit(unit)) continue
      next = updateUnit(next, patch.unitId, {
        ...unit,
        initiativeBase: (unit.initiativeBase ?? 0) + patch.amount,
      })
    }
  }

  next = appendLog(next, log)
  return { state: next, killed }
}

function triggerUnitPassives(
  state: BattleState,
  trigger: PassiveTrigger,
  actor: Unit,
  ctx: Omit<PassiveFireInput, 'trigger' | 'passives' | 'passiveEquip' | 'actor' | 'battle' | 'rng' | 'randomInt1to100'>,
): { state: BattleState; killed: Unit | null; dodged: boolean } {
  const passives = unitPassives(state, actor.id)
  if (passives.length === 0) return { state, killed: null, dodged: false }

  const result = firePassives({
    trigger,
    passives,
    passiveEquip: passiveEquipFromBattlePassives(passives),
    actor,
    battle: state,
    rng: passiveChanceRng(state),
    randomInt1to100: passiveLevelRng(state),
    luckyPassiveProgress: state.luckyPassiveProgressByUnitId?.[actor.id],
    ...ctx,
  })

  let next = updateUnitPassives(state, actor.id, result.passives)
  next = appendLog(next, result.log)
  const patchResult = applyPassivePatches(next, result.combatPatches, ctx.fromCard)
  return {
    state: patchResult.state,
    killed: patchResult.killed,
    dodged: result.dodged,
  }
}

/** Advances turn and fires on_turn_start / on_regen_tick passives for the current actor. */
export function advanceBattleTurn(state: BattleState): BattleState {
  const logLen = state.battleLog.length
  let next = advanceTurn(state)
  if (next.phase !== 'ongoing') return next

  const actorId = getCurrentActorId(next)
  if (!actorId) return next
  const actor = getUnit(next, actorId)
  if (!isAliveUnit(actor)) return next
  if (unitPassives(next, actorId).length === 0) return next

  let regenHeal = 0
  for (const entry of next.battleLog.slice(logLen)) {
    if (entry.type === 'status_tick' && entry.unitId === actorId && entry.regenHeal) {
      regenHeal = entry.regenHeal
    }
  }

  const turnStart = triggerUnitPassives(next, 'on_turn_start', actor, {})
  next = turnStart.state

  if (regenHeal > 0) {
    const regenTick = triggerUnitPassives(next, 'on_regen_tick', actor, { regenHeal })
    next = regenTick.state
  }

  return next
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
  const attacker = getUnit(state, params.attackerId)
  if (!isAliveUnit(target) || !isAliveUnit(attacker)) return { state, killed: null }

  let damage = params.damage
  const attackerPassives = unitPassives(state, attacker.id)
  if (attacker.baseStats) {
    damage = applyPassiveAttackBonus(state, attacker, damage)
    const mult = computePassiveStrikeDamageMult(attackerPassives, attacker)
    damage = Math.round(damage * mult)
    damage = applyEnemyAffinityDamageMult(state, attacker, damage, params.fromCard)
    if (!params.fromCard) {
      damage = rollPassiveCritDamage(state, attacker, damage, passiveChanceRng(state))
    }
  }

  let next = state
  let dodged = false

  if (unitPassives(next, target.id).length > 0) {
    const dodgeCheck = triggerUnitPassives(next, 'on_damaged', target, {
      phase: 'dodge',
      attackerId: params.attackerId,
      damageDealt: damage,
      attackKind: params.attackKind,
      ...(params.fromCard !== undefined ? { fromCard: params.fromCard } : {}),
    })
    next = dodgeCheck.state
    dodged = dodgeCheck.dodged
  }

  if (dodged) {
    return { state: next, killed: null }
  }

  const damageBeforeTargetMitigation = damage

  const damageTags = params.fromCard
    ? resolveCardDamageTags(params.fromCard.templateId)
    : [params.attackKind]

  if (target.baseStats) {
    const ignoreFactor = defenseMitigationFactor(next, attacker, target)
    damage = mitigatePassiveDefense(next, target, damage, ignoreFactor)
  }

  damage = mitigateEnemyRangedWard(next, target, damage, params.attackKind, damageTags)

  const currentTarget = getUnit(next, params.targetId)
  if (!isAliveUnit(currentTarget)) return { state: next, killed: null }

  damage = applyRaceDamageModifiers(damage, damageTags, currentTarget.raceId)
  damage = applyElementalResistModifiers(
    damage,
    params.fromCard?.templateId,
    currentTarget,
  )

  const negated = tryNegateSpellDamage(
    damage,
    damageTags,
    currentTarget,
    params.fromCard?.templateId,
  )
  damage = negated.damage
  if (negated.unit !== currentTarget) {
    next = updateUnit(next, params.targetId, negated.unit)
  }

  const strikeTarget = getUnit(next, params.targetId)
  if (!isAliveUnit(strikeTarget)) return { state: next, killed: null }

  const finalDamage = damage
  const absorbedDamage = Math.max(0, damageBeforeTargetMitigation - finalDamage)

  const updated = withDamage(strikeTarget, finalDamage)
  const wasKill = updated.hp <= 0 && strikeTarget.hp > 0
  next = updateUnit(next, params.targetId, updated)
  const log: BattleLogEntry[] = [
    {
      type: 'strike',
      attackerId: params.attackerId,
      targetId: params.targetId,
      damage: finalDamage,
      attackKind: params.attackKind,
      targetKilled: wasKill,
      ...(absorbedDamage > 0 ? { absorbedDamage } : {}),
      ...(params.fromCard ? { fromCard: params.fromCard } : {}),
    },
  ]
  next = appendLog(next, log)

  let killed: Unit | null = wasKill ? updated : null

  const gearResult = applyGearOnHitProcs(next, params.targetId, params.attackerId)
  next = gearResult.state
  if (gearResult.killed) killed = gearResult.killed

  const attackerProcs = applyAttackerOnHitProcs(next, params, damage)
  next = attackerProcs.state
  if (attackerProcs.killed) killed = attackerProcs.killed

  const damagedTarget = getUnit(next, params.targetId)
  if (isAliveUnit(damagedTarget) && damage > 0 && unitPassives(next, damagedTarget.id).length > 0) {
    const damaged = triggerUnitPassives(next, 'on_damaged', damagedTarget, {
      phase: 'post_damage',
      attackerId: params.attackerId,
      damageDealt: damage,
      attackKind: params.attackKind,
      ...(params.fromCard !== undefined ? { fromCard: params.fromCard } : {}),
    })
    next = damaged.state
    if (damaged.killed) killed = damaged.killed
  }

  const strikingAttacker = getUnit(next, params.attackerId)
  if (isAliveUnit(strikingAttacker) && unitPassives(next, strikingAttacker.id).length > 0) {
    const trigger = params.fromCard ? 'on_card_attack' : 'on_strike'
    const fired = triggerUnitPassives(next, trigger, strikingAttacker, {
      targetId: params.targetId,
      damageDealt: damage,
      attackKind: params.attackKind,
      targetX: target.x,
      targetY: target.y,
      ...(params.fromCard !== undefined ? { fromCard: params.fromCard } : {}),
    })
    next = fired.state
    if (fired.killed) killed = fired.killed
  }

  if (wasKill && target.side === 'enemy') {
    const killer = getUnit(next, params.attackerId)
    if (isAliveUnit(killer) && unitPassives(next, killer.id).length > 0) {
      const killFired = triggerUnitPassives(next, 'on_kill', killer, {
        targetId: params.targetId,
      })
      next = killFired.state
      if (killFired.killed) killed = killFired.killed
    }
  }

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

  if (unitPassives(next, moved.id).length > 0) {
    const moveCells = manhattan(unit.x, unit.y, toX, toY)
    const fired = triggerUnitPassives(next, 'on_move', moved, { moveCells })
    next = fired.state
  }

  next = afterHpChange(next, null)
  if (next.phase !== 'ongoing') return next
  return advanceBattleTurn(next)
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
  const rangeBonus =
    action.kind === 'ranged'
      ? computePassiveRangedRangeBonus(unitPassives(state, attacker.id), attacker, state)
      : 0
  if (
    action.kind === 'ranged' &&
    !action.fromCard &&
    attacker.side === 'player' &&
    !isHeroRangedReady(state, action.attackerId)
  ) {
    return state
  }

  const ok =
    action.kind === 'melee'
      ? canMeleeAttack(attacker, target)
      : canRangedAttack(attacker, target, action.maxRange + rangeBonus, walls)
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
  if (action.kind === 'ranged' && !action.fromCard && attacker.side === 'player') {
    next = setHeroRangedCooldown(next, action.attackerId)
  }
  next = applySelfHealOnUse(next, action.attackerId, action.modCtx, action.fromCard)
  next = afterHpChange(next, killed)
  if (next.phase !== 'ongoing') return next
  return advanceBattleTurn(next)
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
  return advanceBattleTurn(next)
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

  const healAmount = Math.round(
    modifyHealReceived(applyPassiveHealBonus(state, healer, action.amount), target) *
      antiHealMultiplierFromAdjacentEnemies(state, target),
  )
  const updated = withHeal(target, healAmount)
  let next = updateUnit(state, action.targetId, updated)
  const log: BattleLogEntry[] = [
    {
      type: 'heal',
      healerId: action.healerId,
      targetId: action.targetId,
      amount: healAmount,
      ...(action.fromCard !== undefined ? { fromCard: action.fromCard } : {}),
    },
  ]

  const ctx = toModCtx(action.modCtx)
  if (ctx) {
    const splashAmount = computeHealSplashAmount(action.amount, ctx)
    if (splashAmount > 0) {
      log.push(modProcLog('mod-ally-heal-splash', 'Окружение светом', action.healerId))
      for (const ally of findHealSplashTargets(next, target)) {
        const splashed = withHeal(
          ally,
          Math.round(
            modifyHealReceived(splashAmount, ally) *
              antiHealMultiplierFromAdjacentEnemies(next, ally),
          ),
        )
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

  const healerAfter = getUnit(next, action.healerId)
  if (isAliveUnit(healerAfter) && unitPassives(next, healerAfter.id).length > 0) {
    const fired = triggerUnitPassives(next, 'on_card_heal', healerAfter, {
      targetId: action.targetId,
      healAmount: healAmount,
      ...(action.fromCard !== undefined ? { fromCard: action.fromCard } : {}),
    })
    next = fired.state
  }

  next = afterHpChange(next, null)
  if (next.phase !== 'ongoing') return next
  return advanceBattleTurn(next)
}

function applyCardStatuses(
  state: BattleState,
  unitId: string,
  effects: ReturnType<typeof statusForSkill>[],
): BattleState {
  const filtered = effects.filter((e): e is NonNullable<typeof e> => e !== null)
  if (filtered.length === 0) return state
  return {
    ...state,
    units: state.units.map((u) => {
      if (u.id !== unitId) return u
      let next = u
      for (const e of filtered) {
        next = appendUnitStatus(next, weakenHolyBuffIfNeeded(e, next))
      }
      return next
    }),
    battleLog: [
      ...state.battleLog,
      ...filtered.map((e) => ({
        type: 'status_applied' as const,
        unitId,
        statusKind: e.kind,
        sourceTemplateId: e.sourceTemplateId,
      })),
    ],
  }
}

function setEnemyCardCooldown(
  state: BattleState,
  actorId: string,
  card: BattlePlayerCard,
  cooldownTurns: number,
): BattleState {
  const cards = state.enemyCardsByUnitId?.[actorId]
  if (!cards) return state
  const nextCard: BattlePlayerCard = { ...card, cooldownRemaining: cooldownTurns }
  return updateActorEnemyCards(
    state,
    actorId,
    cards.map((c) => (c.id === card.id ? nextCard : c)),
  )
}

function tryCardAttack(
  state: BattleState,
  action: Extract<BattleAction, { type: 'card_attack' }>,
): BattleState {
  const ptr = resolveActorPointer(state)
  const actorId = actorIdAtPointer(state, ptr)
  if (actorId === undefined || action.attackerId !== actorId) return state

  const attacker = getUnit(state, action.attackerId)
  if (!isAliveUnit(attacker) || attacker.side !== 'enemy') return state

  const cards = state.enemyCardsByUnitId?.[action.attackerId]
  const card = cards?.find((c) => c.id === action.cardId)
  if (!card || card.cooldownRemaining > 0) return state

  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return state

  const walls = wallSet(state.walls)
  const fromCard = { cardId: card.id, templateId: card.templateId }
  const cd = tmpl.cooldownTurns ?? 0
  let next = setEnemyCardCooldown(state, action.attackerId, card, cd)
  if (cd > 0) {
    next = { ...next, skipEnemyCooldownTick: true }
  }

  if (isBossSkillHandledInMechanics(card.templateId)) {
    const effectPower = resolveEnemySkillEffectPower(attacker, card, tmpl, next.worldPower) ?? 0
    next = applyBossSkillUse(next, {
      attackerId: action.attackerId,
      targetId: action.targetId,
      targetX: action.targetX,
      targetY: action.targetY,
      card,
      effectPower,
      rng: () => ((next.battleLog.length * 13 + 7) % 100) / 100,
    })
    next = afterHpChange(next, null)
    if (next.phase !== 'ongoing') return next
    return advanceBattleTurn(next)
  }

  if (usesCardAoEDispatch(tmpl)) {
    const targetX = action.targetX
    const targetY = action.targetY
    if (targetX === undefined || targetY === undefined) return state
    if (!canCastAoEAt(attacker, targetX, targetY, tmpl.maxRange, walls)) return state

    const damage = resolveEnemySkillAmount(attacker, card, tmpl, next.worldPower) ?? 0
    const effectPower = resolveEnemySkillEffectPower(attacker, card, tmpl, next.worldPower) ?? 0
    next = applyAction(next, {
      type: 'aoe_strike',
      attackerId: action.attackerId,
      centerX: targetX,
      centerY: targetY,
      damage,
      aoeSize: tmpl.aoeSize ?? 3,
      fromCard,
    })
    if (card.templateId === 'boss_ward_pulse') {
      next = stripStealthInAoE(next, targetX, targetY, tmpl.aoeSize ?? 5)
    }
    if (tmpl.kind === 'debuff' || tmpl.kind === 'dot') {
      const aoe = cellsInAoE(targetX, targetY, tmpl.aoeSize ?? 3, next.width, next.height)
      for (const u of next.units) {
        if (u.side !== 'player' || u.hp <= 0) continue
        if (!aoe.has(cellKey(u.x, u.y))) continue
        const status = statusForSkill(card.templateId, effectPower)
        next = applyCardStatuses(next, u.id, [status])
      }
    }
    return next
  }

  const targetId = action.targetId
  if (!targetId) return state
  const target = getUnit(state, targetId)
  if (!isAliveUnit(target) || target.side !== 'player') return state

  if (usesCardUtilitySingleDispatch(tmpl)) {
    if (!canRangedAttack(attacker, target, tmpl.maxRange, walls)) return state
    const effectPower = resolveEnemySkillEffectPower(attacker, card, tmpl, next.worldPower) ?? 0
    const status = statusForSkill(card.templateId, effectPower)
    next = applyCardStatuses(next, target.id, [status])
    next = appendLog(next, [
      {
        type: 'strike',
        attackerId: action.attackerId,
        targetId: target.id,
        damage: 0,
        attackKind: 'ranged',
        targetKilled: false,
        fromCard,
      },
    ])
    next = afterHpChange(next, null)
    if (next.phase !== 'ongoing') return next
    return advanceBattleTurn(next)
  }

  if (!usesCardAttackDispatch(tmpl.kind) && tmpl.kind !== 'debuff') return state

  const inRange =
    tmpl.kind === 'melee' || tmpl.kind === 'dot'
      ? canMeleeAttack(attacker, target)
      : canRangedAttack(attacker, target, tmpl.maxRange, walls)
  if (!inRange) return state

  const damage = resolveEnemySkillAmount(attacker, card, tmpl, next.worldPower)
  if (damage === null) return state

  const battleAction: BattleAction =
    tmpl.kind === 'melee' || tmpl.kind === 'dot'
      ? {
          type: 'attack',
          attackerId: action.attackerId,
          targetId: target.id,
          damage,
          kind: 'melee',
          fromCard,
        }
      : {
          type: 'attack',
          attackerId: action.attackerId,
          targetId: target.id,
          damage,
          kind: 'ranged',
          maxRange: tmpl.maxRange,
          fromCard,
        }

  next = applyAction(next, battleAction)
  if (tmpl.kind === 'dot' || tmpl.kind === 'debuff') {
    const effectPower = resolveEnemySkillEffectPower(attacker, card, tmpl, next.worldPower) ?? 0
    const status = statusForSkill(card.templateId, effectPower)
    next = applyCardStatuses(next, target.id, [status])
  }
  return next
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
    case 'card_attack':
      return tryCardAttack(state, action)
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
