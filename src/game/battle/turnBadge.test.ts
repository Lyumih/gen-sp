import { describe, expect, it } from 'vitest'
import { turnBadgeLabel } from './turnBadge'

const alive = new Set(['A', 'B', 'C', 'D'])
const isAlive = (id: string) => alive.has(id)

describe('turnBadgeLabel', () => {
  const order = ['A', 'B', 'C', 'D'] as const

  it('returns null for current actor', () => {
    expect(turnBadgeLabel('C', order, 2, isAlive)).toBeNull()
  })

  it('returns null for dead unit', () => {
    alive.delete('B')
    expect(turnBadgeLabel('B', order, 0, isAlive)).toBeNull()
    alive.add('B')
  })

  it('returns steps until act this round', () => {
    expect(turnBadgeLabel('D', order, 2, isAlive)).toBe('1')
  })

  it('returns null for unit that already acted this round', () => {
    expect(turnBadgeLabel('A', order, 2, isAlive)).toBeNull()
    expect(turnBadgeLabel('B', order, 2, isAlive)).toBeNull()
  })
})
