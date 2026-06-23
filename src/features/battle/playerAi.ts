import { getCardAttackTemplate, isHealKind, usesCardBuffDispatch } from '../../game/content/cardTemplates'
import {
  HERO_BASIC_MELEE_DAMAGE,
  HERO_BASIC_RANGED_DAMAGE,
  HERO_BASIC_RANGED_MAX_RANGE,
  canMeleeAttack,
  canRangedAttack,
} from '../../game/battle/combat'
import { getCurrentActorId } from '../../game/battle/reducer'
import { getActorPlayerCards } from '../../game/battle/playerCards'
import { getCharacter } from '../../game/character/selectors'
import { cellKey, manhattan, wallSet } from '../../game/battle/grid'
import {
  aoeCastTargetCells,
  canHealTarget,
  cellsInAoE,
  reachableMoveCells,
} from '../../game/battle/rangeOverlay'
import { resolveCarrierTags } from '../../game/mods/carrierTags'
import { resolveSkillForCard } from '../../game/skills/resolveSkillForCard'
import type {
  BattleAction,
  BattlePlayerCard,
  BattleState,
  CampaignState,
  Unit,
} from '../../game/types'

export type PlayerAiDecision =
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'card'; cardId: string; targetId: string }
  | { kind: 'card_aoe'; cardId: string; targetX: number; targetY: number }
  | { kind: 'card_heal'; cardId: string; targetId: string }
  | { kind: 'card_buff'; cardId: string; targetId: string }
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
  if (isHealKind(tmpl.kind) || usesCardBuffDispatch(tmpl.kind)) {
    if (tmpl.kind === 'resurrect') {
      return target.side === 'player' && target.hp <= 0
    }
    if (usesCardBuffDispatch(tmpl.kind)) {
      return target.side === 'player' && target.hp > 0
    }
    return canHealTarget(actor, target, tmpl.maxRange, wallsOf(state))
  }
  return canRangedAttack(actor, target, tmpl.maxRange, wallsOf(state))
}

function cardReady(c: BattlePlayerCard): boolean {
  return (c.cooldownRemaining ?? 0) <= 0
}

function cardEffectAmount(
  card: BattlePlayerCard,
  actor: Unit,
  campaign: CampaignState,
): number {
  const tmpl = getCardAttackTemplate(card.templateId)
  const char = getCharacter(campaign, actor.id)
  if (!tmpl || !char) return 0
  const modCtx = {
    carrierTags: resolveCarrierTags('card', card.templateId),
    modSlots: card.modSlots,
    rng: () => 50,
  }
  const resolved = resolveSkillForCard(campaign, char, card, tmpl, modCtx, actor)
  return resolved?.amount ?? 0
}

function actorCards(state: BattleState, actor: Unit): readonly BattlePlayerCard[] {
  return getActorPlayerCards(state, actor.id)
}

