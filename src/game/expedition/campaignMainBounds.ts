import { SCENARIOS } from '../campaign/scenarios'
import { isOnboardingExpeditionPending } from '../onboarding/selectors'
import type { CampaignState } from '../types'

export function resolveCampaignMainExpeditionBounds(state: CampaignState): {
  battleIndex: number
  battleCount: number
} {
  if (isOnboardingExpeditionPending(state)) {
    return { battleIndex: 1, battleCount: SCENARIOS.length }
  }
  const battleIndex = state.scenarioIndex
  const battleCount = SCENARIOS.length
  return { battleIndex, battleCount }
}
