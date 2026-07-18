import type { MilestoneId } from './types'

export type { MilestoneId } from './types'

export type MilestoneDefinition = {
  id: MilestoneId
  label: string
  hint?: string
}

export const MILESTONE_DEFINITIONS: readonly MilestoneDefinition[] = [
  { id: 'milestone_first_trial_win', label: 'Выиграть любое испытание' },
  {
    id: 'milestone_world_power_10',
    label: 'Довести силу мира до 10',
    hint: 'Каждая победа в испытании даёт +1 силу мира.',
  },
  {
    id: 'milestone_hire_second',
    label: 'Нанять второго героя',
    hint: 'Нужно ~30+ золота. Испытания и бонус за первое — основной источник.',
  },
  {
    id: 'milestone_first_mod',
    label: 'Открыть модификацию умения',
    hint: 'Качайте карту до 75+ уровня — откроется слот модификации.',
  },
  { id: 'milestone_big_arena_win', label: 'Победить в «Большой арене»' },
]
