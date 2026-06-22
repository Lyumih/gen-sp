import type { BaseStats } from '../config/baseStats'
import { getEnemyTemplate } from '../content/enemyTemplates'
import { computeEffectiveStat } from '../stats/effectiveStats'
import { buildRoundTurnOrder } from '../battle/initiative'
import { computeCharacterMaxHpForScenario } from './heroMaxHp'
import { playerCardsByUnitFromParty } from '../battle/playerCards'
import { aggregateGearCardLevelBonus } from '../equipment/aggregates'
import { getItemTemplate } from '../content/itemTemplates'
import { computeUnitStat } from '../balance'
import type { BattleAttemptSnapshot, BattleState, PartyMemberBattleSnapshot, Unit } from '../types'
import { cellKey } from '../battle/grid'

export type BattleScenarioEnemy = {
  id: string
  x: number
  y: number
  /** Legacy fallback when template baseStats missing. */
  baseHpStat: number
  unitLevel: number
  archetypeId: string
}

export type BattleScenario = {
  id: string
  width: number
  height: number
  walls: readonly string[]
  playerSpawns: { x: number; y: number }[]
  /** Legacy; player HP uses character baseStats.health. */
  heroBaseHpStat: number
  enemies: readonly BattleScenarioEnemy[]
}

export function getScenarioById(id: string): BattleScenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}

export function getScenarioIndexById(id: string): number {
  return SCENARIOS.findIndex((s) => s.id === id)
}

export const SCENARIOS: readonly BattleScenario[] = [
  {
    id: 'tutorial',
    width: 5,
    height: 5,
    walls: [cellKey(2, 1), cellKey(2, 3)],
    playerSpawns: [{ x: 0, y: 2 }],
    heroBaseHpStat: 20,
    enemies: [{ id: 'e1', x: 4, y: 2, baseHpStat: 8, unitLevel: 1, archetypeId: 'grunt' }],
  },
  {
    id: 'two-front',
    width: 6,
    height: 4,
    walls: [],
    playerSpawns: [{ x: 0, y: 1 }],
    heroBaseHpStat: 22,
    enemies: [
      { id: 'e1', x: 5, y: 0, baseHpStat: 7, unitLevel: 1, archetypeId: 'grunt' },
      { id: 'e2', x: 5, y: 3, baseHpStat: 7, unitLevel: 1, archetypeId: 'grunt' },
    ],
  },
  {
    id: 'boss-lite',
    width: 5,
    height: 5,
    walls: [cellKey(2, 2)],
    playerSpawns: [{ x: 0, y: 2 }],
    heroBaseHpStat: 24,
    enemies: [{ id: 'boss', x: 4, y: 2, baseHpStat: 18, unitLevel: 2, archetypeId: 'boss' }],
  },
]

function spawnForMember(
  scenario: BattleScenario,
  member: PartyMemberBattleSnapshot,
): { x: number; y: number } {
  return scenario.playerSpawns[member.spawnIndex] ?? scenario.playerSpawns[0]!
}

export function makePlayerUnits(
  snapshot: BattleAttemptSnapshot,
  scenario: BattleScenario,
): Unit[] {
  return snapshot.party
    .filter((member) => member.metaStatus === 'active')
    .map((member) => {
      const spawn = spawnForMember(scenario, member)
      const maxHp = computeCharacterMaxHpForScenario(member, scenario, snapshot.worldPower)
      const initiativeBase = computeEffectiveStat(
        member.baseStats,
        'initiative',
        member.unitLevel,
        snapshot.worldPower,
      )
      return {
        id: member.characterId,
        side: 'player' as const,
        x: spawn.x,
        y: spawn.y,
        hp: maxHp,
        maxHp,
        unitLevel: member.unitLevel,
        initiativeBase,
        baseStats: { ...member.baseStats },
      }
    })
}

function enemyBaseStats(archetypeId: string, fallbackHp: number): BaseStats {
  const tmpl = getEnemyTemplate(archetypeId)
  if (tmpl?.baseStats) return { ...tmpl.baseStats }
  return {
    health: fallbackHp,
    defense: 1,
    attack: 2,
    magicPower: 0,
    mana: 0,
    healPower: 0,
    speed: 2,
    initiative: 6,
    critChance: 2,
  }
}

function makeEnemies(
  scenario: BattleScenario,
  snapshot: BattleAttemptSnapshot,
): Unit[] {
  return scenario.enemies.map((e) => {
    const baseStats = enemyBaseStats(e.archetypeId, e.baseHpStat)
    const maxHp = computeUnitStat({
      baseStat: baseStats.health,
      unitLevel: e.unitLevel,
      worldPower: snapshot.worldPower,
    })
    const initiativeBase = computeEffectiveStat(
      baseStats,
      'initiative',
      e.unitLevel,
      snapshot.worldPower,
    )
    return {
      id: e.id,
      side: 'enemy' as const,
      x: e.x,
      y: e.y,
      hp: maxHp,
      maxHp,
      unitLevel: e.unitLevel,
      archetypeId: e.archetypeId,
      initiativeBase,
      baseStats,
    }
  })
}

function primaryActiveMember(
  snapshot: BattleAttemptSnapshot,
): PartyMemberBattleSnapshot | undefined {
  return snapshot.party.find((member) => member.metaStatus === 'active') ?? snapshot.party[0]
}

/**
 * Собирает начальное состояние боя из сценария и снимка попытки.
 */
export function battleStateFromScenario(
  scenario: BattleScenario,
  snapshot: BattleAttemptSnapshot,
): BattleState {
  const players = makePlayerUnits(snapshot, scenario)
  const enemies = makeEnemies(scenario, snapshot)
  const units = [...players, ...enemies]
  const primary = primaryActiveMember(snapshot)
  return {
    width: scenario.width,
    height: scenario.height,
    walls: scenario.walls,
    units,
    turnOrder: buildRoundTurnOrder(units),
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: snapshot.worldPower,
    playerCardsByUnitId: playerCardsByUnitFromParty(snapshot.party),
    modKillTargetCardId: snapshot.modKillTargetCardId,
    battleLog: [],
    gearCardLevelBonus: primary
      ? aggregateGearCardLevelBonus(primary.items, primary.equipment, getItemTemplate)
      : 0,
  }
}
