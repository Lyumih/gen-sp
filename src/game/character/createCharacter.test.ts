import { describe, expect, it } from 'vitest'
import { createCharacter } from './createCharacter'
import { computeBaseStatRating } from '../stats/computeRating'
import { TEST_BASE_STATS } from '../stats/testFixtures'

describe('createCharacter', () => {
  it('creates character with empty cards and equipment', () => {
    const c = createCharacter({
      id: 'char-1',
      name: 'Test',
      classId: 'warrior',
      baseStats: TEST_BASE_STATS,
      baseStatRating: computeBaseStatRating(TEST_BASE_STATS),
    })
    expect(c.id).toBe('char-1')
    expect(c.unitLevel).toBe(1)
    expect(c.cards).toEqual([])
    expect(c.equipment.weapon).toBeNull()
    expect(c.battleLoadout).toEqual([null, null])
    expect(c.baseStats.health).toBe(20)
  })
})