function maxAvailableDamage(
  actor: Unit,
  enemy: Unit,
  state: BattleState,
  campaign: CampaignState,
): number {
  let best = 0
  for (const c of actorCards(state, actor)) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl) continue
    if (tmpl.kind === 'aoe') {
      const dmg = cardEffectAmount(c, actor, campaign)
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
    if (isHealKind(tmpl.kind) || usesCardBuffDispatch(tmpl.kind)) continue
    if (!cardInRange(actor, enemy, tmpl, state)) continue
    best = Math.max(best, cardEffectAmount(c, actor, campaign))
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

function pickTarget(
  actor: Unit,
  enemies: Unit[],
  state: BattleState,
  campaign: CampaignState,
): Unit {
  const killable = enemies.filter((e) => maxAvailableDamage(actor, e, state, campaign) >= e.hp)
  const pool = killable.length > 0 ? killable : enemies
  return pool.reduce((best, e) => (compareTargets(e, best, actor) < 0 ? e : best))
}

function pickBestCard(
  actor: Unit,
  target: Unit,
  state: BattleState,
  campaign: CampaignState,
): BattlePlayerCard | null {
  let best: BattlePlayerCard | null = null
  let bestDmg = -1
  for (const c of actorCards(state, actor)) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || isHealKind(tmpl.kind) || usesCardBuffDispatch(tmpl.kind)) continue
    if (!cardInRange(actor, target, tmpl, state)) continue
    const dmg = cardEffectAmount(c, actor, campaign)
    if (dmg > bestDmg) {
      best = c
      bestDmg = dmg
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
  campaign: CampaignState,
): { cardId: string; targetX: number; targetY: number } | null {
  let best: { cardId: string; targetX: number; targetY: number; score: number } | null = null

  for (const c of actorCards(state, actor)) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || tmpl.kind !== 'aoe' || tmpl.aoeSize === undefined) continue
    const dmg = cardEffectAmount(c, actor, campaign)
    const castCells = aoeCastTargetCells(state, actor, tmpl.maxRange)
    for (const k of castCells) {
      const [xs, ys] = k.split(',')
      const cx = Number(xs)
      const cy = Number(ys)
      const score = scoreAoECell(actor, cx, cy, dmg, tmpl.aoeSize, state)
      if (score <= 0) continue
      if (!best || score > best.score) {
        best = { cardId: c.id, targetX: cx, targetY: cy, score }
      }
    }
  }
  if (!best) return null
  return { cardId: best.cardId, targetX: best.targetX, targetY: best.targetY }
}

function pickHealAction(
  actor: Unit,
  state: BattleState,
  _campaign: CampaignState,
): { cardId: string; targetId: string } | null {
  const allies = state.units.filter((u) => u.side === 'player' && u.hp > 0)
  const wounded = allies.filter((u) => u.hp < u.maxHp * 0.5)
  if (wounded.length === 0) return null

  for (const c of actorCards(state, actor)) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || !isHealKind(tmpl.kind) || tmpl.kind === 'resurrect') continue
    for (const ally of wounded) {
      if (!cardInRange(actor, ally, tmpl, state)) continue
      return { cardId: c.id, targetId: ally.id }
    }
  }
  return null
}

export function pickPlayerAiAction(
  state: BattleState,
  campaign: CampaignState,
): PlayerAiDecision {
  const actorId = getCurrentActorId(state)
  const actor = state.units.find((u) => u.id === actorId && u.side === 'player' && u.hp > 0)
  if (!actor) return null

  const enemies = aliveEnemies(state)
  if (enemies.length === 0) return null

  const aoe = pickBestAoEAction(actor, state, campaign)
  if (aoe) return { kind: 'card_aoe', ...aoe }

  const target = pickTarget(actor, enemies, state, campaign)
  const card = pickBestCard(actor, target, state, campaign)
  if (card) {
    const tmpl = getCardAttackTemplate(card.templateId)!
    const cardDmg = cardEffectAmount(card, actor, campaign)
    const basicDmg = canMeleeAttack(actor, target)
      ? HERO_BASIC_MELEE_DAMAGE
      : canRangedAttack(actor, target, HERO_BASIC_RANGED_MAX_RANGE, wallsOf(state))
        ? HERO_BASIC_RANGED_DAMAGE
        : 0
    if (cardDmg > basicDmg) {
      return { kind: 'card', cardId: card.id, targetId: target.id }
    }
    if (tmpl.kind === 'aoe') {
      return { kind: 'card', cardId: card.id, targetId: target.id }
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

  const heal = pickHealAction(actor, state, campaign)
  if (heal) return { kind: 'card_heal', ...heal }

  const moveCells = reachableMoveCells(state, actor.id)
  if (moveCells.size === 0) return null

  let bestKey: string | null = null
  let bestDist = Infinity
  for (const k of moveCells) {
    const [xs, ys] = k.split(',')
    const x = Number(xs)
    const y = Number(ys)
    const d = manhattan(x, y, target.x, target.y)
    if (d < bestDist) {
      bestDist = d
      bestKey = k
    }
  }
  if (!bestKey) return null
  const [mx, my] = bestKey.split(',')
  return {
    kind: 'battle',
    action: { type: 'move', unitId: actor.id, toX: Number(mx), toY: Number(my) },
  }
}
