import { describe, expect, it } from 'vitest'
import { applyTowerFirstClearRewards } from './rewards'
import { createInitialTowerProgress } from './towerProgress'

describe('applyTowerFirstClearRewards', () => {
  it('grants gold once for first clear', () => {
    const t = createInitialTowerProgress(1)
    const r = applyTowerFirstClearRewards(t, 3)
    expect(r.gold).toBe(80)
    expect(r.worldPower).toBe(0)
    expect(r.progress.floorsFirstCleared).toEqual([3])
  })

  it('skips gold on repeat clear', () => {
    const t = { ...createInitialTowerProgress(1), floorsFirstCleared: [3] }
    const r = applyTowerFirstClearRewards(t, 3)
    expect(r.gold).toBe(0)
    expect(r.progress.floorsFirstCleared).toEqual([3])
  })

  it('adds worldPower on floor 10', () => {
    const t = createInitialTowerProgress(1)
    const r = applyTowerFirstClearRewards(t, 10)
    expect(r.worldPower).toBe(1)
    expect(r.gold).toBe(150)
  })
})
