import type { BattleAction, BattlePlayerCard, BattleState, Unit } from '../../game/types'
import { getCurrentActorId } from '../../game/battle/reducer'
import { canMeleeAttack, canRangedAttack } from '../../game/battle/combat'
import {
  ENEMY_MELEE_DAMAGE,
  ENEMY_RANGED_DAMAGE,
  ENEMY_RANGED_MAX_RANGE,
} from '../../game/battle/enemyCombat'
import { getEnemyArchetype, type EnemySkillPriority } from '../../game/content/enemyArchetypes'
import {
  getCardAttackTemplate,
  isHealKind,
  usesCardAttackDispatch,
  usesCardAoEDispatch,
  usesCardUtilitySingleDispatch,
} from '../../game/content/cardTemplates'
import { ORTHO_DELTAS, cellKey, manhattan, wallSet } from '../../game/battle/grid'
import {
  aoeCastTargetCells,
  cellsInAoE,
} from '../../game/battle/rangeOverlay'

const RANGED_OR_MAGE_TEMPLATES = new Set([
  'power_shot',
  'multishot',
  'arcane_bolt',
  'fireball',
  'frost_nova',
  'shadow_bolt',
  'life_drain',
])

const HEALER_TEMPLATES = new Set(['heal', 'regeneration', 'mass_heal', 'resurrect'])

function alivePlayers(state: BattleState): Unit[] {
  return state.units.filter((u) => u.side === 'player' && u.hp > 0)
}

function actorEnemyCards(state: BattleState, actorId: string): readonly BattlePlayerCard[] {
  return state.enemyCardsByUnitId?.[actorId] ?? []
}

function cardReady(c: BattlePlayerCard): boolean {
  return (c.cooldownRemaining ?? 0) <= 0
}

function wallsOf(state: BattleState): ReadonlySet<string> {
  return wallSet(state.walls)
}

function isRangedOrMagePlayer(unit: Unit, state: BattleState): boolean {
  const cards = state.playerCardsByUnitId[unit.id] ?? []
  return cards.some((c) => RANGED_OR_MAGE_TEMPLATES.has(c.templateId))
}

function isHealerPlayer(unit: Unit, state: BattleState): boolean {
  const cards = state.playerCardsByUnitId[unit.id] ?? []
  return cards.some((c) => HEALER_TEMPLATES.has(c.templateId))
}

function distance(actor: Unit, target: Unit): number {
  return manhattan(actor.x, actor.y, target.x, target.y)
}

function pickPlayerTarget(
  actor: Unit,
  players: Unit[],
  state: BattleState,
  priority: EnemySkillPriority,
): Unit | null {
  if (players.length === 0) return null
  let pool = players
  if (priority.preferRangedTarget) {
    const ranged = players.filter((p) => isRangedOrMagePlayer(p, state))
    if (ranged.length > 0) pool = ranged
  }
  if (priority.preferHealerTarget) {
    const healers = pool.filter((p) => isHealerPlayer(p, state))
    if (healers.length > 0) pool = healers
  }
  if (priority.preferLowHpTarget) {
    return pool.reduce((best, p) => (p.hp < best.hp ? p : best))
  }
  return pool.reduce((best, p) => (distance(actor, p) < distance(actor, best) ? p : best))
}

function cardCanTargetPlayer(
  actor: Unit,
  target: Unit,
  tmpl: NonNullable<ReturnType<typeof getCardAttackTemplate>>,
  state: BattleState,
  minRange?: number,
): boolean {
  const d = distance(actor, target)
  if (minRange !== undefined && d < minRange) return false
  if (tmpl.kind === 'melee' || tmpl.kind === 'dot') return canMeleeAttack(actor, target)
  if (isHealKind(tmpl.kind)) return false
  return canRangedAttack(actor, target, tmpl.maxRange, wallsOf(state))
}

type CardAttackDecision = Extract<BattleAction, { type: 'card_attack' }>

function cardAttack(
  attackerId: string,
  cardId: string,
  target?: { targetId: string } | { targetX: number; targetY: number },
): CardAttackDecision {
  if (target && 'targetId' in target) {
    return { type: 'card_attack', attackerId, cardId, targetId: target.targetId }
  }
  if (target && 'targetX' in target) {
    return { type: 'card_attack', attackerId, cardId, targetX: target.targetX, targetY: target.targetY }
  }
  return { type: 'card_attack', attackerId, cardId }
}

