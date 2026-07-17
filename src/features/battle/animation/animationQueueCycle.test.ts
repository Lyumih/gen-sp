import { describe, expect, it } from 'vitest'
import type { BattleLogEntry, Unit } from '../../../game/types'
import {
  createEmptyQueue,
  enqueueSteps,
  shouldAdvanceQueue,
  startNextStep,
} from './animationQueueLogic'
import { mapLogEntryToSteps } from './logToSteps'
import { FLOAT_READ_MS, getPresetDurationMs } from './presetRegistry'
import { battleAnimationReducer } from './useBattleAnimationQueue'

const units: Unit[] = [
  { id: 'hero', side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 },
  { id: 'e1', side: 'enemy', x: 3, y: 0, hp: 0, maxHp: 5, unitLevel: 1 },
]

function drainStep(state: ReturnType<typeof battleAnimationReducer>) {
  return battleAnimationReducer(state, { type: 'step_complete' })
}

describe('animation queue cycle', () => {
  it('float steps use FLOAT_READ_MS (1000)', () => {
    expect(FLOAT_READ_MS).toBe(1000)
    expect(getPresetDurationMs({
      kind: 'strike_melee',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 5,
    }, false)).toBe(1000)
    expect(getPresetDurationMs({
      kind: 'heal',
      healerId: 'hero',
      targetId: 'hero',
      amount: 4,
    }, false)).toBe(1000)
  })

  it('drains strike then death in order with correct durations', () => {
    const log: BattleLogEntry[] = [{
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 5,
      attackKind: 'melee',
      targetKilled: true,
    }]
    const steps = mapLogEntryToSteps(log[0]!, { units })
    expect(steps.map((s) => s.kind)).toEqual(['strike_melee', 'death'])

    let q = startNextStep(enqueueSteps(createEmptyQueue(), steps))
    expect(q.active?.kind).toBe('strike_melee')
    expect(q.pending).toHaveLength(1)
    expect(getPresetDurationMs(q.active!, false)).toBe(FLOAT_READ_MS)

    expect(shouldAdvanceQueue(q, FLOAT_READ_MS - 1, 0, false)).toBe(false)
    expect(shouldAdvanceQueue(q, FLOAT_READ_MS, 0, false)).toBe(true)

    q = startNextStep({ ...q, active: null })
    q = startNextStep(q)
    expect(q.active?.kind).toBe('death')
    expect(q.pending).toHaveLength(0)
    expect(getPresetDurationMs(q.active!, false)).toBe(380)
  })

  it('drains lifesteal chain: projectile float then heal float', () => {
    const entries: BattleLogEntry[] = [
      {
        type: 'strike',
        attackerId: 'hero',
        targetId: 'e1',
        damage: 6,
        attackKind: 'ranged',
        targetKilled: false,
      },
      {
        type: 'heal',
        healerId: 'hero',
        targetId: 'hero',
        amount: 3,
      },
    ]
    const steps = entries.flatMap((e) => mapLogEntryToSteps(e, { units }))
    expect(steps.map((s) => s.kind)).toEqual(['projectile', 'heal'])

    let state = battleAnimationReducer(
      { cursor: 0, queue: createEmptyQueue() },
      { type: 'sync_log', battleLog: entries, units },
    )
    expect(state.queue.active?.kind).toBe('projectile')
    expect(state.queue.pending).toHaveLength(1)
    expect(state.cursor).toBe(2)

    state = drainStep(state)
    expect(state.queue.active?.kind).toBe('heal')
    expect(state.queue.pending).toHaveLength(0)

    state = drainStep(state)
    expect(state.queue.active).toBeNull()
    expect(state.queue.pending).toHaveLength(0)
  })

  it('appends mid-drain log entries to pending without skipping active step', () => {
    const first: BattleLogEntry[] = [{
      type: 'move',
      unitId: 'hero',
      fromX: 0,
      fromY: 0,
      toX: 1,
      toY: 0,
    }]
    let state = battleAnimationReducer(
      { cursor: 0, queue: createEmptyQueue() },
      { type: 'sync_log', battleLog: first, units },
    )
    expect(state.queue.active?.kind).toBe('move')

    const second: BattleLogEntry[] = [
      ...first,
      {
        type: 'strike',
        attackerId: 'hero',
        targetId: 'e1',
        damage: 4,
        attackKind: 'melee',
        targetKilled: false,
      },
    ]
    state = battleAnimationReducer(state, {
      type: 'sync_log',
      battleLog: second,
      units,
    })
    expect(state.queue.active?.kind).toBe('move')
    expect(state.queue.pending.map((s) => s.kind)).toEqual(['strike_melee'])

    state = drainStep(state)
    expect(state.queue.active?.kind).toBe('strike_melee')
    expect(getPresetDurationMs(state.queue.active!, false)).toBe(FLOAT_READ_MS)
  })

  it('reset clears queue when disabled', () => {
    let state = battleAnimationReducer(
      { cursor: 2, queue: { active: { kind: 'heal', healerId: 'h', targetId: 'h', amount: 1 }, pending: [] } },
      { type: 'reset' },
    )
    expect(state).toEqual({ cursor: 0, queue: createEmptyQueue() })
  })
})
