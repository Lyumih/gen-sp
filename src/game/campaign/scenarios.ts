import type { BaseStats } from '../config/baseStats'
import { getEnemyArchetype, getEnemyTemplate } from '../content/enemyTemplates'
import {
  enemyCardsByUnitFromScenario,
  enemyPassivesByUnitFromScenario,
} from '../battle/enemyCards'
import { computeEffectiveStat, computeGearStatBonuses } from '../stats/effectiveStats'
import { buildRoundTurnOrder } from '../battle/initiative'
import { computeCharacterMaxHpForScenario } from './heroMaxHp'
import { aggregatePassiveSkillStatBonuses } from '../passives/passiveStatBonuses'
import { playerCardsByUnitFromParty } from '../battle/playerCards'
import { passivesByUnitFromParty } from './playerPassivesFromParty'
import { playerGearModSlotsByUnitFromParty } from './playerGearFromParty'
import { getItemTemplate } from '../content/itemTemplates'
import { computeUnitStat } from '../balance'
import { assignPlayerSpawnPositions, buildSpawnSeed } from '../battle/spawnPlacement'
import {
  makeChaoticSpawnRng,
  pickEnemyArchetypesFromPool,
  resolveChaoticArchetype,
  type ChaoticArchetypeResolution,
} from '../battle/enemySpawn'
import { resolveEnemyUnitDisplay } from '../content/enemyDisplay'
import { hashSeed } from '../stats/rollBaseStats'
import type { BattleAttemptSnapshot, BattleState, IconAccentId, Unit } from '../types'
import { cellKey } from '../battle/grid'
import { unitManaFromBaseStats } from '../battle/mana'
import { applyTowerAffixToUnits } from '../tower/towerAffixes'

export type SpawnZone = { xMin: number; xMax: number; yMin: number; yMax: number }

export type ScenarioEnemySpawn =
  | { kind: 'fixed'; archetypeId: string; x: number; y: number; unitLevel?: number }
  | { kind: 'pool'; poolTags: string[]; count: number; spawnZone?: SpawnZone }

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
  playerSpawnZone?: SpawnZone
  /** Legacy; player HP uses character baseStats.health. */
  heroBaseHpStat: number
  enemySpawns: readonly ScenarioEnemySpawn[]
  isBossScenario?: boolean
  bossIndex?: number
  defaultEnemyUnitLevel?: number
  enemySkillTierGrunt?: number
  enemySkillTierBoss?: number
  towerAffixId?: string
}

export const BOSS_ARCHETYPE_IDS = [
  'boss_iron_colossus',
  'boss_spell_eater',
  'boss_blink_hunter',
  'boss_soul_reaper',
  'boss_abyss_warden',
  'boss_decay_avatar',
  'boss_high_inquisitor',
  'boss_mirror_fiend',
] as const

/** 1-based boss index from the design roster table. */
export function getBossArchetypeId(bossIndex: number): string | undefined {
  return BOSS_ARCHETYPE_IDS[bossIndex - 1]
}

export function isBossCampaignSlot(scenarioSlotIndex: number): boolean {
  return (scenarioSlotIndex + 1) % 4 === 0
}

export function bossIndexForCampaignSlot(scenarioSlotIndex: number): number {
  return Math.floor(scenarioSlotIndex / 4) + 1
}

function defaultEnemySpawnZone(scenario: BattleScenario): SpawnZone {
  return {
    xMin: scenario.width - 1,
    xMax: scenario.width - 1,
    yMin: 0,
    yMax: scenario.height - 1,
  }
}

function defaultBossSpawn(scenario: BattleScenario): ScenarioEnemySpawn {
  const zone = defaultEnemySpawnZone(scenario)
  const y = Math.floor((zone.yMin + zone.yMax) / 2)
  return {
    kind: 'fixed',
    archetypeId: 'boss_iron_colossus',
    x: zone.xMin,
    y,
    unitLevel: 2,
  }
}