function scorePriority(
  actor: Unit,
  state: BattleState,
  priority: EnemySkillPriority,
  card: BattlePlayerCard,
): CardAttackDecision | null {
  const tmpl = getCardAttackTemplate(priority.skillId)
  if (!tmpl) return null

  const players = alivePlayers(state)
  if (players.length === 0) return null

  if (usesCardAoEDispatch(tmpl)) {
    const castCells = aoeCastTargetCells(state, actor, tmpl.maxRange)
    let best: { x: number; y: number; hits: number } | null = null
    for (const k of castCells) {
      const [xs, ys] = k.split(',')
      const cx = Number(xs)
      const cy = Number(ys)
      const aoe = cellsInAoE(cx, cy, tmpl.aoeSize ?? 3, state.width, state.height)
      const hits = players.filter((p) => aoe.has(cellKey(p.x, p.y))).length
      if (hits === 0) continue
      if (!best || hits > best.hits) best = { x: cx, y: cy, hits }
    }
    if (!best) return null
    return cardAttack(actor.id, card.id, { targetX: best.x, targetY: best.y })
  }

  if (usesCardUtilitySingleDispatch(tmpl) || usesCardAttackDispatch(tmpl.kind) || tmpl.kind === 'debuff') {
    const target = pickPlayerTarget(actor, players, state, priority)
    if (!target) return null
    if (!cardCanTargetPlayer(actor, target, tmpl, state, priority.minRange)) return null
    return cardAttack(actor.id, card.id, { targetId: target.id })
  }

  return null
}

function pickBestSkillAction(actor: Unit, state: BattleState): CardAttackDecision | null {
  const archetype = actor.archetypeId ? getEnemyArchetype(actor.archetypeId) : undefined
  const priorities = archetype?.skillPriorities ?? []
  const cards = actorEnemyCards(state, actor.id)
  if (priorities.length === 0 || cards.length === 0) return null

  let best: { score: number; action: CardAttackDecision } | null = null
  for (const priority of priorities) {
    const card = cards.find((c) => c.templateId === priority.skillId)
    if (!card || !cardReady(card)) continue
    const action = scorePriority(actor, state, priority, card)
    if (!action) continue
    if (!best || priority.baseScore > best.score) {
      best = { score: priority.baseScore, action }
    }
  }
  return best?.action ?? null
}

function pickBasicAttack(actor: Unit, state: BattleState): BattleAction | null {
  const players = alivePlayers(state)
  if (players.length === 0) return null
  const target = players.reduce((best, p) => (distance(actor, p) < distance(actor, best) ? p : best))

  if (canMeleeAttack(actor, target)) {
    return {
      type: 'attack',
      attackerId: actor.id,
      targetId: target.id,
      damage: ENEMY_MELEE_DAMAGE,
      kind: 'melee',
    }
  }
  if (canRangedAttack(actor, target, ENEMY_RANGED_MAX_RANGE, wallsOf(state))) {
    return {
      type: 'attack',
      attackerId: actor.id,
      targetId: target.id,
      damage: ENEMY_RANGED_DAMAGE,
      kind: 'ranged',
      maxRange: ENEMY_RANGED_MAX_RANGE,
    }
  }
  return null
}

function pickMoveTowardHero(actor: Unit, state: BattleState): BattleAction | null {
  const players = alivePlayers(state)
  if (players.length === 0) return null
  const hero = players.reduce((best, p) => (distance(actor, p) < distance(actor, best) ? p : best))
  const walls = wallsOf(state)
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
  if (!best) return null
  return { type: 'move', unitId: actor.id, toX: best.x, toY: best.y }
}

/**
 * Score-based enemy AI: skills from skillPriorities, then basic attack, then move.
 */
export function pickEnemyAiAction(state: BattleState): BattleAction | null {
  const id = getCurrentActorId(state)
  const actor = state.units.find((u) => u.id === id)
  if (!actor || actor.side !== 'enemy') return null
  if (alivePlayers(state).length === 0) return null

  const skill = pickBestSkillAction(actor, state)
  if (skill) return skill

  const basic = pickBasicAttack(actor, state)
  if (basic) return basic

  return pickMoveTowardHero(actor, state)
}

