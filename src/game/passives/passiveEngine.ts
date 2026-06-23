import { getPassiveModTemplate } from '../content/passiveModTemplates'
import type { PassiveTrigger } from '../content/passiveTemplates'
import { getPassiveTemplate } from '../content/passiveTemplates'
import { resolveCarrierTags } from '../mods/carrierTags'
import { scaleModValue } from '../memento/modScaling'
import { HERO_BASIC_MELEE_DAMAGE } from '../battle/combat'
import { manhattan, orthoNeighbors } from '../battle/grid'
import { bossNoFlankDefenseBonus } from './enemyPassiveCombat'
import type { BattleLogEntry, BattleState, PassiveEquipLoadout, PassiveInstance, Unit } from '../types'
import { getEquippedPassives } from './equippedPassives'
import { applyPassiveProgress } from './passiveProgress'
import { passiveTierMult } from './passiveBonus'

export type PassiveCombatPatch =
  | {
      kind: 'counter_strike'
      attackerId: string
      targetId: string
      damage: number
    }
  | {
      kind: 'extra_strike'
      attackerId: string
      targetId: string
      damage: number
      attackKind: 'melee' | 'ranged'
    }
  | {
      kind: 'reflect'
      attackerId: string
      targetId: string
      damage: number
    }
  | {
      kind: 'dodge_heal'
      targetId: string
      amount: number
    }
  | {
      kind: 'heal'
      healerId: string
      targetId: string
      amount: number
    }
  | {
      kind: 'heal_splash'
      healerId: string
      targetId: string
      amount: number
    }
  | {
      kind: 'defense_add'
      unitId: string
      amount: number
    }
  | {
      kind: 'initiative_add'
      unitId: string
      amount: number
    }
  | {
      kind: 'dodge'
      targetId: string
    }
  | {
      kind: 'apply_status'
      targetId: string
      statusTemplateId: string
      effectPower: number
    }
  | {
      kind: 'regen_bonus'
      unitId: string
      amount: number
    }

  | {
      kind: 'aoe_splash'
      attackerId: string
      centerX: number
      centerY: number
      damage: number
    }

export type PassiveFirePhase = 'full' | 'dodge' | 'post_damage'
export type PassiveFireResult = {
  passives: PassiveInstance[]
  log: BattleLogEntry[]
  combatPatches: PassiveCombatPatch[]
  dodged: boolean
}

export type PassiveFireInput = {
  trigger: PassiveTrigger
  passives: readonly PassiveInstance[]
  passiveEquip: PassiveEquipLoadout
  actor: Unit
  battle: BattleState
  rng: () => number
  randomInt1to100: () => number
  attackerId?: string
  targetId?: string
  damageDealt?: number
  healAmount?: number
  moveCells?: number
  fromCard?: { cardId: string; templateId: string }
  attackKind?: 'melee' | 'ranged' | 'aoe'
  phase?: PassiveFirePhase
  regenHeal?: number
  targetX?: number
  targetY?: number
}

function passiveModProcBonus(passive: PassiveInstance): number {
  let bonus = 0
  for (const slot of passive.modSlots) {
    if (slot.status !== 'filled') continue
    const tmpl = getPassiveModTemplate(slot.templateId)
    if (!tmpl) continue
    for (const op of tmpl.ops) {
      if (op.kind === 'crit_chance_add') {
        bonus += scaleModValue(op.base, slot.lm, op.scaleMode)
      }
    }
  }
  return bonus
}

function rollPassiveProc(
  passive: PassiveInstance,
  templateProcChance: number | undefined,
  rng: () => number,
): boolean {
  if (templateProcChance === undefined) return true
  const chance = templateProcChance + passiveModProcBonus(passive)
  if (chance <= 0) return false
  return rng() <= chance
}

function scaledPassiveOpValue(
  base: number,
  passive: PassiveInstance,
  scaleMode: 'percent' | 'flat',
): number {
  return scaleModValue(base * passiveTierMult(passive.global_level), 0, scaleMode)
}

function passiveProcLog(
  templateId: string,
  procSuccess: boolean,
  unitId: string,
  targetId?: string,
): BattleLogEntry {
  return {
    type: 'passive_proc',
    templateId,
    procSuccess,
    unitId,
    ...(targetId !== undefined ? { targetId } : {}),
  }
}

