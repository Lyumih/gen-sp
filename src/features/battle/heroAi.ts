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
import { cellKey, manhattan, wallSet } from '../../game/battle/grid'
import {
  aoeCastTargetCells,
  canHealTarget,
  cellsInAoE,
  reachableMoveCells,
} from '../../game/battle/rangeOverlay'
import type { BattleAction, BattlePlayerCard, BattleState, Unit } from '../../game/types'

export type HeroAiDecision =
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
  hero: Unit,
  target: Unit,
  tmpl: NonNullable<ReturnType<typeof getCardAttackTemplate>>,
  state: BattleState,
): boolean {
  if (tmpl.kind === 'aoe') return false
  if (tmpl.kind === 'melee') return canMeleeAttack(hero, target)
  return canRangedAttack(hero, target, tmpl.maxRange, wallsOf(state))
}

function cardReady(c: BattlePlayerCard): boolean {
  return (c.cooldownRemaining ?? 0) <= 0
}

function cardDamage(card: BattlePlayerCard, state: BattleState): number {
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return 0
  return computeCardAttackDamage(tmpl, card.global_level + state.gearCardLevelBonus)
}

function maxAvailableDamage(hero: Unit, enemy: Unit, state: BattleState): number {
  let best = 0
  for (const c of state.playerCards) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl) continue
    if (tmpl.kind === 'aoe') {
      const dmg = cardDamage(c, state)
      const castCells = aoeCastTargetCells(state, hero, tmpl.maxRange)
      for (const k of castCells) {
        const [xs, ys] = k.split(',')
        const cx = Number(xs)
        const cy = Number(ys)
        const aoe = cellsInAoE(cx, cy, tmpl.aoeSize ?? 3, state.width, state.height)
        if (aoe.has(cellKey(enemy.x, enemy.y))) best = Math.max(best, dmg)
      }
      continue
    }
    if (!cardInRange(hero, enemy, tmpl, state)) continue
    best = Math.max(best, cardDamage(c, state))
  }
  if (canMeleeAttack(hero, enemy)) best = Math.max(best, HERO_BASIC_MELEE_DAMAGE)
  if (canRangedAttack(hero, enemy, HERO_BASIC_RANGED_MAX_RANGE, wallsOf(state))) {
    best = Math.max(best, HERO_BASIC_RANGED_DAMAGE)
  }
  return best
}

function compareTargets(a: Unit, b: Unit, hero: Unit): number {
  const da = manhattan(hero.x, hero.y, a.x, a.y)
  const db = manhattan(hero.x, hero.y, b.x, b.y)
  if (da !== db) return da - db
  return a.hp - b.hp
}

function pickTarget(hero: Unit, enemies: Unit[], state: BattleState): Unit {
  const killable = enemies.filter((e) => maxAvailableDamage(hero, e, state) >= e.hp)
  const pool = killable.length > 0 ? killable : enemies
  return pool.reduce((best, e) => (compareTargets(e, best, hero) < 0 ? e : best))
}

function pickBestCard(hero: Unit, target: Unit, state: BattleState): BattlePlayerCard | null {
  let best: BattlePlayerCard | null = null
  let bestDmg = -1
  for (const c of state.playerCards) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || tmpl.kind === 'heal' || !cardInRange(hero, target, tmpl, state)) continue
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
  hero: Unit,
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
    if (u.id === hero.id) score -= damage * 2
  }
  return score
}

