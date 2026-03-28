import { computeUnitStat } from '../balance'
import { getItemTemplate } from '../content/itemTemplates'
import { aggregateGearCardLevelBonus } from '../equipment/aggregates'
import { computeHeroMaxHpForScenario } from './heroMaxHp'
import type { BattleAttemptSnapshot, BattleState, Unit } from '../types'
import { cellKey } from '../battle/grid'

export type BattleScenarioEnemy = {
  id: string
  x: number
  y: number
  /** База для max HP через computeUnitStat. */
  baseHpStat: number
  unitLevel: number
}

export type BattleScenario = {
  id: string
  width: number
  height: number
  walls: readonly string[]
  heroStart: { x: number; y: number }
  heroBaseHpStat: number
  enemies: readonly BattleScenarioEnemy[]
}

export const SCENARIOS: readonly BattleScenario[] = [
  {
    id: 'tutorial',
    width: 5,
    height: 5,
    walls: [cellKey(2, 1), cellKey(2, 3)],
    heroStart: { x: 0, y: 2 },
    heroBaseHpStat: 20,
    enemies: [{ id: 'e1', x: 4, y: 2, baseHpStat: 8, unitLevel: 1 }],
  },
  {
    id: 'two-front',
    width: 6,
    height: 4,
    walls: [],
    heroStart: { x: 0, y: 1 },
    heroBaseHpStat: 22,
    enemies: [
      { id: 'e1', x: 5, y: 0, baseHpStat: 7, unitLevel: 1 },
      { id: 'e2', x: 5, y: 3, baseHpStat: 7, unitLevel: 1 },
    ],
  },
  {
    id: 'boss-lite',
    width: 5,
    height: 5,
    walls: [cellKey(2, 2)],
    heroStart: { x: 0, y: 2 },
    heroBaseHpStat: 24,
    enemies: [{ id: 'boss', x: 4, y: 2, baseHpStat: 18, unitLevel: 2 }],
  },
]

function makeHero(snapshot: BattleAttemptSnapshot, scenario: BattleScenario): Unit {
  const maxHp = computeHeroMaxHpForScenario(snapshot, scenario)
  return {
    id: 'hero',
    side: 'player',
    x: scenario.heroStart.x,
    y: scenario.heroStart.y,
    hp: maxHp,
    maxHp,
    unitLevel: snapshot.playerUnitLevel,
  }
}

function makeEnemies(
  scenario: BattleScenario,
  snapshot: BattleAttemptSnapshot,
): Unit[] {
  return scenario.enemies.map((e) => {
    const maxHp = computeUnitStat({
      baseStat: e.baseHpStat,
      unitLevel: e.unitLevel,
      worldPower: snapshot.worldPower,
    })
    return {
      id: e.id,
      side: 'enemy' as const,
      x: e.x,
      y: e.y,
      hp: maxHp,
      maxHp,
      unitLevel: e.unitLevel,
    }
  })
}

/** Очередь: герой, затем враги по порядку в сценарии. */
function defaultTurnOrder(enemyIds: readonly string[]): readonly string[] {
  return ['hero', ...enemyIds]
}

/**
 * Собирает начальное состояние боя из сценария и снимка попытки.
 */
export function battleStateFromScenario(
  scenario: BattleScenario,
  snapshot: BattleAttemptSnapshot,
): BattleState {
  const hero = makeHero(snapshot, scenario)
  const enemies = makeEnemies(scenario, snapshot)
  const units = [hero, ...enemies]
  return {
    width: scenario.width,
    height: scenario.height,
    walls: scenario.walls,
    units,
    turnOrder: defaultTurnOrder(scenario.enemies.map((e) => e.id)),
    currentTurnIndex: 0,
    phase: 'ongoing',
    worldPower: snapshot.worldPower,
    playerCards: snapshot.cards.map((c) => ({
      ...c,
      modifications: c.modifications.map((m) => ({ ...m })),
    })),
    modKillTargetCardId: snapshot.modKillTargetCardId,
    battleLog: [],
    gearCardLevelBonus: aggregateGearCardLevelBonus(
      snapshot.items,
      snapshot.equipment,
      getItemTemplate,
    ),
  }
}