function resolveTemplatePassive(
  passive: PassiveInstance,
  input: PassiveFireInput,
): { patches: PassiveCombatPatch[]; triggered: boolean } {
  const template = getPassiveTemplate(passive.templateId)
  if (!template) return { patches: [], triggered: false }

  const patches: PassiveCombatPatch[] = []

  if (template.id === 'rogue_smoke_veil') {
    const proc = rollPassiveProc(passive, template.procChance, input.rng)
    if (!proc) return { patches: [], triggered: false }
    patches.push({ kind: 'dodge', targetId: input.actor.id })
    return { patches, triggered: true }
  }

  if (template.id === 'ranger_far_sight') {
    const hasAdjacentEnemy = input.battle.units.some(
      (u) =>
        u.side === 'enemy' &&
        u.hp > 0 &&
        manhattan(u.x, u.y, input.actor.x, input.actor.y) === 1,
    )
    if (hasAdjacentEnemy) return { patches: [], triggered: false }
    return { patches: [], triggered: (input.moveCells ?? 0) >= 1 }
  }

  if (template.id === 'berserker_desperation') {
    const lowHp = input.actor.hp * 2 < input.actor.maxHp
    return { patches: [], triggered: lowHp }
  }

  if (template.id === 'enemy_thorns' && input.attackerId && input.attackKind === 'melee') {
    const damage = input.damageDealt ?? 0
    if (damage <= 0) return { patches: [], triggered: false }
    const reflectDamage = Math.max(
      1,
      Math.round(damage * scaledPassiveOpValue(0.2, passive, 'percent')),
    )
    patches.push({
      kind: 'reflect',
      attackerId: input.actor.id,
      targetId: input.attackerId,
      damage: reflectDamage,
    })
    return { patches, triggered: true }
  }

  if (template.id === 'boss_reflect_rage' && input.attackerId && input.attackKind === 'melee') {
    const damage = input.damageDealt ?? 0
    if (damage <= 0) return { patches: [], triggered: false }
    const reflectDamage = Math.max(
      1,
      Math.round(damage * scaledPassiveOpValue(0.3, passive, 'percent')),
    )
    patches.push({
      kind: 'reflect',
      attackerId: input.actor.id,
      targetId: input.attackerId,
      damage: reflectDamage,
    })
    return { patches, triggered: true }
  }

  if (template.id === 'boss_no_flank' && input.trigger === 'on_turn_start') {
    const bonus = bossNoFlankDefenseBonus([passive])
    if (bonus > 0) {
      patches.push({ kind: 'defense_add', unitId: input.actor.id, amount: bonus })
    }
    return { patches, triggered: bonus > 0 }
  }

  if (template.id === 'enemy_rage_trait' && input.trigger === 'on_strike') {
    const lowHp = input.actor.hp * 2 < input.actor.maxHp
    return { patches: [], triggered: lowHp }
  }

  if (template.id === 'paladin_holy_reflect') {
    const damage = input.damageDealt ?? 0
    if (damage <= 0 || !input.attackerId) return { patches: [], triggered: false }
    const reflectDamage = Math.max(
      1,
      Math.round(damage * scaledPassiveOpValue(0.1, passive, 'percent')),
    )
    patches.push({
      kind: 'reflect',
      attackerId: input.actor.id,
      targetId: input.attackerId,
      damage: reflectDamage,
    })
    return { patches, triggered: true }
  }

  if (template.id === 'warlock_life_tap') {
    const damage = input.damageDealt ?? 0
    if (damage <= 0) return { patches: [], triggered: false }
    const heal = Math.round(damage * scaledPassiveOpValue(0.08, passive, 'percent'))
    if (heal > 0) {
      patches.push({
        kind: 'heal',
        healerId: input.actor.id,
        targetId: input.actor.id,
        amount: heal,
      })
    }
    return { patches, triggered: heal > 0 }
  }

  if (template.effectKind === 'proc') {
    const proc = rollPassiveProc(passive, template.procChance, input.rng)
    if (!proc) return { patches: [], triggered: false }

    if (template.id === 'warrior_riposte' && input.attackerId) {
      const attacker = input.battle.units.find((u) => u.id === input.attackerId)
      if (
        attacker &&
        attacker.hp > 0 &&
        manhattan(attacker.x, attacker.y, input.actor.x, input.actor.y) === 1
      ) {
        patches.push({
          kind: 'counter_strike',
          attackerId: input.actor.id,
          targetId: input.attackerId,
          damage: HERO_BASIC_MELEE_DAMAGE,
        })
      }
      return { patches, triggered: patches.length > 0 }
    }

    if (template.id === 'ranger_double_tap' && input.targetId) {
      patches.push({
        kind: 'extra_strike',
        attackerId: input.actor.id,
        targetId: input.targetId,
        damage: HERO_BASIC_MELEE_DAMAGE,
        attackKind: 'ranged',
      })
      return { patches, triggered: true }
    }

    if (template.id === 'berserker_twin_cleave' && input.targetId) {
      patches.push({
        kind: 'extra_strike',
        attackerId: input.actor.id,
        targetId: input.targetId,
        damage: HERO_BASIC_MELEE_DAMAGE,
        attackKind: 'melee',
      })
      return { patches, triggered: true }
    }

    if (template.id === 'mage_frost_ward' && input.attackerId) {
      patches.push({ kind: 'initiative_add', unitId: input.attackerId, amount: -1 })
      return { patches, triggered: true }
    }

    if (template.id === 'warrior_battle_line') {
      const allies = countAdjacentAllies(input.battle, input.actor)
      if (allies > 0) {
        patches.push({
          kind: 'defense_add',
          unitId: input.actor.id,
          amount: allies,
        })
      }
      return { patches, triggered: allies > 0 }
    }

    if (template.id === 'healer_splash_heal' && input.targetId && (input.healAmount ?? 0) > 0) {
      const splash = Math.round((input.healAmount ?? 0) * 0.5)
      const splashTarget = findHealSplashTarget(input.battle, input.targetId)
      if (splashTarget && splash > 0) {
        patches.push({
          kind: 'heal_splash',
          healerId: input.actor.id,
          targetId: splashTarget.id,
          amount: splash,
        })
      }
      return { patches, triggered: patches.length > 0 }
    }

    if (template.id === 'paladin_intercession') {
      const ally = findLowHpAllyInRange(input.battle, input.actor, 2)
      const heal = Math.max(1, Math.round(input.actor.maxHp * 0.1))
      if (ally) {
        patches.push({
          kind: 'heal',
          healerId: input.actor.id,
          targetId: ally.id,
          amount: heal,
        })
      }
      return { patches, triggered: patches.length > 0 }
    }

    if (template.id === 'healer_renewal') {
      const bonus = Math.max(1, Math.round(scaledPassiveOpValue(1, passive, 'flat')))
      patches.push({ kind: 'regen_bonus', unitId: input.actor.id, amount: bonus })
      return { patches, triggered: true }
    }

    if (template.id === 'mage_ignite' && input.targetId) {
      const target = input.battle.units.find((u) => u.id === input.targetId)
      const splashDamage = Math.max(1, Math.round((input.damageDealt ?? 0) * 0.5))
      if (target && splashDamage > 0) {
        patches.push({
          kind: 'aoe_splash',
          attackerId: input.actor.id,
          centerX: target.x,
          centerY: target.y,
          damage: splashDamage,
        })
      }
      return { patches, triggered: patches.length > 0 }
    }

    if (template.id === 'rogue_venom' && input.targetId) {
      patches.push({
        kind: 'apply_status',
        targetId: input.targetId,
        statusTemplateId: 'poison_blade',
        effectPower: Math.max(3, input.damageDealt ?? 3),
      })
      return { patches, triggered: true }
    }

    if (template.id === 'warlock_spread_plague' && input.targetId) {
      const killed = input.battle.units.find((u) => u.id === input.targetId)
      if (!killed) return { patches: [], triggered: false }
      for (const [nx, ny] of orthoNeighbors(killed.x, killed.y)) {
        const neighbor = input.battle.units.find(
          (u) => u.side === 'enemy' && u.hp > 0 && u.x === nx && u.y === ny,
        )
        if (neighbor) {
          patches.push({
            kind: 'apply_status',
            targetId: neighbor.id,
            statusTemplateId: 'corruption',
            effectPower: 6,
          })
        }
      }
      return { patches, triggered: patches.length > 0 }
    }

    return { patches, triggered: patches.length > 0 }
  }

  if (template.effectKind === 'stat_flat' || template.effectKind === 'stat_pct') {
    return { patches: [], triggered: true }
  }

  if (template.effectKind === 'conditional') {
    return { patches, triggered: patches.length > 0 }
  }

  return { patches: [], triggered: false }
}

