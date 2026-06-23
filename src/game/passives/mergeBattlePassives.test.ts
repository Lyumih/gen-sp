import { describe, expect, it } from 'vitest'
import { createPassiveInstance } from './passiveFactory'
import { mergeBattlePassivesIntoCollection } from './mergeBattlePassives'

describe('mergeBattlePassivesIntoCollection', () => {
  it('merges battle progress into collection', () => {
    const collection = [createPassiveInstance('warrior_fortitude', 'p1')]
    const battle = [
      {
        ...collection[0]!,
        global_level: 3,
        uses_count: 5,
        modSlots: [],
      },
    ]
    const merged = mergeBattlePassivesIntoCollection(collection, battle)
    expect(merged[0]!.global_level).toBe(3)
    expect(merged[0]!.uses_count).toBe(5)
  })
})
