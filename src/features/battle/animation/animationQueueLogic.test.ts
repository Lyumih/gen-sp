import { describe, expect, it } from 'vitest'
import {
  clearQueue,
  createEmptyQueue,
  enqueueSteps,
  getHiddenUnitIds,
  shouldAdvanceQueue,
  startNextStep,
} from './animationQueueLogic'
import type { AnimationStep } from './types'

const moveStep: AnimationStep = {
  kind: 'move',
  unitId: 'hero',
  from: { x: 0, y: 0 },
  to: { x: 1, y: 0 },
}

describe('animationQueueLogic', () => {
  it('enqueues and starts first step', () => {
    let q = enqueueSteps(createEmptyQueue(), [moveStep])
    expect(q.active).toBeNull()
    q = startNextStep(q)
    expect(q.active).toEqual(moveStep)
    expect(q.pending).toHaveLength(0)
  })

  it('hides unit during move', () => {
    expect(getHiddenUnitIds(moveStep).has('hero')).toBe(true)
  })

  it('does not hide during heal', () => {
    expect(
      getHiddenUnitIds({
        kind: 'heal',
        healerId: 'hero',
        targetId: 'hero',
        amount: 5,
      }).size,
    ).toBe(0)
  })

  it('shouldAdvanceQueue respects duration', () => {
    const q = { pending: [], active: moveStep }
    expect(shouldAdvanceQueue(q, 100, 0, false)).toBe(false)
    expect(shouldAdvanceQueue(q, 281, 0, false)).toBe(true)
  })

  it('shouldAdvanceQueue is instant when reduced motion', () => {
    const q = { pending: [], active: moveStep }
    expect(shouldAdvanceQueue(q, 0, 0, true)).toBe(true)
  })

  it('clearQueue resets state', () => {
    expect(clearQueue()).toEqual({ pending: [], active: null })
  })
})