function pickBestAoEAction(
  hero: Unit,
  state: BattleState,
): { cardId: string; targetX: number; targetY: number } | null {
  let best: { cardId: string; targetX: number; targetY: number; score: number } | null = null

  for (const c of state.playerCards) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || tmpl.kind !== 'aoe' || tmpl.aoeSize === undefined) continue
    const dmg = cardDamage(c, state)
    const castCells = aoeCastTargetCells(state, hero, tmpl.maxRange)
    for (const k of castCells) {
      const [xs, ys] = k.split(',')
      const tx = Number(xs)
      const ty = Number(ys)
      const score = scoreAoECell(hero, tx, ty, dmg, tmpl.aoeSize, state)
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

function pickMoveStep(hero: Unit, target: Unit, state: BattleState): BattleAction | null {
  const reachable = reachableMoveCells(state, hero.id)
  let best: { x: number; y: number; d: number } | null = null
  for (const k of reachable) {
    const [xs, ys] = k.split(',')
    const x = Number(xs)
    const y = Number(ys)
    const dist = manhattan(x, y, target.x, target.y)
    if (!best || dist < best.d) best = { x, y, d: dist }
  }
  if (!best) return null
  return { type: 'move', unitId: hero.id, toX: best.x, toY: best.y }
}

function pickHealSelf(hero: Unit, state: BattleState): { cardId: string; targetId: string } | null {
  if (hero.hp >= hero.maxHp * 0.5) return null
  if (hero.hp >= hero.maxHp) return null
  const walls = wallsOf(state)
  for (const c of state.playerCards) {
    if (!cardReady(c)) continue
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || tmpl.kind !== 'heal') continue
    if (canHealTarget(hero, hero, tmpl.maxRange, walls)) {
      return { cardId: c.id, targetId: hero.id }
    }
  }
  return null
}

export function pickHeroAiAction(state: BattleState): HeroAiDecision {
  if (state.phase !== 'ongoing') return null
  const actorId = getCurrentActorId(state)
  if (!actorId) return null

  const hero = state.units.find(
    (u) => u.id === actorId && u.side === 'player' && u.hp > 0,
  )
  if (!hero) return null

  const enemies = aliveEnemies(state)
  if (enemies.length === 0) return null

  const target = pickTarget(hero, enemies, state)

  const card = pickBestCard(hero, target, state)
  if (card) {
    return { kind: 'card', cardId: card.id, targetId: target.id }
  }

  const aoeCards = state.playerCards.filter((c) => {
    if (!cardReady(c)) return false
    const t = getCardAttackTemplate(c.templateId)
    return t?.kind === 'aoe'
  })
  if (aoeCards.length > 0) {
    const singleDmg = Math.max(
      canMeleeAttack(hero, target) ? HERO_BASIC_MELEE_DAMAGE : 0,
      canRangedAttack(hero, target, HERO_BASIC_RANGED_MAX_RANGE, wallsOf(state))
        ? HERO_BASIC_RANGED_DAMAGE
        : 0,
    )
    const aoe = pickBestAoEAction(hero, state)
    if (aoe) {
      const tmpl = getCardAttackTemplate(
        state.playerCards.find((c) => c.id === aoe.cardId)!.templateId,
      )
      const aoeDmg = cardDamage(
        state.playerCards.find((c) => c.id === aoe.cardId)!,
        state,
      )
      const aoeScore = scoreAoECell(
        hero,
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

  if (canMeleeAttack(hero, target)) {
    return {
      kind: 'battle',
      action: {
        type: 'attack',
        attackerId: hero.id,
        targetId: target.id,
        damage: HERO_BASIC_MELEE_DAMAGE,
        kind: 'melee',
      },
    }
  }

  if (canRangedAttack(hero, target, HERO_BASIC_RANGED_MAX_RANGE, wallsOf(state))) {
    return {
      kind: 'battle',
      action: {
        type: 'attack',
        attackerId: hero.id,
        targetId: target.id,
        damage: HERO_BASIC_RANGED_DAMAGE,
        kind: 'ranged',
        maxRange: HERO_BASIC_RANGED_MAX_RANGE,
      },
    }
  }

  const move = pickMoveStep(hero, target, state)
  if (move) {
    const heal = pickHealSelf(hero, state)
    if (heal) return { kind: 'card_heal', ...heal }
    return { kind: 'battle', action: move }
  }
  return null
}
