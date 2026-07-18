import type { OnboardingStepId } from './types'

export type OnboardingStepDef = {
  id: OnboardingStepId
  label: string
  hint?: string
}

export const ONBOARDING_STEPS: readonly OnboardingStepDef[] = [
  { id: 'welcome_seen', label: 'Ознакомиться с игрой' },
  {
    id: 'first_battle_started',
    label: 'Сыграть первый бой',
    hint: 'Вкладка «Бой» → плитка «Компания» в «Обучение».',
  },
  {
    id: 'first_battle_won',
    label: 'Победить в обучающем бою',
    hint: 'Победите орка в guided-бою.',
  },
  {
    id: 'hub_after_first_win',
    label: 'Узнать о прогрессе Memento',
    hint: 'Прочитайте debrief после победы.',
  },
  {
    id: 'shop_visited',
    label: 'Заглянуть в магазин',
    hint: 'Купите предмет и наденьте на героя.',
  },
  {
    id: 'expedition_started',
    label: 'Начать обучение (экспедиция)',
    hint: 'Ещё 2 боя подряд; магазин временно закрыт.',
  },
  {
    id: 'expedition_completed',
    label: 'Завершить экспедицию',
    hint: 'Пройдите оставшиеся бои «Компании».',
  },
]
