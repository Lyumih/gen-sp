import { describe, expect, it } from 'vitest'
import { createCharacter } from './createCharacter'
import { computeBaseStatRating } from '../stats/computeRating'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import { STARTER_CARDS } from '../campaign/runReducer'

describe('createCharacter', () => {
  it('creates character with starter cards clone and empty equipment', () => {
    const c = createCharacter({
      id: 'char-1',
      name: 'Test',
      classId: 'warrior',
      baseStats: TEST_BASE_STATS,
      baseStatRating: computeBaseStatRating(TEST_BASE_STATS),
    })
    expect(c.id).toBe('char-1')
    expect(c.unitLevel).toBe(1)
    expect(c.cards.length).toBe(STARTER_CARDS.length)
    expect(c.cards[0].id).not.toBe(STARTER_CARDS[0].id)
    expect(c.equipment.weapon).toBeNull()
    expect(c.battleLoadout).toEqual([c.cards[0].id, c.cards[1].id])
    expect(c.baseStats.health).toBe(20)
  })
})
