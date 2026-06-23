import { cellKey } from '../../battle/grid'
import { pickEnemyArchetypesFromPool } from '../../battle/enemySpawn'
import type { BattleScenario, ScenarioEnemySpawn, SpawnZone } from '../../campaign/scenarios'
import { hashSeed } from '../../stats/rollBaseStats'

export function makeRng(seed: number, salt: string): () => number {
  let s = hashSeed(`${seed}:${salt}`) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

export function rollInt(rng: () => number, min: number, max: number): number {
  if (max < min) return min
  return min + Math.floor(rng() * (max - min + 1))
}

export function rollFieldDimensions(
  rng: () => number,
  minSide: number,
  maxSide: number,
): { width: number; height: number } {
  let width = rollInt(rng, minSide, maxSide)
  let height = rollInt(rng, minSide, maxSide)
  if (width === 1 && height === 1) {
    if (rng() < 0.5) width = 2
    else height = 2
  }
  return { width, height }
}

export function shuffleCells<T>(items: T[], seed: number, salt: string): T[] {
  const out = [...items]
  let s = hashSeed(`${seed}:${salt}`) >>> 0
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

export function collectFreeCells(
  scenario: Pick<BattleScenario, 'width' | 'height' | 'walls'>,
  occupied: ReadonlySet<string>,
): { x: number; y: number }[] {
  const walls = new Set(scenario.walls)
  const cells: { x: number; y: number }[] = []
  for (let y = 0; y < scenario.height; y++) {
    for (let x = 0; x < scenario.width; x++) {
      const key = cellKey(x, y)
      if (!walls.has(key) && !occupied.has(key)) {
        cells.push({ x, y })
      }
    }
  }
  return cells
}

function expandSpawnZone(
  scenario: Pick<BattleScenario, 'width' | 'height'>,
  zone: SpawnZone,
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = []
  for (let y = zone.yMin; y <= zone.yMax; y++) {
    for (let x = zone.xMin; x <= zone.xMax; x++) {
      if (x >= 0 && x < scenario.width && y >= 0 && y < scenario.height) {
        cells.push({ x, y })
      }
    }
  }
  return cells
}

export function placePoolEnemies(input: {
  scenario: BattleScenario
  seed: number
  poolTags: string[]
  count: number
  zone: SpawnZone
  occupied: Set<string>
  unitLevel?: number
}): ScenarioEnemySpawn[] {
  const walls = new Set(input.scenario.walls)
  const zoneCells = expandSpawnZone(input.scenario, input.zone).filter(
    (cell) =>
      !walls.has(cellKey(cell.x, cell.y)) &&
      !input.occupied.has(cellKey(cell.x, cell.y)),
  )
  const poolCells = shuffleCells(
    zoneCells,
    input.seed,
    `cells:${input.poolTags.join(',')}`,
  )
  const picks = pickEnemyArchetypesFromPool(
    input.poolTags,
    input.count,
    makeRng(input.seed, `pool:${input.poolTags.join(',')}`),
  )
  const placed = Math.min(picks.length, poolCells.length, input.count)
  const level = input.unitLevel ?? 1
  const spawns: ScenarioEnemySpawn[] = []

  for (let i = 0; i < placed; i++) {
    const cell = poolCells[i]!
    spawns.push({
      kind: 'fixed',
      archetypeId: picks[i]!,
      x: cell.x,
      y: cell.y,
      unitLevel: level,
    })
    input.occupied.add(cellKey(cell.x, cell.y))
  }

  return spawns
}
