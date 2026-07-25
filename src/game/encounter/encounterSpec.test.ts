import { describe, expect, it } from 'vitest'
import { encounterSpecForTowerFloor, towerCycleIndex } from './encounterSpec'

describe('towerCycleIndex', () => {
  it('maps floor 10 and 11', () => {
    expect(towerCycleIndex(10)).toEqual({ cycle: 1, indexInCycle: 10 })
    expect(towerCycleIndex(11)).toEqual({ cycle: 2, indexInCycle: 1 })
  })
})

describe('encounterSpecForTowerFloor', () => {
  it('floor 1 has one grunt, no affix', () => {
    const s = encounterSpecForTowerFloor(1)
    expect(s.gruntCount).toBe(1)
    expect(s.bossCount).toBe(0)
    expect(s.enemyUnitLevel).toBe(1)
    expect(s.skillTier).toBe(0)
    expect(s.affixId).toBeUndefined()
    expect(s.layoutProfile).toBe('compact')
  })

  it('floor 10 has 8 grunts and 2 bosses', () => {
    const s = encounterSpecForTowerFloor(10)
    expect(s.gruntCount).toBe(8)
    expect(s.bossCount).toBe(2)
    expect(s.layoutProfile).toBe('wide')
  })

  it('floor 11 includes affixId when provided', () => {
    const s = encounterSpecForTowerFloor(11, 'tower_affix_enemy_initiative')
    expect(s.affixId).toBe('tower_affix_enemy_initiative')
    expect(s.enemyUnitLevel).toBe(3)
    expect(s.poolTags).toContain('ranged')
  })
})
