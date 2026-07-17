import type { AnimationStep } from './types'

export const FLOAT_READ_MS = 700

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

export function hasFloatText(step: AnimationStep): boolean {
  switch (step.kind) {
    case 'strike_melee':
    case 'projectile':
      return step.damage > 0
    case 'heal':
    case 'resurrect':
    case 'status_tick_dot':
    case 'status_tick_regen':
    case 'buff_aura':
    case 'debuff_aura':
      return true
    case 'aoe_burst':
      return (step.damage ?? 0) > 0
    default:
      return false
  }
}

export function getPresetDurationMs(step: AnimationStep, reducedMotion: boolean): number {
  if (reducedMotion) return 0
  const base = DURATIONS[step.kind]
  if (!hasFloatText(step)) return base
  return Math.max(base, FLOAT_READ_MS)
}

export function stepKindLabel(step: AnimationStep): string {
  return step.kind
}
