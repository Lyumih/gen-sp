import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '../campaign/scenarios'
import { completeStep, DEFAULT_ONBOARDING } from '../onboarding/onboardingState'
import { resolveCampaignMainExpeditionBounds } from './campaignMainBounds'
import { initialCampaignState } from '../campaign/runReducer'
import { isOnboardingExpeditionPending } from '../onboarding/selectors'

describe('resolveCampaignMainExpeditionBounds', () => {
  it('onboarding after first win uses battles 1-2', () => {
    let onboarding = completeStep(DEFAULT_ONBOARDING, 'first_battle_won')
    const state = {
      ...initialCampaignState(),
      scenarioIndex: 1,
      onboarding,
    }
    expect(isOnboardingExpeditionPending(state)).toBe(true)
    expect(resolveCampaignMainExpeditionBounds(state)).toEqual({
      battleIndex: 1,
      battleCount: SCENARIOS.length,
    })
  })

  it('skip path at scenarioIndex 0 uses all scenarios', () => {
    const state = {
      ...initialCampaignState(),
      scenarioIndex: 0,
      onboarding: { ...DEFAULT_ONBOARDING, skipMode: true },
    }
    expect(resolveCampaignMainExpeditionBounds(state)).toEqual({
      battleIndex: 0,
      battleCount: SCENARIOS.length,
    })
  })

  it('mid campaign at index 1 uses remaining battles', () => {
    const state = {
      ...initialCampaignState(),
      scenarioIndex: 1,
      onboarding: { ...DEFAULT_ONBOARDING, skipMode: true, graduated: true },
    }
    expect(resolveCampaignMainExpeditionBounds(state)).toEqual({
      battleIndex: 1,
      battleCount: SCENARIOS.length,
    })
  })
})
