import { describe, expect, it } from 'vitest'
import { battleLogEntryTone, formatBattleLogEntry } from './battleLog'

describe('formatBattleLogEntry strike absorption', () => {
  it('appends поглощено when absorbedDamage > 0', () => {
    const text = formatBattleLogEntry({
      type: 'strike',
      attackerId: 'e1',
      targetId: 'hero',
      damage: 3,
      absorbedDamage: 7,
      attackKind: 'ranged',
      targetKilled: false,
    })
    expect(text).toContain('3')
    expect(text).toContain('(поглощено 7)')
    expect(text).toContain('(выстрел)')
  })

  it('omits поглощено when no absorbedDamage', () => {
    const text = formatBattleLogEntry({
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 5,
      attackKind: 'melee',
      targetKilled: false,
    })
    expect(text).not.toContain('поглощено')
  })
})

describe('battleLogEntryTone', () => {
  const side = (id: string) => (id === 'hero' ? 'player' : 'enemy') as const

  it('hero strike is hero tone', () => {
    expect(
      battleLogEntryTone(
        { type: 'strike', attackerId: 'hero', targetId: 'e1', damage: 1, attackKind: 'melee', targetKilled: false },
        side,
      ),
    ).toBe('hero')
  })

  it('card_level_up is neutral', () => {
    expect(
      battleLogEntryTone(
        { type: 'card_level_up', cardId: 'c1', templateId: 'strike', fromLevel: 1, toLevel: 2, roll: 42 },
        side,
      ),
    ).toBe('neutral')
  })

  it('failed passive_proc is neutral', () => {
    expect(
      battleLogEntryTone(
        { type: 'passive_proc', templateId: 'riposte', procSuccess: false, unitId: 'hero' },
        side,
      ),
    ).toBe('neutral')
  })
})
