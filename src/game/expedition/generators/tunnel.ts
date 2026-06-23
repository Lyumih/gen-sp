import { BOSS_ARCHETYPE_IDS } from '../../campaign/scenarios'
import { HERO_ARCHETYPE_IDS } from '../../content/enemyArchetypes'
import type { BattleScenario } from '../../campaign/scenarios'
import { makeRng } from './placement'
import type { ExpeditionGeneratorContext } from './types'

const TUNNEL_LENGTH = 10

function pickUniform<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!
}

export function generateTunnel(ctx: ExpeditionGeneratorContext): BattleScenario {
  const { seed, battleIndex } = ctx
  const orientRng = makeRng(seed, `tunnel:${battleIndex}:orient`)
  const horizontal = orientRng() < 0.5
  const width = horizontal ? TUNNEL_LENGTH : 1
  const height = horizontal ? 1 : TUNNEL_LENGTH
  const enemyX = width - 1
  const enemyY = height - 1
  const enemyZone = { xMin: enemyX, xMax: enemyX, yMin: enemyY, yMax: enemyY }
  const playerSpawnZone = { xMin: 0, xMax: 0, yMin: 0, yMax: 0 }

  const enemySpawns: BattleScenario['enemySpawns'] =
    battleIndex === 0
      ? [
          {
            kind: 'pool',
            poolTags: ['arena', 'melee'],
            count: 1,
            spawnZone: enemyZone,
          },
        ]
      : [
          {
            kind: 'fixed',
            archetypeId: pickUniform(
              [...HERO_ARCHETYPE_IDS, ...BOSS_ARCHETYPE_IDS],
              makeRng(seed, `tunnel:${battleIndex}:boss-or-hero`),
            ),
            x: enemyX,
            y: enemyY,
          },
        ]

  return {
    id: `tunnel-${seed}-${battleIndex}`,
    width,
    height,
    walls: [],
    playerSpawns: [{ x: 0, y: 0 }],
    playerSpawnZone,
    heroBaseHpStat: 20,
    enemySpawns,
  }
}
