import type { BattleScenario } from '../../campaign/scenarios'

export type ExpeditionGeneratorContext = {
  seed: number
  battleIndex: number
  expeditionPartySize: number
}

export type ExpeditionGenerator = (ctx: ExpeditionGeneratorContext) => BattleScenario