function countAdjacentAllies(battle: BattleState, actor: Unit): number {
  let count = 0
  for (const [nx, ny] of orthoNeighbors(actor.x, actor.y)) {
    const ally = battle.units.find(
      (u) =>
        u.side === actor.side &&
        u.hp > 0 &&
        u.id !== actor.id &&
        u.x === nx &&
        u.y === ny,
    )
    if (ally) count += 1
  }
  return count
}

function findHealSplashTarget(battle: BattleState, primaryTargetId: string): Unit | undefined {
  const primary = battle.units.find((u) => u.id === primaryTargetId)
  if (!primary) return undefined
  for (const [nx, ny] of orthoNeighbors(primary.x, primary.y)) {
    const ally = battle.units.find(
      (u) =>
        u.side === 'player' &&
        u.hp > 0 &&
        u.id !== primaryTargetId &&
        u.x === nx &&
        u.y === ny,
    )
    if (ally) return ally
  }
  return undefined
}

function findLowHpAllyInRange(battle: BattleState, actor: Unit, range: number): Unit | undefined {
  let best: Unit | undefined
  for (const u of battle.units) {
    if (u.side !== 'player' || u.hp <= 0 || u.id === actor.id) continue
    if (u.hp * 2 >= u.maxHp) continue
    const d = manhattan(actor.x, actor.y, u.x, u.y)
    if (d > range) continue
    if (!best || u.hp / u.maxHp < best.hp / best.maxHp) best = u
  }
  return best
}

