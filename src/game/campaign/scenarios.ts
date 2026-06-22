import type { BaseStats } from '../config/baseStats'
import { getEnemyTemplate } from '../content/enemyTemplates'
import { computeEffectiveStat } from '../stats/effectiveStats'
import { buildRoundTurnOrder } from '../battle/initiative'
import { computeCharacterMaxHpForScenario } from './heroMaxHp'
import { playerCardsByUnitFromParty } from '../battle/playerCards'
import { playerGearModSlotsByUnitFromParty } from './playerGearFromParty'
import { aggregateGearCardLevelBonus } from '../equipment/aggregates'
import { getItemTemplate } from '../content/itemTemplates'
import { computeUnitStat } from '../balance'
import { assignPlayerSpawnPositions, buildSpawnSeed } from '../battle/spawnPlacement'
import { resolveEnemyUnitDisplay } from '../content/enemyDisplay'
import type { BattleAttemptSnapshot, BattleState, IconAccentId, PartyMemberBattleSnapshot, Unit } from '../types'
import { cellKey } from '../battle/grid'

export type BattleScenarioEnemy = {
  id: string
  x: number
  y: number
  /** Legacy fallback when template baseStats missing. */
  baseHpStat: number
  unitLevel: number
  archetypeId: string
  displayName?: string
  iconEmoji?: string
  iconAccent?: IconAccentId
}

export type BattleScenario = {
  id: string
  width: number
  height: number
  walls: readonly string[]
  playerSpawns: { x: number; y: number }[]
  playerSpawnCells?: readonly { x: number; y: number }[]
  playerSpawnZone?: { xMin: number; xMax: number; yMin: number; yMax: number }
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
    playerSpawnZone: { xMin: 0, xMax: 0, yMin: 0, yMax: 3 },
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

export type MakePlayerUnitsResult = {
  units: Unit[]
  excludedCharacterIds: readonly string[]
}

export function makePlayerUnits(
  snapshot: BattleAttemptSnapshot,
  scenario: BattleScenario,
  seed?: number,
): MakePlayerUnitsResult {
  const activeMembers = snapshot.party.filter((member) => member.metaStatus === 'active')
  const enemyOccupied = new Set(scenario.enemies.map((e) => cellKey(e.x, e.y)))
  const spawnSeed =
    seed ?? buildSpawnSeed(scenario.id, snapshot.scenarioSlotIndex)
  const { placements, excludedCharacterIds } = assignPlayerSpawnPositions({
    scenario,
    activeMembers,
    enemyOccupied,
    seed: spawnSeed,
  })

  const units = activeMembers
    .filter((member) => placements.has(member.characterId))
    .map((member) => {
      const spawn = placements.get(member.characterId)!
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

  return { units, excludedCharacterIds }
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
    const display = resolveEnemyUnitDisplay(e)
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
      displayName: display.name,
      iconEmoji: display.emoji,
      iconAccent: display.accent,
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
  spawnSeed?: number,
): BattleState {
  const { units: players, excludedCharacterIds } = makePlayerUnits(
    snapshot,
    scenario,
    spawnSeed,
  )
  const enemies = makeEnemies(scenario, snapshot)
  const units = [...players, ...enemies]
  const primary = primaryActiveMember(snapshot)
  const phase = players.length === 0 ? 'defeat' : 'ongoing'
  return {
    width: scenario.width,
    height: scenario.height,
    walls: scenario.walls,
    units,
    turnOrder: buildRoundTurnOrder(units),
    currentTurnIndex: 0,
    roundNumber: 1,
    phase,
    worldPower: snapshot.worldPower,
    playerCardsByUnitId: playerCardsByUnitFromParty(snapshot.party),
    playerGearModSlotsByUnitId: playerGearModSlotsByUnitFromParty(snapshot.party),
    battleLog: [],
    gearCardLevelBonus: primary
      ? aggregateGearCardLevelBonus(primary.items, primary.equipment, getItemTemplate)
      : 0,
    excludedCharacterIds:
      excludedCharacterIds.length > 0 ? excludedCharacterIds : undefined,
  }
}
