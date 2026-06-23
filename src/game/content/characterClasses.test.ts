import { describe, expect, it } from 'vitest'
import { CARD_ATTACK_TEMPLATES } from './cardTemplates'
import { CHARACTER_CLASS_IDS, CHARACTER_CLASSES, getCharacterClass } from './characterClasses'
import { ITEM_TEMPLATES } from './itemTemplates'

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

  it('recommended card and item ids resolve in catalogs', () => {
    for (const cls of Object.values(CHARACTER_CLASSES)) {
      for (const cardId of cls.recommendedCardIds) {
        expect(CARD_ATTACK_TEMPLATES[cardId], `${cls.id} card ${cardId}`).toBeDefined()
      }
      for (const itemId of cls.recommendedItemIds) {
        expect(ITEM_TEMPLATES[itemId], `${cls.id} item ${itemId}`).toBeDefined()
      }
    }
  })
})
