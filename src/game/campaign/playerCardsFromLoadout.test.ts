import { describe, expect, it } from 'vitest'
import { playerCardsFromLoadout } from './playerCardsFromLoadout'
import type { CardInstance } from '../types'

const c1: CardInstance = {
  id: 'c1',
  templateId: 'strike',
  global_level: 1,
  uses_count: 0,
  modifications: [],
}
const c2: CardInstance = {
  id: 'c2',
  templateId: 'fireball',
  global_level: 1,
  uses_count: 0,
  modifications: [],
}
const c3: CardInstance = {
  id: 'c3',
  templateId: 'heal',
  global_level: 1,
  uses_count: 0,
  modifications: [],
}

describe('playerCardsFromLoadout', () => {
  it('builds battle cards from loadout ids only', () => {
    const cards = playerCardsFromLoadout([c1, c2, c3], ['c1', 'c2'])
    expect(cards.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(cards.every((c) => c.cooldownRemaining === 0)).toBe(true)
  })

  it('ignores unknown ids', () => {
    const cards = playerCardsFromLoadout([c1], ['c1', 'missing'])
    expect(cards.map((c) => c.id)).toEqual(['c1'])
  })
})
