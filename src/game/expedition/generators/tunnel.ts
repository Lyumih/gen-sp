import { BOSS_ARCHETYPE_IDS } from '../../campaign/scenarios'
import { HERO_ARCHETYPE_IDS } from '../../content/enemyArchetypes'
import type { BattleScenario } from '../../campaign/scenarios'
import { makeRng } from './placement'
import type { ExpeditionGeneratorContext } from './types'

const TUNNEL_LENGTH = 10
const TUNNEL_MAX_PARTY = 2

function pickUniform<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!
}

export function generateTunnel(ctx: ExpeditionGeneratorContext): BattleScenario {
  const { seed, battleIndex, expeditionPartySize } = ctx
  const width = TUNNEL_LENGTH
  const height = Math.min(TUNNEL_MAX_PARTY, Math.max(1, expeditionPartySize))
  const enemyX = width - 1
  const enemyYRng = makeRng(seed, `tunnel:${battleIndex}:enemy-y`)
  const enemyY = height === 1 ? 0 : Math.floor(enemyYRng() * height)
  const enemyZone = { xMin: enemyX, xMax: enemyX, yMin: 0, yMax: height - 1 }
  const playerSpawnZone = { xMin: 0, xMax: 0, yMin: 0, yMax: height - 1 }

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
