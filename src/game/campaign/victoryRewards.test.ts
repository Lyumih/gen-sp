import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { computeVictoryGoldGain, FIRST_TRIAL_GOLD_BONUS } from './victoryRewards'
import { goldForScenarioVictory } from './scenarioRewards'

describe('computeVictoryGoldGain', () => {
  it('adds first trial bonus during procedural expedition before milestone', () => {
    const state = {
      ...initialCampaignState(),
      expedition: {
        scenarioChainId: 'small-skirmish',
        generationSeed: 1,
        partySize: 1,
        squadSnapshot: [null],
        battleIndex: 0,
        battleCount: 1,
        shopLocked: true as const,
      },
    }
    const base = goldForScenarioVictory(0)
    expect(computeVictoryGoldGain(state, 0)).toBe(base + FIRST_TRIAL_GOLD_BONUS)
  })

  it('does not add bonus after first trial milestone', () => {
    const state = {
      ...initialCampaignState(),
      completedMilestones: ['milestone_first_trial_win' as const],
      expedition: {
        scenarioChainId: 'small-skirmish',
        generationSeed: 1,
        partySize: 1,
        squadSnapshot: [null],
        battleIndex: 0,
        battleCount: 1,
        shopLocked: true as const,
      },
    }
    expect(computeVictoryGoldGain(state, 0)).toBe(goldForScenarioVictory(0))
  })
})
