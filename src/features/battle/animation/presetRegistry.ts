import type { AnimationStep } from './types'

const DURATIONS: Record<AnimationStep['kind'], number> = {
  move: 280,
  teleport: 200,
  strike_melee: 220,
  projectile: 260,
  cast: 180,
  aoe_burst: 600,
  heal: 240,
  resurrect: 450,
  buff_aura: 260,
  debuff_aura: 260,
  status_tick_dot: 120,
  status_tick_regen: 120,
  death: 380,
}

export function getPresetDurationMs(step: AnimationStep, reducedMotion: boolean): number {
  if (reducedMotion) return 0
  return DURATIONS[step.kind]
}

export function stepKindLabel(step: AnimationStep): string {
  return step.kind
}
