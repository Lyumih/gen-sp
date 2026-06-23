import { cellKey } from '../../battle/grid'
import { BOSS_ARCHETYPE_IDS } from '../../campaign/scenarios'
import type { BattleScenario } from '../../campaign/scenarios'
import {
  collectFreeCells,
  makeRng,
  placePoolEnemies,
  rollFieldDimensions,
  rollInt,
  shuffleCells,
} from './placement'
import type { ExpeditionGeneratorContext } from './types'

function bossCountForEnemies(enemyCount: number): number {
  return Math.min(3, Math.ceil(enemyCount / 7))
}

export function generateChaoticMap(ctx: ExpeditionGeneratorContext): BattleScenario {
  const { seed, battleIndex, expeditionPartySize } = ctx
  const rng = makeRng(seed, `chaotic-map:${battleIndex}`)
  const { width, height } = rollFieldDimensions(rng, 1, 20)
  const wallMax = Math.floor((width * height) / 4)
  const wallCount = rollInt(rng, 0, wallMax)

  const allCells: { x: number; y: number }[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      allCells.push({ x, y })
    }
  }
  const walls = shuffleCells(allCells, seed, `chaotic-map:${battleIndex}:walls`)
    .slice(0, wallCount)
    .map((cell) => cellKey(cell.x, cell.y))

  const scenario: BattleScenario = {
    id: `chaotic-map-${seed}-${battleIndex}`,
    width,
    height,
    walls,
    playerSpawns: [{ x: 0, y: 0 }],
    heroBaseHpStat: 20,
    enemySpawns: [],
  }

  const occupied = new Set<string>(walls)
  const activeSpawns = rollInt(rng, 1, Math.min(4, expeditionPartySize))
  const playerCells = shuffleCells(
    collectFreeCells(scenario, occupied),
    seed,
    `chaotic-map:${battleIndex}:players`,
  ).slice(0, activeSpawns)
  for (const cell of playerCells) {
    occupied.add(cellKey(cell.x, cell.y))
  }

  const enemyCount = rollInt(rng, 1, 20)
  const bossCount = bossCountForEnemies(enemyCount)
  const poolCount = Math.max(0, enemyCount - bossCount)
  const fullZone = { xMin: 0, xMax: width - 1, yMin: 0, yMax: height - 1 }

  const poolSpawns = placePoolEnemies({
    scenario,
    seed,
    poolTags: ['arena'],
    count: poolCount,
    zone: fullZone,
    occupied,
  })

  const bossCells = shuffleCells(
    collectFreeCells(scenario, occupied),
    seed,
    `chaotic-map:${battleIndex}:boss-cells`,
  ).slice(0, bossCount)
  const bossIds = shuffleCells([...BOSS_ARCHETYPE_IDS], seed, `chaotic-map:${battleIndex}:boss-pick`)
  const bossSpawns = bossCells.map((cell, index) => ({
    kind: 'fixed' as const,
    archetypeId: bossIds[index % bossIds.length]!,
    x: cell.x,
    y: cell.y,
  }))

  const firstPlayer = playerCells[0] ?? { x: 0, y: 0 }

  return {
    ...scenario,
    playerSpawns: [firstPlayer],
    playerSpawnCells: playerCells,
    enemySpawns: [...poolSpawns, ...bossSpawns],
  }
}