export function resolveScenarioForCampaignSlot(
  scenario: BattleScenario,
  scenarioSlotIndex: number,
): BattleScenario {
  if (!isBossCampaignSlot(scenarioSlotIndex)) return scenario

  const bossIndex = bossIndexForCampaignSlot(scenarioSlotIndex)
  return {
    ...scenario,
    isBossScenario: true,
    bossIndex,
    enemySpawns: [defaultBossSpawn(scenario)],
  }
}

export function enemySpawnCount(scenario: BattleScenario): number {
  return scenario.enemySpawns.reduce(
    (total, spawn) => total + (spawn.kind === 'pool' ? spawn.count : 1),
    0,
  )
}

function isInBounds(scenario: BattleScenario, x: number, y: number): boolean {
  return x >= 0 && x < scenario.width && y >= 0 && y < scenario.height
}

function expandSpawnZone(scenario: BattleScenario, zone: SpawnZone): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = []
  for (let y = zone.yMin; y <= zone.yMax; y++) {
    for (let x = zone.xMin; x <= zone.xMax; x++) {
      if (isInBounds(scenario, x, y)) cells.push({ x, y })
    }
  }
  return cells
}

function collectPlayerOccupiedCells(scenario: BattleScenario): Set<string> {
  const occupied = new Set<string>()
  for (const spawn of scenario.playerSpawns) {
    occupied.add(cellKey(spawn.x, spawn.y))
  }
  if (scenario.playerSpawnCells) {
    for (const spawn of scenario.playerSpawnCells) {
      occupied.add(cellKey(spawn.x, spawn.y))
    }
  }
  if (scenario.playerSpawnZone) {
    for (const cell of expandSpawnZone(scenario, scenario.playerSpawnZone)) {
      occupied.add(cellKey(cell.x, cell.y))
    }
  }
  return occupied
}

