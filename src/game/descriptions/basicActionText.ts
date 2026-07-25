import {
  HERO_BASIC_MELEE_DAMAGE,
  HERO_BASIC_RANGED_DAMAGE,
  HERO_BASIC_RANGED_COOLDOWN_TURNS,
  HERO_MOVE_RANGE,
} from '../battle/combat'
import { applyPassiveAttackBonus } from '../passives/passiveCombatStats'
import type { BattleState, Unit } from '../types'
import {
  UI_ATTACK,
  UI_BASIC_RANGED,
  UI_CELL,
  UI_COOLDOWN,
  UI_DAMAGE,
  UI_SPEED,
} from '../ui/labels'

export type BasicActionKind = 'move' | 'melee' | 'ranged'

export type BasicActionStatsDescription = {
  title: string
  centerEmoji: string
  contextBadge: string
  lines: string[]
  expectedDamage: number | null
  moveRange: number | null
  effectiveRange: number | null
}

const TITLES: Record<BasicActionKind, string> = {
  move: 'Ход',
  melee: 'Удар',
  ranged: 'Выстрел',
}

export function describeBasicActionStats(input: {
  kind: BasicActionKind
  battle: BattleState
  actor?: Unit
  effectiveRangedRange: number
  rangedCooldownRemaining: number
}): BasicActionStatsDescription {
  const { kind, battle, actor, effectiveRangedRange, rangedCooldownRemaining } = input
  const title = TITLES[kind]

  if (kind === 'move') {
    const contextBadge = `${UI_CELL}≤${HERO_MOVE_RANGE}`
    return {
      title,
      centerEmoji: UI_SPEED,
      contextBadge,
      lines: [
        `До ${HERO_MOVE_RANGE} клеток по Manhattan.`,
        'Нельзя ходить на занятую клетку или сквозь стены.',
      ],
      expectedDamage: null,
      moveRange: HERO_MOVE_RANGE,
      effectiveRange: null,
    }
  }

  const base =
    kind === 'melee' ? HERO_BASIC_MELEE_DAMAGE : HERO_BASIC_RANGED_DAMAGE
  const expected = actor
    ? applyPassiveAttackBonus(battle, actor, base)
    : base
  const rangePart =
    kind === 'melee' ? `${UI_CELL}1` : `${UI_CELL}≤${effectiveRangedRange}`
  const cdPart =
    kind === 'ranged' && rangedCooldownRemaining > 0
      ? ` · ${UI_COOLDOWN}${rangedCooldownRemaining}`
      : kind === 'ranged' && HERO_BASIC_RANGED_COOLDOWN_TURNS > 0
        ? ` · ${UI_COOLDOWN}${HERO_BASIC_RANGED_COOLDOWN_TURNS}`
        : ''
  const contextBadge = `${UI_DAMAGE}${expected} · ${rangePart}${cdPart}`

  const lines = [
    `Базовый урон: ${base}.`,
    expected > base
      ? `С пассивами атакующего: ${expected}.`
      : 'Пассивы атакующего не меняют урон.',
    'Итог по цели уменьшается защитой и статусами цели.',
  ]
  if (kind === 'ranged' && rangedCooldownRemaining > 0) {
    lines.push(`Перезарядка: ${rangedCooldownRemaining} ход(ов).`)
  }

  return {
    title,
    centerEmoji: kind === 'melee' ? UI_ATTACK : UI_BASIC_RANGED,
    contextBadge,
    lines,
    expectedDamage: expected,
    moveRange: null,
    effectiveRange: kind === 'ranged' ? effectiveRangedRange : 1,
  }
}