export function computePassiveStrikeDamageMult(
  passives: readonly PassiveInstance[],
  actor: Unit,
): number {
  let mult = 1
  const desperate = passives.find((p) => p.templateId === 'berserker_desperation')
  if (desperate) {
    if (actor.hp * 2 < actor.maxHp) {
      const template = getPassiveTemplate('berserker_desperation')
      if (template) {
        mult *= 1 + scaledPassiveOpValue(0.25, desperate, 'percent')
      }
    }
  }
  const rageTrait = passives.find((p) => p.templateId === 'enemy_rage_trait')
  if (rageTrait && actor.hp * 2 < actor.maxHp) {
    mult *= 1 + scaledPassiveOpValue(0.25, rageTrait, 'percent')
  }
  return mult
}

export function computePassiveRangedRangeBonus(
  passives: readonly PassiveInstance[],
  actor: Unit,
  battle: BattleState,
): number {
  const farSight = passives.find((p) => p.templateId === 'ranger_far_sight')
  if (!farSight) return 0
  const hasAdjacentEnemy = battle.units.some(
    (u) =>
      u.side === 'enemy' && u.hp > 0 && manhattan(u.x, u.y, actor.x, actor.y) === 1,
  )
  if (hasAdjacentEnemy) return 0
  return Math.round(scaledPassiveOpValue(1, farSight, 'flat'))
}

export function firePassives(input: PassiveFireInput): PassiveFireResult {
  const equipped = getEquippedPassives(input.passives, input.passiveEquip)
  const passivesById = new Map(input.passives.map((p) => [p.id, { ...p }]))
  const log: BattleLogEntry[] = []
  const combatPatches: PassiveCombatPatch[] = []
  const phase = input.phase ?? 'full'
  let dodged = false

  for (const passive of equipped) {
    const template = getPassiveTemplate(passive.templateId)
    if (!template || template.levelTrigger !== input.trigger) continue
    if (input.trigger === 'on_move' && (input.moveCells ?? 0) < 1) continue
    if (input.trigger === 'on_regen_tick' && (input.regenHeal ?? 0) <= 0) continue

    const isSmokeVeil = template.id === 'rogue_smoke_veil'
    if (phase === 'dodge' && !isSmokeVeil) continue
    if (phase !== 'dodge' && isSmokeVeil) continue

    void resolveCarrierTags('passive', passive.templateId)

    const { patches, triggered } = resolveTemplatePassive(passive, input)
    if (!triggered) continue

    const progressed = applyPassiveProgress(passive, input.randomInt1to100())
    passivesById.set(passive.id, progressed)

    if (template.effectKind === 'proc' || template.effectKind === 'conditional') {
      log.push(
        passiveProcLog(
          template.id,
          true,
          input.actor.id,
          input.targetId ?? input.attackerId,
        ),
      )
    }

    if (patches.some((p) => p.kind === 'dodge')) dodged = true
    combatPatches.push(...patches)
  }

  return {
    passives: input.passives.map((p) => passivesById.get(p.id) ?? p),
    log,
    combatPatches,
    dodged,
  }
}
