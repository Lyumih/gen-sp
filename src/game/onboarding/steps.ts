import type { OnboardingStepId } from './types'

export type OnboardingStepDef = {
  id: OnboardingStepId
  label: string
}

export const ONBOARDING_STEPS: readonly OnboardingStepDef[] = [
  { id: 'welcome_seen', label: 'Ознакомиться с игрой' },
  { id: 'first_battle_started', label: 'Сыграть первый бой' },
  { id: 'first_battle_won', label: 'Победить в обучающем бою' },
  { id: 'hub_after_first_win', label: 'Узнать о прогрессе Memento' },
  { id: 'shop_visited', label: 'Заглянуть в магазин' },
  { id: 'expedition_started', label: 'Начать экспедицию «Основная кампания»' },
  { id: 'expedition_completed', label: 'Завершить экспедицию (2 боя)' },
]
