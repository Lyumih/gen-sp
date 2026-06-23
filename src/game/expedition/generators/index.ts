import type { BattleScenario } from '../../campaign/scenarios'
import { generateAmbush } from './ambush'
import { generateBigArena } from './bigArena'
import { generateChaoticMap } from './chaoticMap'
import { generateSmallSkirmish } from './smallSkirmish'
import { generateTunnel } from './tunnel'
import type { ExpeditionGenerator, ExpeditionGeneratorContext } from './types'

const GENERATORS: Record<string, ExpeditionGenerator> = {
  ambush: generateAmbush,
  'big-arena': generateBigArena,
  'chaotic-map': generateChaoticMap,
  'small-skirmish': generateSmallSkirmish,
  tunnel: generateTunnel,
}

export function getGeneratorById(id: string): ExpeditionGenerator | undefined {
  return GENERATORS[id]
}

export function generateScenario(
  generatorId: string,
  ctx: ExpeditionGeneratorContext,
): BattleScenario {
  const generator = getGeneratorById(generatorId)
  if (!generator) {
    throw new Error(`Unknown expedition generator: ${generatorId}`)
  }
  return generator(ctx)
}
