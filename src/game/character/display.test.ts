import { describe, expect, it } from 'vitest'
import { resolveEnemyUnitDisplay } from '../content/enemyDisplay'
import { createCharacter } from './createCharacter'
import { getCharacterDisplay } from './display'
import { TEST_BASE_STATS } from '../stats/testFixtures'

describe('display', () => {
  it('getCharacterDisplay uses character fields', () => {
    const c = createCharacter({
      id: 'c1',
      name: 'Ivan',
      classId: 'warrior',
      baseStats: TEST_BASE_STATS,
      baseStatRating: 0.5,
    })
    const d = getCharacterDisplay({
      ...c,
      iconEmoji: '🗡️',
      iconAccent: 'green',
      iconSkinTone: 'default',
    })
    expect(d).toEqual({
      name: 'Ivan',
      emoji: '🗡️',
      accent: 'green',
      skinTone: 'default',
    })
  })

  it('resolveEnemyUnitDisplay prefers scenario override', () => {
    const d = resolveEnemyUnitDisplay({
      id: 'e1',
      x: 0,
      y: 0,
      baseHpStat: 8,
      unitLevel: 1,
      archetypeId: 'grunt',
      displayName: 'Orc',
      iconEmoji: '🐺',
      iconAccent: 'red',
    })
    expect(d.name).toBe('Orc')
    expect(d.emoji).toBe('🐺')
    expect(d.accent).toBe('red')
  })
})
