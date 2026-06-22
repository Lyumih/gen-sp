import { describe, expect, it } from 'vitest'
import { mergeBattleCardsIntoCollection } from './mergeBattleCards'
import type { BattlePlayerCard, CardInstance } from '../types'

describe('mergeBattleCardsIntoCollection', () => {
  it('updates collection progress without dropping non-loadout cards', () => {
    const collection: CardInstance[] = [
      { id: 'c1', templateId: 'strike', global_level: 1, uses_count: 0, modSlots: [] },
      { id: 'c3', templateId: 'heal', global_level: 1, uses_count: 0, modSlots: [] },
    ]
    const battle: BattlePlayerCard[] = [
      {
        id: 'c1',
        templateId: 'strike',
        global_level: 1,
        uses_count: 5,
        modSlots: [],
        cooldownRemaining: 2,
      },
    ]
    const merged = mergeBattleCardsIntoCollection(collection, battle)
    expect(merged.find((c) => c.id === 'c1')!.uses_count).toBe(5)
    expect(merged.find((c) => c.id === 'c3')).toBeDefined()
    expect(merged[0]).not.toHaveProperty('cooldownRemaining')
  })
})
