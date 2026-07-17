import { getPresetDurationMs } from './presetRegistry'
import type { AnimationStep } from './types'

export type AnimationQueueState = {
  pending: AnimationStep[]
  active: AnimationStep | null
}

export function createEmptyQueue(): AnimationQueueState {
  return { pending: [], active: null }
}

export function enqueueSteps(state: AnimationQueueState, steps: AnimationStep[]): AnimationQueueState {
  if (steps.length === 0) return state
  return { ...state, pending: [...state.pending, ...steps] }
}

export function startNextStep(state: AnimationQueueState): AnimationQueueState {
  if (state.active !== null || state.pending.length === 0) return state
  const [next, ...rest] = state.pending
  if (!next) return state
  return { pending: rest, active: next }
}

export function clearQueue(): AnimationQueueState {
  return createEmptyQueue()
}

export function getHiddenUnitIds(active: AnimationStep | null): ReadonlySet<string> {
  if (!active) return new Set()
  switch (active.kind) {
    case 'move':
    case 'teleport':
      return new Set([active.unitId])
    case 'death':
      return new Set()
    default:
      return new Set()
  }
}

export function shouldAdvanceQueue(
  state: AnimationQueueState,
  nowMs: number,
  activeStartedAt: number | null,
  reducedMotion: boolean,
): boolean {
  if (!state.active || activeStartedAt === null) return false
  const duration = getPresetDurationMs(state.active, reducedMotion)
  if (duration === 0) return true
  return nowMs - activeStartedAt >= duration
}
