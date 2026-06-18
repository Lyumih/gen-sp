import { describe, expect, it } from 'vitest'
import { describeEnemyCodex } from './enemyText'

describe('describeEnemyCodex', () => {
  it('returns label and hp stat line for grunt', () => {
    const d = describeEnemyCodex('grunt', 1)
    expect(d.label).toBe('Рядовой')
    expect(d.lines.some((l) => l.includes('8'))).toBe(true)
  })
})
