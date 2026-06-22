import { describe, expect, it } from 'vitest'
import { CHARACTER_CLASS_IDS, getCharacterClass } from './characterClasses'

const EXPECTED = [
  'warrior',
  'mage',
  'ranger',
  'healer',
  'rogue',
  'paladin',
  'warlock',
  'berserker',
]

describe('characterClasses', () => {
  it('has 8 classes', () => {
    expect([...CHARACTER_CLASS_IDS].sort()).toEqual([...EXPECTED].sort())
  })

  it('each class has hirePrice and gearPool', () => {
    for (const id of CHARACTER_CLASS_IDS) {
      const cls = getCharacterClass(id)!
      expect(cls.hirePrice).toBeGreaterThan(0)
      expect(cls.gearPool.length).toBeGreaterThan(0)
      expect('initiativeBase' in cls).toBe(false)
    }
  })
})
