import { cellKey } from './grid'
import { hashSeed } from '../stats/rollBaseStats'
import type { PartyMemberBattleSnapshot } from '../types'
import type { BattleScenario } from '../campaign/scenarios'

export type SpawnPlacementInput = {
  scenario: BattleScenario
  activeMembers: readonly PartyMemberBattleSnapshot[]
  enemyOccupied: ReadonlySet<string>
  seed: number
}

export type SpawnPlacementResult = {
  placements: ReadonlyMap<string, { x: number; y: number }>
  excludedCharacterIds: readonly string[]
}

function isInBounds(
  scenario: BattleScenario,
  x: number,
  y: number,
): boolean {
  return x >= 0 && x < scenario.width && y >= 0 && y < scenario.height
}

function expandZone(
  scenario: BattleScenario,
  zone: NonNullable<BattleScenario['playerSpawnZone']>,
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = []
  for (let y = zone.yMin; y <= zone.yMax; y++) {
    for (let x = zone.xMin; x <= zone.xMax; x++) {
      if (isInBounds(scenario, x, y)) cells.push({ x, y })
    }
  }
  return cells
}

export function collectSpawnCellPool(
  scenario: BattleScenario,
  enemyOccupied: ReadonlySet<string>,
): { x: number; y: number }[] {
  const walls = new Set(scenario.walls)
  let raw: { x: number; y: number }[]

  if (scenario.playerSpawnCells && scenario.playerSpawnCells.length > 0) {
    raw = [...scenario.playerSpawnCells]
  } else if (scenario.playerSpawnZone) {
    raw = expandZone(scenario, scenario.playerSpawnZone)
  } else if (scenario.playerSpawns.length > 0) {
    raw = [...scenario.playerSpawns]
  } else {
    raw = []
    for (let y = 0; y < scenario.height; y++) {
      raw.push({ x: 0, y })
    }
  }

  return raw.filter(
    (c) =>
      isInBounds(scenario, c.x, c.y) &&
      !walls.has(cellKey(c.x, c.y)) &&
      !enemyOccupied.has(cellKey(c.x, c.y)),
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

export function buildSpawnSeed(
  scenarioId: string,
  battleIndex: number,
  expeditionId?: string,
): number {
  return hashSeed(`${scenarioId}:${battleIndex}:${expeditionId ?? 'hub'}`)
}

export function assignPlayerSpawnPositions(
  input: SpawnPlacementInput,
): SpawnPlacementResult {
  const pool = collectSpawnCellPool(input.scenario, input.enemyOccupied)
  const shuffled = seededShuffle(pool, input.seed)
  const members = [...input.activeMembers].sort((a, b) => a.spawnIndex - b.spawnIndex)

  const placements = new Map<string, { x: number; y: number }>()
  const excludedCharacterIds: string[] = []

  members.forEach((member, i) => {
    const cell = shuffled[i]
    if (cell === undefined) {
      excludedCharacterIds.push(member.characterId)
    } else {
      placements.set(member.characterId, cell)
    }
  })

  return { placements, excludedCharacterIds }
}
