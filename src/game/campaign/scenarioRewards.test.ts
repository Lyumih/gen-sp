import { describe, expect, it } from 'vitest'
import { goldForScenarioVictory } from './scenarioRewards'

describe('goldForScenarioVictory', () => {
  it('slot 0 (one enemy)', () => {
    expect(goldForScenarioVictory(0)).toBe(55)
  })

  it('slot 2 (one enemy boss)', () => {
    expect(goldForScenarioVictory(2)).toBe(55)
  })

  it('slot 1 (two enemies)', () => {
    expect(goldForScenarioVictory(1)).toBe(60)
  })
})
