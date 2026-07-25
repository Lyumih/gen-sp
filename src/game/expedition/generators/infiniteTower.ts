import { cellKey } from '../../battle/grid'
import { BOSS_ARCHETYPE_IDS, type BattleScenario, type SpawnZone } from '../../campaign/scenarios'
import {
  encounterSpecForTowerFloor,
  type EncounterLayoutProfile,
} from '../../encounter/encounterSpec'
import {
  collectFreeCells,
  makeRng,
  placePoolEnemies,
  shuffleCells,
} from './placement'

export type InfiniteTowerGeneratorInput = {
  runSeed: number
  floor: number
}

export const TOWER_AFFIX_IDS = [
  'tower_affix_enemy_initiative',
  'tower_affix_heal_down',
  'tower_affix_narrow_field',
] as const

export type TowerAffixId = (typeof TOWER_AFFIX_IDS)[number]

function affixPoolForCycle(cycle: number): readonly TowerAffixId[] {
  const tier = Math.max(1, cycle - 1)
  const count = Math.min(TOWER_AFFIX_IDS.length, tier)
  return TOWER_AFFIX_IDS.slice(0, count)
}

export function rollTowerAffixId(runSeed: number, floor: number): string | undefined {
  if (floor < 11) return undefined
  const cycle = Math.ceil(floor / 10)
  const pool = affixPoolForCycle(cycle)
  if (pool.length === 0) return undefined
  const rng = makeRng(runSeed, `tower:${floor}:affix`)
  const idx = Math.floor(rng() * pool.length)
  return pool[idx]
}

function layoutDimensions(profile: EncounterLayoutProfile, affixId?: string): {
  width: number
  height: number
  playerZone: SpawnZone
  enemyZone: SpawnZone
} {
  if (profile === 'compact') {
    const width = affixId === 'tower_affix_narrow_field' ? 5 : 8
    const height = affixId === 'tower_affix_narrow_field' ? 8 : 8
    return {
      width,
      height,
      playerZone: { xMin: 0, xMax: 1, yMin: 0, yMax: height - 1 },
      enemyZone: { xMin: width - 2, xMax: width - 1, yMin: 0, yMax: height - 1 },
    }
  }
  const width = affixId === 'tower_affix_narrow_field' ? 8 : 10
  const height = 20
  return {
    width,
    height,
    playerZone: { xMin: 0, xMax: 3, yMin: 0, yMax: height - 1 },
    enemyZone: { xMin: width - 4, xMax: width - 1, yMin: 0, yMax: height - 1 },
  }
}

function pickBossArchetype(runSeed: number, floor: number, slot: number): string {
  const order = shuffleCells([...BOSS_ARCHETYPE_IDS], runSeed, `tower:${floor}:boss-pick`)
  return order[slot % order.length]!
}

export function generateInfiniteTower(input: InfiniteTowerGeneratorInput): BattleScenario {
  const { runSeed, floor } = input
  const affixId = rollTowerAffixId(runSeed, floor)
  const spec = encounterSpecForTowerFloor(floor, affixId)
  const layout = layoutDimensions(spec.layoutProfile, affixId)

  const scenario: BattleScenario = {
    id: `infinite-tower-${runSeed}-${floor}`,
    width: layout.width,
    height: layout.height,
    walls: [],
    playerSpawns: [{ x: layout.playerZone.xMin, y: layout.playerZone.yMin }],
    playerSpawnZone: layout.playerZone,
    heroBaseHpStat: 20,
    enemySpawns: [],
    defaultEnemyUnitLevel: spec.enemyUnitLevel,
    enemySkillTierGrunt: Math.max(0, spec.skillTier - 1),
    enemySkillTierBoss: spec.skillTier,
    ...(affixId !== undefined ? { towerAffixId: affixId } : {}),
  }

  const occupied = new Set<string>()
  const gruntSpawns = placePoolEnemies({
    scenario,
    seed: runSeed,
    poolTags: [...spec.poolTags],
    count: spec.gruntCount,
    zone: layout.enemyZone,
    occupied,
    unitLevel: spec.enemyUnitLevel,
  })

  const bossScenario: BattleScenario = { ...scenario, enemySpawns: gruntSpawns }
  const bossCells = shuffleCells(
    collectFreeCells(bossScenario, occupied).filter(
      (cell) =>
        cell.x >= layout.enemyZone.xMin &&
        cell.x <= layout.enemyZone.xMax &&
        cell.y >= layout.enemyZone.yMin &&
        cell.y <= layout.enemyZone.yMax,
    ),
    runSeed,
    `tower:${floor}:boss-cells`,
  )

  const bossSpawns = bossCells.slice(0, spec.bossCount).map((cell, slot) => {
    occupied.add(cellKey(cell.x, cell.y))
    return {
      kind: 'fixed' as const,
      archetypeId: pickBossArchetype(runSeed, floor, slot),
      x: cell.x,
      y: cell.y,
      unitLevel: spec.enemyUnitLevel,
    }
  })

  return {
    ...scenario,
    enemySpawns: [...gruntSpawns, ...bossSpawns],
  }
}
