import type { CampaignState, Expedition } from '../types'
import { getExpeditionChainById } from '../expedition/config'
import { goldForScenarioVictory } from './scenarioRewards'

export const FIRST_TRIAL_GOLD_BONUS = 25

export function isProceduralTrialExpedition(expedition: Expedition | null): boolean {
  if (!expedition) return false
  const chain = getExpeditionChainById(expedition.scenarioChainId)
  return chain?.kind === 'procedural' && chain.tier === 'featured'
}

export function computeVictoryGoldGain(
  state: CampaignState,
  scenarioSlotIndex: number,
): number {
  let gold = goldForScenarioVictory(scenarioSlotIndex)
  const firstTrial =
    isProceduralTrialExpedition(state.expedition) &&
    !state.completedMilestones.includes('milestone_first_trial_win')
  if (firstTrial) {
    gold += FIRST_TRIAL_GOLD_BONUS
  }
  return gold
}
