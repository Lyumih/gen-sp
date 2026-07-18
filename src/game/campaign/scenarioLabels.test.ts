import { describe, expect, it } from 'vitest'
import { getScenarioDisplayLabel } from './scenarioLabels'

describe('getScenarioDisplayLabel', () => {
  it('maps tutorial ids', () => {
    expect(getScenarioDisplayLabel('tutorial')).toBe('Первая схватка')
    expect(getScenarioDisplayLabel('two-front')).toBe('Два фронта')
    expect(getScenarioDisplayLabel('boss-lite')).toBe('Босс')
  })

  it('falls back to id', () => {
    expect(getScenarioDisplayLabel('unknown')).toBe('unknown')
  })
})
