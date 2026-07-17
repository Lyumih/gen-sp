import { useEffect, useReducer, useState } from 'react'
import type { BattleLogEntry, Unit } from '../../../game/types'
import {
  clearQueue,
  createEmptyQueue,
  enqueueSteps,
  getHiddenUnitIds,
  startNextStep,
  type AnimationQueueState,
} from './animationQueueLogic'
import { mapLogEntriesToSteps } from './logToSteps'
import { getPresetDurationMs } from './presetRegistry'
import type { AnimationStep } from './types'

export function diffNewLogEntries(
  battleLog: readonly BattleLogEntry[],
  cursor: number,
): BattleLogEntry[] {
  if (cursor >= battleLog.length) return []
  return battleLog.slice(cursor)
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

type AnimState = {
  cursor: number
  queue: AnimationQueueState
}

type AnimAction =
  | { type: 'reset' }
  | { type: 'sync_log'; battleLog: readonly BattleLogEntry[]; units: readonly Unit[] }
  | { type: 'step_complete' }

function maybeStartNext(queue: AnimationQueueState): AnimationQueueState {
  if (queue.active === null && queue.pending.length > 0) return startNextStep(queue)
  return queue
}

function animReducer(state: AnimState, action: AnimAction): AnimState {
  switch (action.type) {
    case 'reset':
      return { cursor: 0, queue: clearQueue() }
    case 'sync_log': {
      const newEntries = diffNewLogEntries(action.battleLog, state.cursor)
      if (newEntries.length === 0) return state
      const steps = mapLogEntriesToSteps(newEntries, { units: action.units })
      const queue = maybeStartNext(enqueueSteps(state.queue, steps))
      return { cursor: action.battleLog.length, queue }
    }
    case 'step_complete': {
      const cleared = startNextStep({ ...state.queue, active: null })
      return { ...state, queue: maybeStartNext(cleared) }
    }
    default:
      return state
  }
}

export type BattleAnimationController = {
  activeStep: AnimationStep | null
  hiddenUnitIds: ReadonlySet<string>
  queueLength: number
}

export function useBattleAnimationQueue(
  battleLog: readonly BattleLogEntry[],
  units: readonly Unit[],
  enabled: boolean,
): BattleAnimationController {
  const reducedMotion = usePrefersReducedMotion()
  const [state, dispatch] = useReducer(animReducer, undefined, () => ({
    cursor: 0,
    queue: createEmptyQueue(),
  }))

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'reset' })
      return
    }
    dispatch({ type: 'sync_log', battleLog, units })
  }, [enabled, battleLog, units])

  useEffect(() => {
    if (!enabled || !state.queue.active) return

    const duration = getPresetDurationMs(state.queue.active, reducedMotion)
    const timer = window.setTimeout(() => {
      dispatch({ type: 'step_complete' })
    }, duration)

    return () => window.clearTimeout(timer)
  }, [enabled, state.queue.active, reducedMotion])

  const activeStep = state.queue.active
  return {
    activeStep,
    hiddenUnitIds: getHiddenUnitIds(activeStep),
    queueLength: state.queue.pending.length + (state.queue.active ? 1 : 0),
  }
}
