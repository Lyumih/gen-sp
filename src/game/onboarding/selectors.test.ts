import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { completeStep } from './onboardingState'
import {
  isExpeditionPanelVisible,
  isGuidedTutorialActive,
  isOnboardingExpeditionPending,
} from './selectors'

describe('onboarding selectors', () => {
  it('hides expedition panel until first_battle_won', () => {
    const s = initialCampaignState()
    expect(isExpeditionPanelVisible(s)).toBe(false)
    const won = {
      ...s,
      onboarding: completeStep(s.onboarding, 'first_battle_won'),
    }
    expect(isExpeditionPanelVisible(won)).toBe(true)
  })

  it('guided active only for solo tutorial slot 0', () => {
    const s = initialCampaignState()
    const active = {
      ...s,
      phase: 'battle' as const,
      battleAttemptSnapshot: {
        scenarioSlotIndex: 0,
        worldPower: 0,
        gold: 0,
        party: [],
      },
      battle: {
        phase: 'ongoing' as const,
        width: 5,
        height: 5,
        walls: [],
        units: [],
        turnOrder: [],
        currentTurnIndex: 0,
        roundNumber: 1,
        worldPower: 0,
        playerCardsByUnitId: {},
        battleLog: [],
      },
    }
    expect(isGuidedTutorialActive(active)).toBe(true)
    const skipped = {
      ...active,
      onboarding: { ...active.onboarding, skipMode: true },
    }
    expect(isGuidedTutorialActive(skipped)).toBe(false)
  })

  it('onboarding expedition pending after first_battle_won', () => {
    const s = {
      ...initialCampaignState(),
      onboarding: completeStep(initialCampaignState().onboarding, 'first_battle_won'),
    }
    expect(isOnboardingExpeditionPending(s)).toBe(true)
  })
})