function collectEnemySpawnCells(
  scenario: BattleScenario,
  zone: SpawnZone,
  occupied: ReadonlySet<string>,
): { x: number; y: number }[] {
  const walls = new Set(scenario.walls)
  return expandSpawnZone(scenario, zone).filter(
    (cell) => !walls.has(cellKey(cell.x, cell.y)) && !occupied.has(cellKey(cell.x, cell.y)),
  )
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  let s = seed >>> 0
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

function makeSpawnRng(seed: number, salt: string): () => number {
  let s = hashSeed(`${seed}:${salt}`) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

function fallbackHpStat(archetypeId: string): number {
  return getEnemyArchetype(archetypeId)?.baseStats.health ?? 8
}

function archetypeIdForFixedSpawn(
  scenario: BattleScenario,
  spawn: Extract<ScenarioEnemySpawn, { kind: 'fixed' }>,
): string {
  if (scenario.isBossScenario && scenario.bossIndex !== undefined) {
    return getBossArchetypeId(scenario.bossIndex) ?? spawn.archetypeId
  }
  return spawn.archetypeId
}

function makeScenarioEnemy(
  id: string,
  archetypeId: string,
  x: number,
  y: number,
  unitLevel: number,
): BattleScenarioEnemy {
  return {
    id,
    x,
    y,
    archetypeId,
    unitLevel,
    baseHpStat: fallbackHpStat(archetypeId),
  }
}

export function resolveScenarioEnemies(
  scenario: BattleScenario,
  seed: number,
  _worldPower: number,
): BattleScenarioEnemy[] {
  const enemies: BattleScenarioEnemy[] = []
  const occupied = collectPlayerOccupiedCells(scenario)
  let nextId = 1

  for (const spawn of scenario.enemySpawns) {
    if (spawn.kind === 'fixed') {
      const archetypeId = archetypeIdForFixedSpawn(scenario, spawn)
      const enemy = makeScenarioEnemy(
        `e${nextId++}`,
        archetypeId,
        spawn.x,
        spawn.y,
        spawn.unitLevel ?? (scenario.isBossScenario ? 2 : 1),
      )
      enemies.push(enemy)
      occupied.add(cellKey(enemy.x, enemy.y))
      continue
    }

    const zone = spawn.spawnZone ?? defaultEnemySpawnZone(scenario)
    const poolCells = seededShuffle(
      collectEnemySpawnCells(scenario, zone, occupied),
      hashSeed(`${seed}:cells:${spawn.poolTags.join(',')}`),
    )
    const picks = pickEnemyArchetypesFromPool(
      spawn.poolTags,
      spawn.count,
      makeSpawnRng(seed, `pool:${spawn.poolTags.join(',')}`),
    )
    const placed = Math.min(picks.length, poolCells.length, spawn.count)

    for (let i = 0; i < placed; i++) {
      const cell = poolCells[i]!
      const enemy = makeScenarioEnemy(
        `e${nextId++}`,
        picks[i]!,
        cell.x,
        cell.y,
        scenario.defaultEnemyUnitLevel ?? 1,
      )
      enemies.push(enemy)
      occupied.add(cellKey(enemy.x, enemy.y))
    }
  }

  return enemies
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
    enemySpawns: [
      { kind: 'fixed', archetypeId: 'enemy_orc_ravager', x: 4, y: 2, unitLevel: 1 },
    ],
  },
  {
    id: 'two-front',
    width: 6,
    height: 4,
    walls: [],
    playerSpawns: [{ x: 0, y: 1 }],
    playerSpawnZone: { xMin: 0, xMax: 0, yMin: 0, yMax: 3 },
    heroBaseHpStat: 22,
    enemySpawns: [
      {
        kind: 'pool',
        poolTags: ['arena', 'melee'],
        count: 2,
        spawnZone: { xMin: 5, xMax: 5, yMin: 0, yMax: 3 },
      },
    ],
  },
  {
    id: 'boss-lite',
    width: 5,
    height: 5,
    walls: [cellKey(2, 2)],
    playerSpawns: [{ x: 0, y: 2 }],
    heroBaseHpStat: 24,
    isBossScenario: true,
    bossIndex: 1,
    enemySpawns: [
      { kind: 'fixed', archetypeId: 'boss_iron_colossus', x: 4, y: 2, unitLevel: 2 },
    ],
  },
]

export type MakePlayerUnitsResult = {
  units: Unit[]
  excludedCharacterIds: readonly string[]
}

export function makePlayerUnits(
  snapshot: BattleAttemptSnapshot,
  scenario: BattleScenario,
  enemies: readonly BattleScenarioEnemy[],
  seed?: number,
): MakePlayerUnitsResult {
  const activeMembers = snapshot.party.filter((member) => member.metaStatus === 'active')
  const enemyOccupied = new Set(enemies.map((e) => cellKey(e.x, e.y)))
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
      const baseStats = { ...member.baseStats }
      const { mana, maxMana } = unitManaFromBaseStats(baseStats)
      const passiveEquip = member.passiveEquip ?? [null, null, null, null, null]
      const passiveHpBonus =
        aggregatePassiveSkillStatBonuses(
          member.passives ?? [],
          passiveEquip,
          baseStats,
        ).health ?? 0
      const maxHp =
        computeCharacterMaxHpForScenario(member, scenario, snapshot.worldPower) + passiveHpBonus
      const gearBonuses = computeGearStatBonuses(
        member.items,
        member.equipment,
        getItemTemplate,
      )
      const initiativeBase = computeEffectiveStat(
        baseStats,
        'initiative',
        member.unitLevel,
        snapshot.worldPower,
        gearBonuses.initiative ?? 0,
      )
      return {
        id: member.characterId,
        side: 'player' as const,
        x: spawn.x,
        y: spawn.y,
        hp: maxHp,
        maxHp,
        mana,
        maxMana,
        unitLevel: member.unitLevel,
        initiativeBase,
        baseStats,
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
    manaRegen: 0,
    healPower: 0,
    speed: 2,
    initiative: 6,
    critChance: 2,
  }
}

function makeEnemies(
  enemies: readonly BattleScenarioEnemy[],
  snapshot: BattleAttemptSnapshot,
  spawnSeed: number,
): { units: Unit[]; chaoticByUnitId: Record<string, ChaoticArchetypeResolution> } {
  const chaoticByUnitId: Record<string, ChaoticArchetypeResolution> = {}

  const units = enemies.map((e) => {
    const archetype = getEnemyArchetype(e.archetypeId)
    const chaotic =
      archetype?.isChaotic === true
        ? resolveChaoticArchetype(archetype, makeChaoticSpawnRng(spawnSeed, e.id))
        : null
    if (chaotic) chaoticByUnitId[e.id] = chaotic

    const baseStats = chaotic?.baseStats ?? enemyBaseStats(e.archetypeId, e.baseHpStat)
    const { mana, maxMana } = unitManaFromBaseStats(baseStats)
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
      mana,
      maxMana,
      unitLevel: e.unitLevel,
      archetypeId: e.archetypeId,
      raceId: chaotic?.raceId ?? archetype?.raceId,
      initiativeBase,
      baseStats,
      displayName: display.name,
      iconEmoji: display.emoji,
      iconAccent: display.accent,
      ...(chaotic?.statusEffects ? { statusEffects: chaotic.statusEffects } : {}),
    }
  })

  return { units, chaoticByUnitId }
}

