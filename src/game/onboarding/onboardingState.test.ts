import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ONBOARDING,
  applyOnboardingSkip,
  completeStep,
  dismissCoachMark,
  graduateOnboarding,
  hasCompletedStep,
} from './onboardingState'
import { COACH_MARKS } from './coachMarks'

describe('onboardingState', () => {
  it('DEFAULT_ONBOARDING is empty and not graduated', () => {
    expect(DEFAULT_ONBOARDING.completedSteps).toEqual([])
    expect(DEFAULT_ONBOARDING.graduated).toBe(false)
    expect(DEFAULT_ONBOARDING.skipMode).toBe(false)
  })

  it('completeStep is idempotent', () => {
    const once = completeStep(DEFAULT_ONBOARDING, 'welcome_seen')
    const twice = completeStep(once, 'welcome_seen')
    expect(once.completedSteps).toEqual(['welcome_seen'])
    expect(twice.completedSteps).toEqual(['welcome_seen'])
  })

  it('applyOnboardingSkip sets skipMode, guidedTutorialDone, and graduated', () => {
    const next = applyOnboardingSkip(DEFAULT_ONBOARDING)
    expect(next.skipMode).toBe(true)
    expect(next.guidedTutorialDone).toBe(true)
    expect(next.graduated).toBe(true)
    expect(next.dismissedCoachMarkIds).toEqual(COACH_MARKS.map((mark) => mark.id))
  })

  it('dismissCoachMark is idempotent', () => {
    const once = dismissCoachMark(DEFAULT_ONBOARDING, 'trials-intro')
    const twice = dismissCoachMark(once, 'trials-intro')
    expect(once.dismissedCoachMarkIds).toEqual(['trials-intro'])
    expect(twice.dismissedCoachMarkIds).toEqual(['trials-intro'])
  })

  it('graduateOnboarding sets graduated', () => {
    const next = graduateOnboarding(
      completeStep(DEFAULT_ONBOARDING, 'expedition_completed'),
    )
    expect(next.graduated).toBe(true)
    expect(hasCompletedStep(next, 'expedition_completed')).toBe(true)
  })
})
