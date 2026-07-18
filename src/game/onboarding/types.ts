export type OnboardingStepId =
  | 'welcome_seen'
  | 'first_battle_started'
  | 'first_battle_won'
  | 'hub_after_first_win'
  | 'shop_visited'
  | 'expedition_started'
  | 'expedition_completed'
  | 'shop_first_item_bought'
  | 'memento_defeat_debrief'

export type OnboardingState = {
  skipMode: boolean
  completedSteps: readonly OnboardingStepId[]
  guidedTutorialDone: boolean
  graduated: boolean
  tutorialCompleteSeen: boolean
  dismissedCoachMarkIds: readonly string[]
}
