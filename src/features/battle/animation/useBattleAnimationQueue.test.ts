import { describe, expect, it } from 'vitest'
import type { BattleLogEntry, Unit } from '../../../game/types'
import { createEmptyQueue } from './animationQueueLogic'
import { battleAnimationReducer, diffNewLogEntries } from './useBattleAnimationQueue'

const units: Unit[] = [
  { id: 'hero', side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 },
  { id: 'e1', side: 'enemy', x: 3, y: 0, hp: 5, maxHp: 5, unitLevel: 1 },
]

describe('diffNewLogEntries', () => {
  it('returns slice after cursor', () => {
    const log: BattleLogEntry[] = [
      { type: 'move', unitId: 'h', fromX: 0, fromY: 0, toX: 1, toY: 0 },
      { type: 'heal', healerId: 'h', targetId: 'h', amount: 3 },
    ]
    expect(diffNewLogEntries(log, 1)).toEqual([log[1]])
  })

  it('returns empty when no new entries', () => {
    expect(diffNewLogEntries([], 0)).toEqual([])
  })

  it('syncs new entries when log grows after phase change (enabled stays true)', () => {
    const log: BattleLogEntry[] = [
      { type: 'move', unitId: 'h', fromX: 0, fromY: 0, toX: 1, toY: 0 },
      {
        type: 'strike',
        attackerId: 'h',
        targetId: 'e1',
        damage: 12,
        attackKind: 'melee',
        targetKilled: true,
      },
    ]
    const cursorBeforeFinalHit = 1
    expect(diffNewLogEntries(log, cursorBeforeFinalHit)).toEqual([log[1]!])
  })
})

describe('battleAnimationReducer catch_up', () => {
  it('skips historical log on restore (reload) without enqueueing steps', () => {
    const log: BattleLogEntry[] = [
      {
        type: 'strike',
        attackerId: 'hero',
        targetId: 'e1',
        damage: 4,
        attackKind: 'ranged',
        targetKilled: false,
      },
      {
        type: 'strike',
        attackerId: 'e1',
        targetId: 'hero',
        damage: 3,
        attackKind: 'ranged',
        targetKilled: false,
      },
    ]
    let state = battleAnimationReducer(
      { cursor: 0, queue: createEmptyQueue() },
      { type: 'catch_up', logLength: log.length },
    )
    state = battleAnimationReducer(state, { type: 'sync_log', battleLog: log, units })
    expect(state.cursor).toBe(2)
    expect(state.queue.active).toBeNull()
    expect(state.queue.pending).toHaveLength(0)
  })

  it('allows new log entries after retry resets cursor', () => {
    const staleCursor = 6
    const freshLog: BattleLogEntry[] = []
    let state = battleAnimationReducer(
      { cursor: staleCursor, queue: createEmptyQueue() },
      { type: 'catch_up', logLength: freshLog.length },
    )
    expect(state.cursor).toBe(0)

    const afterMove: BattleLogEntry[] = [{
      type: 'move',
      unitId: 'hero',
      fromX: 0,
      fromY: 0,
      toX: 1,
      toY: 0,
    }]
    state = battleAnimationReducer(state, {
      type: 'sync_log',
      battleLog: afterMove,
      units,
    })
    expect(state.cursor).toBe(1)
    expect(state.queue.active?.kind).toBe('move')
  })
})
