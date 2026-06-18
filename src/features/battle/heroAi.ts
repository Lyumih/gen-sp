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
import { ORTHO_DELTAS, cellKey, manhattan, wallSet } from '../../game/battle/grid'
import type { BattleAction, BattleState, CardInstance, Unit } from '../../game/types'

export type HeroAiDecision =
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'card'; cardId: string; targetId: string }
  | null

function aliveEnemies(state: BattleState): Unit[] {
  return state.units.filter((u) => u.side === 'enemy' && u.hp > 0)
}

function cardInRange(
  hero: Unit,
  target: Unit,
  tmpl: NonNullable<ReturnType<typeof getCardAttackTemplate>>,
): boolean {
  if (tmpl.kind === 'aoe') return false
  if (tmpl.kind === 'melee') return canMeleeAttack(hero, target)
  return canRangedAttack(hero, target, tmpl.maxRange)
}

function cardDamage(card: CardInstance, state: BattleState): number {
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) return 0
  return computeCardAttackDamage(tmpl, card.global_level + state.gearCardLevelBonus)
}

function maxAvailableDamage(hero: Unit, enemy: Unit, state: BattleState): number {
  let best = 0
  for (const c of state.playerCards) {
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || !cardInRange(hero, enemy, tmpl)) continue
    best = Math.max(best, cardDamage(c, state))
  }
  if (canMeleeAttack(hero, enemy)) best = Math.max(best, HERO_BASIC_MELEE_DAMAGE)
  if (canRangedAttack(hero, enemy, HERO_BASIC_RANGED_MAX_RANGE)) {
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

function pickBestCard(hero: Unit, target: Unit, state: BattleState): CardInstance | null {
  let best: CardInstance | null = null
  let bestDmg = -1
  for (const c of state.playerCards) {
    const tmpl = getCardAttackTemplate(c.templateId)
    if (!tmpl || !cardInRange(hero, target, tmpl)) continue
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

function pickMoveStep(hero: Unit, target: Unit, state: BattleState): BattleAction | null {
  const walls = wallSet(state.walls)
  let best: { x: number; y: number; d: number } | null = null
  for (const d of ORTHO_DELTAS) {
    const x = hero.x + d.dx
    const y = hero.y + d.dy
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue
    if (walls.has(cellKey(x, y))) continue
    if (state.units.some((u) => u.hp > 0 && u.x === x && u.y === y)) continue
    const dist = manhattan(x, y, target.x, target.y)
    if (!best || dist < best.d) best = { x, y, d: dist }
  }
  if (!best) return null
  return { type: 'move', unitId: hero.id, toX: best.x, toY: best.y }
}

export function pickHeroAiAction(state: BattleState): HeroAiDecision {
  if (state.phase !== 'ongoing') return null
  if (getCurrentActorId(state) !== 'hero') return null

  const hero = state.units.find((u) => u.id === 'hero' && u.hp > 0)
  if (!hero) return null

  const enemies = aliveEnemies(state)
  if (enemies.length === 0) return null

  const target = pickTarget(hero, enemies, state)

  const card = pickBestCard(hero, target, state)
  if (card) {
    return { kind: 'card', cardId: card.id, targetId: target.id }
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

  if (canRangedAttack(hero, target, HERO_BASIC_RANGED_MAX_RANGE)) {
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
  if (move) return { kind: 'battle', action: move }
  return null
}
