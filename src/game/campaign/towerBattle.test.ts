import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from './runReducer'
import { hashSeed } from '../stats/rollBaseStats'

describe('tower battle flow', () => {
  it('START_TOWER_BATTLE sets towerFloor on snapshot', () => {
    const heroId = initialCampaignState().squad[0]!
    const next = applyRunAction(initialCampaignState(), {
      type: 'START_TOWER_BATTLE',
      selectedCharacterIds: [heroId],
    })
    expect(next.phase).toBe('battle')
    expect(next.battleAttemptSnapshot?.towerFloor).toBe(1)
    expect(next.tower?.currentFloor).toBe(1)
  })

  it('RESET_TOWER rolls new seed and floor 1', () => {
    const seed = hashSeed('tower-test')
    let s = initialCampaignState()
    s = {
      ...s,
      tower: {
        currentFloor: 7,
        bestFloor: 6,
        runSeed: seed,
        floorsFirstCleared: [1, 2],
      },
    }
    const next = applyRunAction(s, { type: 'RESET_TOWER' })
    expect(next.tower?.currentFloor).toBe(1)
    expect(next.tower?.runSeed).not.toBe(seed)
    expect(next.tower?.bestFloor).toBe(6)
    expect(next.tower?.floorsFirstCleared).toEqual([1, 2])
  })
})
