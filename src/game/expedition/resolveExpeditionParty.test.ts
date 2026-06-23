import { describe, expect, it } from 'vitest'
import { countOccupiedSquadSlots, resolveExpeditionParty } from './resolveExpeditionParty'

describe('resolveExpeditionParty', () => {
  const squad = ['a', 'b', null, 'c'] as const

  it('returns all occupied slots when markedIds empty', () => {
    expect(resolveExpeditionParty({ squad, markedIds: [], maxParty: 4 })).toEqual(['a', 'b', 'c'])
  })

  it('returns marked in slot order', () => {
    expect(resolveExpeditionParty({ squad, markedIds: ['c', 'a'], maxParty: 4 })).toEqual(['a', 'c'])
  })

  it('trims to maxParty among marked', () => {
    expect(resolveExpeditionParty({ squad, markedIds: ['a', 'b', 'c'], maxParty: 2 })).toEqual(['a', 'b'])
  })

  it('ignores marks for empty slots', () => {
    expect(resolveExpeditionParty({ squad, markedIds: ['ghost'], maxParty: 4 })).toEqual([])
  })
})

describe('countOccupiedSquadSlots', () => {
  it('counts non-null squad entries', () => {
    expect(countOccupiedSquadSlots(['a', null, 'b', null])).toBe(2)
  })
})
