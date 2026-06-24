import type { OnboardingState, OnboardingStepId } from './types'

export const DEFAULT_ONBOARDING: OnboardingState = {
  skipMode: false,
  completedSteps: [],
  guidedTutorialDone: false,
  graduated: false,
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
  return { ...onboarding, skipMode: true, guidedTutorialDone: true }
}

export function graduateOnboarding(onboarding: OnboardingState): OnboardingState {
  return {
    ...completeStep(onboarding, 'expedition_completed'),
    graduated: true,
    guidedTutorialDone: true,
  }
}
