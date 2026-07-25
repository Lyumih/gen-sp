import { describe, expect, it } from 'vitest'
import {
  applyTowerFloorVictory,
  createInitialTowerProgress,
  resetTowerProgress,
} from './towerProgress'

describe('towerProgress', () => {
  it('createInitialTowerProgress starts at floor 1', () => {
    const t = createInitialTowerProgress(42)
    expect(t).toEqual({
      currentFloor: 1,
      bestFloor: 0,
      runSeed: 42,
      floorsFirstCleared: [],
    })
  })

  it('applyTowerFloorVictory increments floor and bestFloor', () => {
    const t = createInitialTowerProgress(1)
    const next = applyTowerFloorVictory(t, 1)
    expect(next.currentFloor).toBe(2)
    expect(next.bestFloor).toBe(1)
  })

  it('resetTowerProgress keeps first-clear and best, resets floor and seed', () => {
    const t = applyTowerFloorVictory(
      { ...createInitialTowerProgress(1), floorsFirstCleared: [1, 2] },
      5,
    )
    const reset = resetTowerProgress(t, 999)
    expect(reset.currentFloor).toBe(1)
    expect(reset.runSeed).toBe(999)
    expect(reset.bestFloor).toBe(5)
    expect(reset.floorsFirstCleared).toEqual([1, 2])
  })
})
