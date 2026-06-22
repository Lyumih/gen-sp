import { computeCardAttackDamage } from '../../game/content/cardAttackDamage'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import {
  HERO_BASIC_MELEE_DAMAGE,
  HERO_BASIC_RANGED_DAMAGE,
  HERO_BASIC_RANGED_MAX_RANGE,
  canMeleeAttack,
  canRangedAttack,
} from '../../game/battle/combat'
import { getCurrentActorId } from '../../game/battle/reducer'
import { getActorPlayerCards } from '../../game/battle/playerCards'
import { cellKey, manhattan, wallSet } from '../../game/battle/grid'
import {
  aoeCastTargetCells,
  canHealTarget,
  cellsInAoE,
  reachableMoveCells,
} from '../../game/battle/rangeOverlay'
import type { BattleAction, BattlePlayerCard, BattleState, Unit } from '../../game/types'

export type PlayerAiDecision =
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'card'; cardId: string; targetId: string }
  | { kind: 'card_aoe'; cardId: string; targetX: number; targetY: number }
  | { kind: 'card_heal'; cardId: string; targetId: string }
  | null

function aliveEnemies(state: BattleState): Unit[] {
  return state.units.filter((u) => u.side === 'enemy' && u.hp > 0)
}

function wallsOf(state: BattleState): ReadonlySet<string> {
  return wallSet(state.walls)
}

function cardInRange(
  actor: Unit,
  target: Unit,
  tmpl: NonNullable<ReturnType<typeof getCardAttackTemplate>>,
  state: BattleState,
): boolean {
  if (tmpl.kind === 'aoe') return false
  if (tmpl.kind === 'melee') return canMeleeAttack(actor, target)
  return canRangedAttack(actor, target, tmpl.maxRange, wallsOf(state))
}

function cardReady(c: BattlePlayerCard): boolean {
  return (c.cooldownRemaining ?? 0) <= 0
}

function cardDamage(card: BattlePlayerCard, state: BattleState): number {
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return 0
  return computeCardAttackDamage(tmpl, card.global_level + state.gearCardLevelBonus)
}

function actorCards(state: BattleState, actor: Unit): readonly BattlePlayerCard[] {
  return getActorPlayerCards(state, actor.id)
}

function maxAvailableDamage(actor: Unit, enemy: Unit, state: BattleState): number {
  let best = 0
  for (const c of actorCards(state, actor)) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl) continue
    if (tmpl.kind === 'aoe') {
      const dmg = cardDamage(c, state)
      const castCells = aoeCastTargetCells(state, actor, tmpl.maxRange)
      for (const k of castCells) {
        const [xs, ys] = k.split(',')
        const cx = Number(xs)
        const cy = Number(ys)
        const aoe = cellsInAoE(cx, cy, tmpl.aoeSize ?? 3, state.width, state.height)
        if (aoe.has(cellKey(enemy.x, enemy.y))) best = Math.max(best, dmg)
      }
      continue
    }
    if (!cardInRange(actor, enemy, tmpl, state)) continue
    best = Math.max(best, cardDamage(c, state))
  }
  if (canMeleeAttack(actor, enemy)) best = Math.max(best, HERO_BASIC_MELEE_DAMAGE)
  if (canRangedAttack(actor, enemy, HERO_BASIC_RANGED_MAX_RANGE, wallsOf(state))) {
    best = Math.max(best, HERO_BASIC_RANGED_DAMAGE)
  }
  return best
}

function compareTargets(a: Unit, b: Unit, actor: Unit): number {
  const da = manhattan(actor.x, actor.y, a.x, a.y)
  const db = manhattan(actor.x, actor.y, b.x, b.y)
  if (da !== db) return da - db
  return a.hp - b.hp
}

function pickTarget(actor: Unit, enemies: Unit[], state: BattleState): Unit {
  const killable = enemies.filter((e) => maxAvailableDamage(actor, e, state) >= e.hp)
  const pool = killable.length > 0 ? killable : enemies
  return pool.reduce((best, e) => (compareTargets(e, best, actor) < 0 ? e : best))
}

function pickBestCard(actor: Unit, target: Unit, state: BattleState): BattlePlayerCard | null {
  let best: BattlePlayerCard | null = null
  let bestDmg = -1
  for (const c of actorCards(state, actor)) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || tmpl.kind === 'heal' || !cardInRange(actor, target, tmpl, state)) continue
    const dmg = cardDamage(c, state)
    if (dmg > bestDmg) {
      best = c
      bestDmg = dmg
    } else if (
      dmg === bestDmg &&
      best !== null &&
      c.id === state.modKillTargetCardId &&
      best.id !== state.modKillTargetCardId
    ) {
      best = c
    }
  }
  return best
}

function scoreAoECell(
  actor: Unit,
  cx: number,
  cy: number,
  damage: number,
  aoeSize: number,
  state: BattleState,
): number {
  const aoe = cellsInAoE(cx, cy, aoeSize, state.width, state.height)
  let score = 0
  for (const u of state.units) {
    if (u.hp <= 0) continue
    if (!aoe.has(cellKey(u.x, u.y))) continue
    if (u.side === 'enemy') score += damage
    if (u.id === actor.id) score -= damage * 2
  }
  return score
}

