import type { BattleScenario } from '../../campaign/scenarios'
import { makeRng } from './placement'
import type { ExpeditionGeneratorContext } from './types'

export function generateSmallSkirmish(ctx: ExpeditionGeneratorContext): BattleScenario {
  const { seed, battleIndex } = ctx
  const orientRng = makeRng(seed, `small-skirmish:${battleIndex}:orient`)
  const horizontal = orientRng() < 0.5
  const width = horizontal ? 2 : 1
  const height = horizontal ? 1 : 2
  const enemyX = width - 1
  const enemyY = height - 1

  return {
    id: `small-skirmish-${seed}-${battleIndex}`,
    width,
    height,
    walls: [],
    playerSpawns: [{ x: 0, y: 0 }],
    heroBaseHpStat: 20,
    enemySpawns: [
      {
        kind: 'pool',
        poolTags: ['arena', 'melee'],
        count: 1,
        spawnZone: { xMin: enemyX, xMax: enemyX, yMin: enemyY, yMax: enemyY },
      },
    ],
  }
}
