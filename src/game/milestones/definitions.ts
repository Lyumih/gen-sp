import type { MilestoneId } from './types'

export type { MilestoneId } from './types'

export type MilestoneDefinition = {
  id: MilestoneId
  label: string
}

export const MILESTONE_DEFINITIONS: readonly MilestoneDefinition[] = [
  { id: 'milestone_first_trial_win', label: 'Выиграть любое испытание' },
  { id: 'milestone_world_power_10', label: 'Довести силу мира до 10' },
  { id: 'milestone_hire_second', label: 'Нанять второго героя' },
  { id: 'milestone_first_mod', label: 'Открыть модификацию умения' },
  { id: 'milestone_big_arena_win', label: 'Победить в «Большой арене»' },
]
