import type { BattlePlayerCard, BattleState, Unit } from '../types'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { canRangedAttack } from './combat'
import { resolveCardDamageTags } from './enemyResists'
import { canCastAoEAt, cellsInAoE } from './rangeOverlay'
import { cellKey, inBounds, orthoNeighbors, wallSet } from './grid'
import {
  appendUnitStatus,
  hasUnitStatus,
  removeUnitStatusByKind,
  type UnitStatusEffect,
  unitStatuses,
} from './unitStatus'

export const BOSS_SKILL_TEMPLATE_IDS = [
  'boss_ground_slam',
  'boss_spell_eater',
  'boss_blink_adjacent',
  'boss_soul_mark',
  'boss_grave_silence',
  'boss_ward_pulse',
  'boss_decay_aura',
  'boss_holy_judgment',
  'boss_silence_dark',
  'boss_mirror_rage',
] as const

export type BossSkillTemplateId = (typeof BOSS_SKILL_TEMPLATE_IDS)[number]

export function isBossSkill(templateId: string): templateId is BossSkillTemplateId {
  return (BOSS_SKILL_TEMPLATE_IDS as readonly string[]).includes(templateId)
}

function statusId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()}`
}

export function bossStatusForSkill(templateId: string, _effectPower: number): UnitStatusEffect | null {
  switch (templateId) {
    case 'boss_soul_mark':
      return {
        id: statusId('soul-mark'),
        kind: 'soul_mark',
        remainingTurns: 3,
        magnitude: 50,
        sourceTemplateId: templateId,
      }
    case 'boss_grave_silence':
      return {
        id: statusId('grave-silence'),
        kind: 'grave_silence',
        remainingTurns: 3,
        magnitude: 1,
        sourceTemplateId: templateId,
      }
    case 'boss_spell_eater':
      return {
        id: statusId('spell-eaten'),
        kind: 'spell_eaten',
        remainingTurns: 99,
        magnitude: 1,
        sourceTemplateId: templateId,
      }
    case 'boss_silence_dark':
      return {
        id: statusId('silence-dark'),
        kind: 'silence_dark',
        remainingTurns: 2,
        magnitude: 1,
        sourceTemplateId: templateId,
      }
    case 'boss_decay_aura':
      return {
        id: statusId('decay-aura'),
        kind: 'decay_aura',
        remainingTurns: 2,
        magnitude: 50,
        sourceTemplateId: templateId,
      }
    default:
      return null
  }
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

export function freeOrthoAdjacentCells(
  state: BattleState,
  target: Unit,
  exceptUnitId: string,
): [number, number][] {
  const walls = wallSet(state.walls)
  return orthoNeighbors(target.x, target.y).filter(
    ([x, y]) =>
      inBounds(x, y, state.width, state.height) &&
      !walls.has(cellKey(x, y)) &&
      !aliveAtCell(state, x, y, exceptUnitId),
  )
}

export function pickBlinkDestination(
  state: BattleState,
  targetId: string,
  attackerId: string,
  rng: () => number,
): { x: number; y: number } | null {
  const target = state.units.find((u) => u.id === targetId)
  if (!target) return null
  const cells = freeOrthoAdjacentCells(state, target, attackerId)
  if (cells.length === 0) return null
  const idx = Math.floor(rng() * cells.length)
  const [x, y] = cells[idx]!
  return { x, y }
}

export function modifyHealReceived(amount: number, target: Unit): number {
  if (amount <= 0 || !hasUnitStatus(target, 'soul_mark')) return amount
  const mark = unitStatuses(target).find((s) => s.kind === 'soul_mark' && s.remainingTurns > 0)
  const pct = mark?.magnitude ?? 50
  return Math.max(0, Math.round(amount * (1 - pct / 100)))
}

export function isSpellDamage(tags: readonly string[], templateId?: string): boolean {
  if (tags.includes('magic')) return true
  if (!templateId) return false
  const tmpl = getCardAttackTemplate(templateId)
  if (!tmpl) return false
  return (
    tmpl.statSource === 'magicPower' &&
    (tmpl.kind === 'ranged' ||
      tmpl.kind === 'aoe' ||
      tmpl.kind === 'lifesteal_spell' ||
      tmpl.kind === 'dot')
  )
}

export function tryNegateSpellDamage(
  damage: number,
  tags: readonly string[],
  target: Unit,
  templateId?: string,
): { damage: number; unit: Unit } {
  if (
    damage <= 0 ||
    !isSpellDamage(tags, templateId) ||
    !hasUnitStatus(target, 'spell_eaten')
  ) {
    return { damage, unit: target }
  }
  return { damage: 0, unit: removeUnitStatusByKind(target, 'spell_eaten') }
}

export function isResurrectBlocked(target: Unit): boolean {
  return hasUnitStatus(target, 'grave_silence')
}

export function isDarkCardBlocked(target: Unit, cardTemplateId: string): boolean {
  if (!hasUnitStatus(target, 'silence_dark')) return false
  const tags = resolveCardDamageTags(cardTemplateId)
  return tags.includes('dark')
}

export function weakenHolyBuffIfNeeded(effect: UnitStatusEffect, target: Unit): UnitStatusEffect {
  if (!hasUnitStatus(target, 'decay_aura') || !effect.sourceTemplateId) return effect
  const tags = resolveCardDamageTags(effect.sourceTemplateId)
  if (!tags.includes('holy')) return effect
  const debuff = unitStatuses(target).find((s) => s.kind === 'decay_aura' && s.remainingTurns > 0)
  const pct = debuff?.magnitude ?? 50
  return { ...effect, magnitude: Math.max(0, Math.round(effect.magnitude * (1 - pct / 100))) }
}

export function stripStealthFromUnit(unit: Unit): Unit {
  return removeUnitStatusByKind(unit, 'stealth')
}

function updateUnit(state: BattleState, unitId: string, next: Unit): BattleState {
  return { ...state, units: state.units.map((u) => (u.id === unitId ? next : u)) }
}

function applyStatusesToUnit(
  state: BattleState,
  unitId: string,
  effects: (UnitStatusEffect | null)[],
): BattleState {
  const filtered = effects.filter((e): e is UnitStatusEffect => e !== null)
  if (filtered.length === 0) return state
  let next = state
  for (const effect of filtered) {
    const unit = next.units.find((u) => u.id === unitId)
    if (!unit) continue
    next = updateUnit(next, unitId, appendUnitStatus(unit, effect))
  }
  return {
    ...next,
    battleLog: [
      ...next.battleLog,
      ...filtered.map((e) => ({
        type: 'status_applied' as const,
        unitId,
        statusKind: e.kind,
        sourceTemplateId: e.sourceTemplateId,
      })),
    ],
  }
}

function applyStatusesInAoE(
  state: BattleState,
  centerX: number,
  centerY: number,
  aoeSize: number,
  templateId: string,
  effectPower: number,
): BattleState {
  const cells = cellsInAoE(centerX, centerY, aoeSize, state.width, state.height)
  let next = state
  for (const u of state.units) {
    if (u.side !== 'player' || u.hp <= 0) continue
    if (!cells.has(cellKey(u.x, u.y))) continue
    const status = bossStatusForSkill(templateId, effectPower)
    next = applyStatusesToUnit(next, u.id, [status])
  }
  return next
}

function copyAttackBuffFromTarget(attacker: Unit, target: Unit): Unit {
  const buff = unitStatuses(target).find((s) => s.kind === 'attack_up' && s.remainingTurns > 0)
  if (!buff) return attacker
  return appendUnitStatus(attacker, {
    ...buff,
    id: statusId('mirror-rage'),
    sourceTemplateId: 'boss_mirror_rage',
  })
}

export type BossSkillUseInput = {
  attackerId: string
  targetId?: string
  targetX?: number
  targetY?: number
  card: BattlePlayerCard
  effectPower: number
  rng: () => number
}

export function applyBossSkillUse(state: BattleState, input: BossSkillUseInput): BattleState {
  const tmpl = getCardAttackTemplate(input.card.templateId)
  if (!tmpl || !isBossSkill(input.card.templateId)) return state

  const attacker = state.units.find((u) => u.id === input.attackerId)
  if (!attacker || attacker.hp <= 0) return state

  const fromCard = { cardId: input.card.id, templateId: input.card.templateId }
  const walls = wallSet(state.walls)

  switch (input.card.templateId) {
    case 'boss_blink_adjacent': {
      const targetId = input.targetId
      if (!targetId) return state
      const target = state.units.find((u) => u.id === targetId)
      if (!target || target.hp <= 0) return state
      if (!canRangedAttack(attacker, target, tmpl.maxRange, walls)) return state
      const dest = pickBlinkDestination(state, targetId, input.attackerId, input.rng)
      if (!dest) return state
      let next = updateUnit(state, input.attackerId, { ...attacker, x: dest.x, y: dest.y })
      next = {
        ...next,
        battleLog: [
          ...next.battleLog,
          {
            type: 'move' as const,
            unitId: input.attackerId,
            fromX: attacker.x,
            fromY: attacker.y,
            toX: dest.x,
            toY: dest.y,
          },
        ],
      }
      return next
    }

    case 'boss_spell_eater': {
      const status = bossStatusForSkill('boss_spell_eater', input.effectPower)
      let next = applyStatusesToUnit(state, input.attackerId, [status])
      next = {
        ...next,
        battleLog: [
          ...next.battleLog,
          {
            type: 'strike' as const,
            attackerId: input.attackerId,
            targetId: input.attackerId,
            damage: 0,
            attackKind: 'ranged' as const,
            targetKilled: false,
            fromCard,
          },
        ],
      }
      return next
    }

    case 'boss_soul_mark':
    case 'boss_silence_dark': {
      const targetId = input.targetId
      if (!targetId) return state
      const target = state.units.find((u) => u.id === targetId)
      if (!target || target.hp <= 0 || target.side !== 'player') return state
      if (!canRangedAttack(attacker, target, tmpl.maxRange, walls)) return state
      const status = bossStatusForSkill(input.card.templateId, input.effectPower)
      let next = applyStatusesToUnit(state, targetId, [status])
      next = {
        ...next,
        battleLog: [
          ...next.battleLog,
          {
            type: 'strike' as const,
            attackerId: input.attackerId,
            targetId,
            damage: 0,
            attackKind: 'ranged' as const,
            targetKilled: false,
            fromCard,
          },
        ],
      }
      return next
    }

    case 'boss_mirror_rage': {
      const targetId = input.targetId
      if (!targetId) return state
      const target = state.units.find((u) => u.id === targetId)
      if (!target || target.hp <= 0 || target.side !== 'player') return state
      if (!canRangedAttack(attacker, target, tmpl.maxRange, walls)) return state
      const mirrored = copyAttackBuffFromTarget(attacker, target)
      let next = updateUnit(state, input.attackerId, mirrored)
      next = {
        ...next,
        battleLog: [
          ...next.battleLog,
          {
            type: 'status_applied' as const,
            unitId: input.attackerId,
            statusKind: 'attack_up' as const,
            sourceTemplateId: 'boss_mirror_rage',
          },
        ],
      }
      return next
    }

    case 'boss_grave_silence':
    case 'boss_decay_aura': {
      const targetX = input.targetX ?? attacker.x
      const targetY = input.targetY ?? attacker.y
      if (!canCastAoEAt(attacker, targetX, targetY, tmpl.maxRange, walls)) return state
      let next = applyStatusesInAoE(
        state,
        targetX,
        targetY,
        tmpl.aoeSize ?? 3,
        input.card.templateId,
        input.effectPower,
      )
      next = {
        ...next,
        battleLog: [
          ...next.battleLog,
          {
            type: 'strike' as const,
            attackerId: input.attackerId,
            targetId: input.attackerId,
            damage: 0,
            attackKind: 'aoe' as const,
            targetKilled: false,
            fromCard,
          },
        ],
      }
      return next
    }

    default:
      return state
  }
}

export function stripStealthInAoE(
  state: BattleState,
  centerX: number,
  centerY: number,
  aoeSize: number,
): BattleState {
  const cells = cellsInAoE(centerX, centerY, aoeSize, state.width, state.height)
  return {
    ...state,
    units: state.units.map((u) => {
      if (u.hp <= 0 || !cells.has(cellKey(u.x, u.y))) return u
      return stripStealthFromUnit(u)
    }),
  }
}

export function isBossSkillHandledInMechanics(templateId: string): boolean {
  return (
    templateId === 'boss_blink_adjacent' ||
    templateId === 'boss_spell_eater' ||
    templateId === 'boss_soul_mark' ||
    templateId === 'boss_silence_dark' ||
    templateId === 'boss_mirror_rage' ||
    templateId === 'boss_grave_silence' ||
    templateId === 'boss_decay_aura'
  )
}