/**
 * Собирает начальное состояние боя из сценария и снимка попытки.
 */
export function battleStateFromScenario(
  scenario: BattleScenario,
  snapshot: BattleAttemptSnapshot,
  spawnSeed?: number,
): BattleState {
  const seed =
    spawnSeed ?? buildSpawnSeed(scenario.id, snapshot.scenarioSlotIndex)
  const resolvedEnemies = resolveScenarioEnemies(scenario, seed, snapshot.worldPower)
  const { units: players, excludedCharacterIds } = makePlayerUnits(
    snapshot,
    scenario,
    resolvedEnemies,
    spawnSeed,
  )
  const { units: enemies, chaoticByUnitId } = makeEnemies(resolvedEnemies, snapshot, seed)
  const affixedEnemies = scenario.towerAffixId
    ? applyTowerAffixToUnits(enemies, scenario.towerAffixId)
    : enemies
  const units = [...players, ...affixedEnemies]
  const phase = players.length === 0 ? 'defeat' : 'ongoing'
  const skillTiers =
    scenario.enemySkillTierGrunt !== undefined || scenario.enemySkillTierBoss !== undefined
      ? {
          gruntTier: scenario.enemySkillTierGrunt ?? 0,
          bossTier: scenario.enemySkillTierBoss ?? 0,
        }
      : undefined
  const playerPassives = passivesByUnitFromParty(snapshot.party)
  const enemyPassives = enemyPassivesByUnitFromScenario(
    resolvedEnemies,
    getEnemyArchetype,
    chaoticByUnitId,
    skillTiers,
  )
  const enemyCards = enemyCardsByUnitFromScenario(
    resolvedEnemies,
    getEnemyArchetype,
    chaoticByUnitId,
    skillTiers,
  )
  const passivesByUnitId =
    Object.keys({ ...playerPassives, ...enemyPassives }).length > 0
      ? { ...playerPassives, ...enemyPassives }
      : undefined
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
    ...(Object.keys(enemyCards).length > 0 ? { enemyCardsByUnitId: enemyCards } : {}),
    passivesByUnitId,
    playerGearModSlotsByUnitId: playerGearModSlotsByUnitFromParty(snapshot.party),
    battleLog: [],
    excludedCharacterIds:
      excludedCharacterIds.length > 0 ? excludedCharacterIds : undefined,
  }
}
