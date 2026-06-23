import { describe, expect, it } from 'vitest'
import { parseDragId, resolveSquadDragDrop, rosterCharacterDragId, squadSlotDragId } from './inventoryDnD'

describe('parseDragId', () => {
  it('parses compound roster-drag ids', () => {
    const id = rosterCharacterDragId('char-hero-1')
    expect(parseDragId(id)).toEqual({ kind: 'roster-drag', value: 'char-hero-1' })
  })

  it('parses compound squad-slot ids', () => {
    const id = squadSlotDragId(2)
    expect(parseDragId(id)).toEqual({ kind: 'squad-slot', value: '2' })
  })

  it('parses simple stash ids', () => {
    expect(parseDragId('stash:item-1')).toEqual({ kind: 'stash', value: 'item-1' })
  })

  it('parses compound stash-empty ids', () => {
    expect(parseDragId('stash-empty:3')).toEqual({ kind: 'stash-empty', value: '3' })
  })

  it('parses compound chest-item ids', () => {
    expect(parseDragId('chest-item:item-1')).toEqual({ kind: 'chest-item', value: 'item-1' })
  })

  it('parses compound chest-drop ids', () => {
    expect(parseDragId('chest-drop:main')).toEqual({ kind: 'chest-drop', value: 'main' })
  })
})

describe('resolveSquadDragDrop', () => {
  it('sets reserve character into empty slot', () => {
    expect(
      resolveSquadDragDrop(['a', null, null, null], 'b', 1),
    ).toEqual({ type: 'set', slotIndex: 1, characterId: 'b' })
  })

  it('swaps two squad members when dropping on occupied slot', () => {
    expect(
      resolveSquadDragDrop(['a', 'b', null, null], 'a', 1),
    ).toEqual({ type: 'swap', from: 0, to: 1 })
  })
})
