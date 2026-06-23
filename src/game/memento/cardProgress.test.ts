import { describe, expect, it } from 'vitest'
import { applyCardUse } from './cardProgress'

describe('applyCardUse', () => {
  it('applyCardUse with lucky retries failed roll', () => {
    let n = 0
    const rng = () => (n++ === 0 ? 1 : 100)
    const out = applyCardUse({ global_level: 50, uses_count: 0 }, rng, { lucky: true })
    expect(out.leveledUp).toBe(true)
  })
})
