import { describe, expect, it } from 'vitest'
import { diffNewLogEntries } from './useBattleAnimationQueue'
import type { BattleLogEntry } from '../../../game/types'

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
})