function pickBestAoEAction(
  actor: Unit,
  state: BattleState,
): { cardId: string; targetX: number; targetY: number } | null {
  let best: { cardId: string; targetX: number; targetY: number; score: number } | null = null

  for (const c of actorCards(state, actor)) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || tmpl.kind !== 'aoe' || tmpl.aoeSize === undefined) continue
    const dmg = cardDamage(c, state)
    const castCells = aoeCastTargetCells(state, actor, tmpl.maxRange)
    for (const k of castCells) {
      const [xs, ys] = k.split(',')
      const tx = Number(xs)
      const ty = Number(ys)
      const score = scoreAoECell(actor, tx, ty, dmg, tmpl.aoeSize, state)
      if (score <= 0) continue
      if (
        !best ||
        score > best.score ||
        (score === best.score && c.id === state.modKillTargetCardId)
      ) {
        best = { cardId: c.id, targetX: tx, targetY: ty, score }
      }
    }
  }
  if (!best) return null
  return { cardId: best.cardId, targetX: best.targetX, targetY: best.targetY }
}

function pickMoveStep(actor: Unit, target: Unit, state: BattleState): BattleAction | null {
  const reachable = reachableMoveCells(state, actor.id)
  let best: { x: number; y: number; d: number } | null = null
  for (const k of reachable) {
    const [xs, ys] = k.split(',')
    const x = Number(xs)
    const y = Number(ys)
    const dist = manhattan(x, y, target.x, target.y)
    if (!best || dist < best.d) best = { x, y, d: dist }
  }
  if (!best) return null
  return { type: 'move', unitId: actor.id, toX: best.x, toY: best.y }
}

function pickHealSelf(actor: Unit, state: BattleState): { cardId: string; targetId: string } | null {
  if (actor.hp >= actor.maxHp * 0.5) return null
  if (actor.hp >= actor.maxHp) return null
  const walls = wallsOf(state)
  for (const c of actorCards(state, actor)) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || tmpl.kind !== 'heal') continue
    if (canHealTarget(actor, actor, tmpl.maxRange, walls)) {
      return { cardId: c.id, targetId: actor.id }
    }
  }
  return null
}

export function pickPlayerAiAction(state: BattleState): PlayerAiDecision {
  if (state.phase !== 'ongoing') return null
  const actorId = getCurrentActorId(state)
  if (!actorId) return null

  const actor = state.units.find(
    (u) => u.id === actorId && u.side === 'player' && u.hp > 0,
  )
  if (!actor) return null

  const enemies = aliveEnemies(state)
  if (enemies.length === 0) return null

  const target = pickTarget(actor, enemies, state)

  const card = pickBestCard(actor, target, state)
  if (card) {
    return { kind: 'card', cardId: card.id, targetId: target.id }
  }

  const cards = actorCards(state, actor)
  const aoeCards = cards.filter((c) => {
    if (!cardReady(c)) return false
    const t = getCardAttackTemplate(c.templateId)
    return t?.kind === 'aoe'
  })
  if (aoeCards.length > 0) {
    const singleDmg = Math.max(
      canMeleeAttack(actor, target) ? HERO_BASIC_MELEE_DAMAGE : 0,
      canRangedAttack(actor, target, HERO_BASIC_RANGED_MAX_RANGE, wallsOf(state))
        ? HERO_BASIC_RANGED_DAMAGE
        : 0,
    )
    const aoe = pickBestAoEAction(actor, state)
    if (aoe) {
      const aoeCard = cards.find((c) => c.id === aoe.cardId)!
      const tmpl = getCardAttackTemplate(aoeCard.templateId)
      const aoeDmg = cardDamage(aoeCard, state)
      const aoeScore = scoreAoECell(
        actor,
        aoe.targetX,
        aoe.targetY,
        aoeDmg,
        tmpl?.aoeSize ?? 3,
        state,
      )
      if (aoeScore > singleDmg) {
        return {
          kind: 'card_aoe',
          cardId: aoe.cardId,
          targetX: aoe.targetX,
          targetY: aoe.targetY,
        }
      }
    }
  }

  if (canMeleeAttack(actor, target)) {
    return {
      kind: 'battle',
      action: {
        type: 'attack',
        attackerId: actor.id,
        targetId: target.id,
        damage: HERO_BASIC_MELEE_DAMAGE,
        kind: 'melee',
      },
    }
  }

  if (canRangedAttack(actor, target, HERO_BASIC_RANGED_MAX_RANGE, wallsOf(state))) {
    return {
      kind: 'battle',
      action: {
        type: 'attack',
        attackerId: actor.id,
        targetId: target.id,
        damage: HERO_BASIC_RANGED_DAMAGE,
        kind: 'ranged',
        maxRange: HERO_BASIC_RANGED_MAX_RANGE,
      },
    }
  }

  const move = pickMoveStep(actor, target, state)
  if (move) {
    const heal = pickHealSelf(actor, state)
    if (heal) return { kind: 'card_heal', ...heal }
    return { kind: 'battle', action: move }
  }
  return null
}
