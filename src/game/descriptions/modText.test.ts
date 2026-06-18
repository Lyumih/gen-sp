import { describe, expect, it } from 'vitest'
import { describeModCodex } from './modText'

describe('describeModCodex', () => {
  it('returns label and description lines for kill_reward', () => {
    const d = describeModCodex('kill_reward')
    expect(d.label).toBe('Очки за убийство')
    expect(d.lines).toEqual([
      'Начисляет очки первой модификации карты за каждого побеждённого врага.',
    ])
  })
})
