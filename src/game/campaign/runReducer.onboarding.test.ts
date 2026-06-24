import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from './runReducer'
import { completeStep, hasCompletedStep } from '../onboarding/onboardingState'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'

describe('onboarding reducer', () => {
  it('MARK_ONBOARDING_STEP adds step', () => {
    const s = initialCampaignState()
    const next = applyRunAction(s, { type: 'MARK_ONBOARDING_STEP', stepId: 'welcome_seen' })
    expect(hasCompletedStep(next.onboarding, 'welcome_seen')).toBe(true)
  })

  it('SET_ONBOARDING_SKIP enables skipMode', () => {
    const next = applyRunAction(initialCampaignState(), { type: 'SET_ONBOARDING_SKIP' })
    expect(next.onboarding.skipMode).toBe(true)
    expect(next.onboarding.guidedTutorialDone).toBe(true)
  })

  it('START_OR_CONTINUE_BATTLE at scenarioIndex 0 marks first_battle_started', () => {
    const next = applyRunAction(initialCampaignState(), { type: 'START_OR_CONTINUE_BATTLE' })
    expect(hasCompletedStep(next.onboarding, 'first_battle_started')).toBe(true)
  })

  it('START_EXPEDITION campaign-main after first_battle_won uses onboarding battle slice', () => {
    let s = initialCampaignState()
    s = {
      ...s,
      onboarding: completeStep(s.onboarding, 'first_battle_won'),
    }
    const next = applyRunAction(s, {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [LEGACY_HERO_CHARACTER_ID],
    })
    expect(next.expedition?.battleIndex).toBe(1)
    expect(next.expedition?.battleCount).toBe(2)
    expect(hasCompletedStep(next.onboarding, 'expedition_started')).toBe(true)
  })
})
