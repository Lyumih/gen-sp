import type { OnboardingState, OnboardingStepId } from './types'
import { COACH_MARKS } from './coachMarks'

export const DEFAULT_ONBOARDING: OnboardingState = {
  skipMode: false,
  completedSteps: [],
  guidedTutorialDone: false,
  graduated: false,
  tutorialCompleteSeen: false,
  dismissedCoachMarkIds: [],
}

export function hasCompletedStep(
  onboarding: OnboardingState,
  stepId: OnboardingStepId,
): boolean {
  return onboarding.completedSteps.includes(stepId)
}

export function completeStep(
  onboarding: OnboardingState,
  stepId: OnboardingStepId,
): OnboardingState {
  if (hasCompletedStep(onboarding, stepId)) return onboarding
  return {
    ...onboarding,
    completedSteps: [...onboarding.completedSteps, stepId],
  }
}

export function applyOnboardingSkip(onboarding: OnboardingState): OnboardingState {
  return dismissAllCoachMarks({
    ...onboarding,
    skipMode: true,
    guidedTutorialDone: true,
    graduated: true,
  })
}

export function dismissCoachMark(
  onboarding: OnboardingState,
  coachMarkId: string,
): OnboardingState {
  if (onboarding.dismissedCoachMarkIds.includes(coachMarkId)) return onboarding
  return {
    ...onboarding,
    dismissedCoachMarkIds: [...onboarding.dismissedCoachMarkIds, coachMarkId],
  }
}

export function dismissAllCoachMarks(onboarding: OnboardingState): OnboardingState {
  const allIds = COACH_MARKS.map((mark) => mark.id)
  const merged = new Set([...onboarding.dismissedCoachMarkIds, ...allIds])
  if (merged.size === onboarding.dismissedCoachMarkIds.length) return onboarding
  return {
    ...onboarding,
    dismissedCoachMarkIds: [...merged],
  }
}

export function graduateOnboarding(onboarding: OnboardingState): OnboardingState {
  return {
    ...completeStep(onboarding, 'expedition_completed'),
    graduated: true,
    guidedTutorialDone: true,
  }
}

export function markTutorialCompleteSeen(onboarding: OnboardingState): OnboardingState {
  if (onboarding.tutorialCompleteSeen) return onboarding
  return { ...onboarding, tutorialCompleteSeen: true }
}
