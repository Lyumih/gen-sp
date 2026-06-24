import type { CampaignState } from '../types'
import { SCENARIOS } from '../campaign/scenarios'
import { hasCompletedStep } from './onboardingState'
import type { OnboardingState } from './types'

export function isOnboardingActive(onboarding: OnboardingState): boolean {
  return !onboarding.graduated && !onboarding.skipMode
}

export function isExpeditionPanelVisible(campaign: CampaignState): boolean {
  const o = campaign.onboarding
  if (o.graduated || o.skipMode) return true
  return hasCompletedStep(o, 'first_battle_won')
}

export function isGuidedTutorialActive(campaign: CampaignState): boolean {
  const o = campaign.onboarding
  if (o.skipMode || o.guidedTutorialDone || o.graduated) return false
  if (campaign.expedition !== null) return false
  if (campaign.battleAttemptSnapshot?.scenarioSlotIndex !== 0) return false
  return campaign.battle !== null
}

export function shouldShowCoachMarks(onboarding: OnboardingState): boolean {
  return !onboarding.skipMode && !onboarding.graduated
}

export function isOnboardingExpeditionPending(campaign: CampaignState): boolean {
  const o = campaign.onboarding
  return (
    hasCompletedStep(o, 'first_battle_won') &&
    !o.graduated &&
    !hasCompletedStep(o, 'expedition_completed')
  )
}

export function isCompletingOnboardingExpedition(campaign: CampaignState): boolean {
  const exp = campaign.expedition
  if (!exp) return false
  return (
    exp.scenarioChainId === 'campaign-main' &&
    exp.battleCount === 2 &&
    exp.battleIndex >= exp.battleCount &&
    isOnboardingExpeditionPending(campaign)
  )
}

export function soloTutorialVictoryJustAchieved(
  campaign: CampaignState,
  scenarioSlot: number,
): boolean {
  return (
    campaign.expedition === null &&
    scenarioSlot === 0 &&
    !hasCompletedStep(campaign.onboarding, 'first_battle_won')
  )
}

export function campaignFullyCompleteScenarioIndex(): number {
  return SCENARIOS.length
}
