import { cellKey } from '../../battle/grid'
import { BOSS_ARCHETYPE_IDS } from '../../campaign/scenarios'
import type { BattleScenario, SpawnZone } from '../../campaign/scenarios'
import {
  collectFreeCells,
  makeRng,
  placePoolEnemies,
  rollInt,
  shuffleCells,
} from './placement'
import type { ExpeditionGeneratorContext } from './types'

const WIDTH = 10
const HEIGHT = 20

const PLAYER_SPAWN_ZONE: SpawnZone = {
  xMin: 0,
  xMax: 3,
  yMin: 0,
  yMax: HEIGHT - 1,
}

const ENEMY_SPAWN_ZONE: SpawnZone = {
  xMin: 6,
  xMax: 9,
  yMin: 0,
  yMax: HEIGHT - 1,
}

const WALL_ZONE: SpawnZone = {
  xMin: 4,
  xMax: 5,
  yMin: 0,
  yMax: HEIGHT - 1,
}

function forbiddenSpawnCells(): Set<string> {
  const forbidden = new Set<string>()
  for (let y = PLAYER_SPAWN_ZONE.yMin; y <= PLAYER_SPAWN_ZONE.yMax; y++) {
    for (let x = PLAYER_SPAWN_ZONE.xMin; x <= PLAYER_SPAWN_ZONE.xMax; x++) {
      forbidden.add(cellKey(x, y))
    }
  }
  for (let y = ENEMY_SPAWN_ZONE.yMin; y <= ENEMY_SPAWN_ZONE.yMax; y++) {
    for (let x = ENEMY_SPAWN_ZONE.xMin; x <= ENEMY_SPAWN_ZONE.xMax; x++) {
      forbidden.add(cellKey(x, y))
    }
  }
  return forbidden
}

function canPlaceCells(
  cells: { x: number; y: number }[],
  width: number,
  height: number,
  forbidden: ReadonlySet<string>,
  occupied: ReadonlySet<string>,
): boolean {
  return cells.every(
    (cell) =>
      cell.x >= 0 &&
      cell.x < width &&
      cell.y >= 0 &&
      cell.y < height &&
      !forbidden.has(cellKey(cell.x, cell.y)) &&
      !occupied.has(cellKey(cell.x, cell.y)),
  )
}

function placeWallBlocks(input: {
  width: number
  height: number
  blockCount: number
  rng: () => number
  forbidden: ReadonlySet<string>
}): string[] {
  const walls: string[] = []
  const occupied = new Set<string>()

  for (let block = 0; block < input.blockCount; block++) {
    const isSquare = input.rng() < 0.5
    let placed = false

    for (let attempt = 0; attempt < 24 && !placed; attempt++) {
      if (isSquare) {
        const x = rollInt(input.rng, WALL_ZONE.xMin, WALL_ZONE.xMax - 1)
        const y = rollInt(input.rng, WALL_ZONE.yMin, WALL_ZONE.yMax - 1)
        const cells = [
          { x, y },
          { x: x + 1, y },
          { x, y: y + 1 },
          { x: x + 1, y: y + 1 },
        ]
        if (canPlaceCells(cells, input.width, input.height, input.forbidden, occupied)) {
          for (const cell of cells) {
            const key = cellKey(cell.x, cell.y)
            walls.push(key)
            occupied.add(key)
          }
          placed = true
        }
      } else {
        const horizontal = input.rng() < 0.5
        const length = rollInt(input.rng, 2, 5)
        if (horizontal) {
          const x = rollInt(input.rng, WALL_ZONE.xMin, WALL_ZONE.xMax - length + 1)
          const y = rollInt(input.rng, WALL_ZONE.yMin, WALL_ZONE.yMax)
          const cells = Array.from({ length }, (_, index) => ({ x: x + index, y }))
          if (canPlaceCells(cells, input.width, input.height, input.forbidden, occupied)) {
            for (const cell of cells) {
              const key = cellKey(cell.x, cell.y)
              walls.push(key)
              occupied.add(key)
            }
            placed = true
          }
        } else {
          const x = rollInt(input.rng, WALL_ZONE.xMin, WALL_ZONE.xMax)
          const y = rollInt(input.rng, WALL_ZONE.yMin, WALL_ZONE.yMax - length + 1)
          const cells = Array.from({ length }, (_, index) => ({ x, y: y + index }))
          if (canPlaceCells(cells, input.width, input.height, input.forbidden, occupied)) {
            for (const cell of cells) {
              const key = cellKey(cell.x, cell.y)
              walls.push(key)
              occupied.add(key)
            }
            placed = true
          }
        }
      }
    }
  }

  return walls
}

export function generateBigArena(ctx: ExpeditionGeneratorContext): BattleScenario {
  const { seed, battleIndex } = ctx
  const rng = makeRng(seed, `big-arena:${battleIndex}`)
  const poolCount = rollInt(rng, 8, 12)
  const bossCount = rollInt(rng, 1, 3)
  const wallBlockCount = rollInt(rng, 1, 10)
  const forbidden = forbiddenSpawnCells()
  const walls = placeWallBlocks({
    width: WIDTH,
    height: HEIGHT,
    blockCount: wallBlockCount,
    rng,
    forbidden,
  })

  const scenario: BattleScenario = {
    id: `big-arena-${seed}-${battleIndex}`,
    width: WIDTH,
    height: HEIGHT,
    walls,
    playerSpawns: [{ x: PLAYER_SPAWN_ZONE.xMin, y: PLAYER_SPAWN_ZONE.yMin }],
    playerSpawnZone: PLAYER_SPAWN_ZONE,
    heroBaseHpStat: 20,
    enemySpawns: [],
  }

  const occupied = new Set<string>(walls)
  const poolSpawns = placePoolEnemies({
    scenario,
    seed,
    poolTags: ['arena', 'melee'],
    count: poolCount,
    zone: ENEMY_SPAWN_ZONE,
    occupied,
  })

  const bossScenario: BattleScenario = { ...scenario, enemySpawns: poolSpawns }
  const bossCells = shuffleCells(
    collectFreeCells(bossScenario, occupied).filter(
      (cell) =>
        cell.x >= ENEMY_SPAWN_ZONE.xMin &&
        cell.x <= ENEMY_SPAWN_ZONE.xMax &&
        cell.y >= ENEMY_SPAWN_ZONE.yMin &&
        cell.y <= ENEMY_SPAWN_ZONE.yMax,
    ),
    seed,
    `big-arena:${battleIndex}:boss-cells`,
  )
  const bossIds = shuffleCells([...BOSS_ARCHETYPE_IDS], seed, `big-arena:${battleIndex}:boss-pick`)
  const bossSpawns = bossCells.slice(0, bossCount).map((cell, index) => {
    occupied.add(cellKey(cell.x, cell.y))
    return {
      kind: 'fixed' as const,
      archetypeId: bossIds[index % bossIds.length]!,
      x: cell.x,
      y: cell.y,
    }
  })

  return {
    ...scenario,
    enemySpawns: [...poolSpawns, ...bossSpawns],
  }
}
