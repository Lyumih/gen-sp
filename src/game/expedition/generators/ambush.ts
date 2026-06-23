import type { BattleScenario, SpawnZone } from '../../campaign/scenarios'
import { makeRng, rollInt } from './placement'
import type { ExpeditionGeneratorContext } from './types'

const FIELD_SIZE = 10

const PLAYER_SPAWN_ZONE: SpawnZone = {
  xMin: 3,
  xMax: 6,
  yMin: 3,
  yMax: 6,
}

function perimeterEdgeZones(size: number): SpawnZone[] {
  const last = size - 1
  return [
    { xMin: 0, xMax: last, yMin: 0, yMax: 0 },
    { xMin: 0, xMax: last, yMin: last, yMax: last },
    { xMin: 0, xMax: 0, yMin: 1, yMax: last - 1 },
    { xMin: last, xMax: last, yMin: 1, yMax: last - 1 },
  ]
}

function splitCount(total: number, parts: number): number[] {
  const base = Math.floor(total / parts)
  const remainder = total % parts
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0))
}

export function generateAmbush(ctx: ExpeditionGeneratorContext): BattleScenario {
  const { seed, battleIndex } = ctx
  const rng = makeRng(seed, `ambush:${battleIndex}`)
  const enemyCount = rollInt(rng, 1, 8)
  const edgeCounts = splitCount(enemyCount, 4)

  return {
    id: `ambush-${seed}-${battleIndex}`,
    width: FIELD_SIZE,
    height: FIELD_SIZE,
    walls: [],
    playerSpawns: [{ x: PLAYER_SPAWN_ZONE.xMin, y: PLAYER_SPAWN_ZONE.yMin }],
    playerSpawnZone: PLAYER_SPAWN_ZONE,
    heroBaseHpStat: 20,
    enemySpawns: perimeterEdgeZones(FIELD_SIZE)
      .map((spawnZone, index) => ({
        kind: 'pool' as const,
        poolTags: ['arena', 'melee'],
        count: edgeCounts[index]!,
        spawnZone,
      }))
      .filter((spawn) => spawn.count > 0),
  }
}
