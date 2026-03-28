import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import type { CampaignState } from '../types'
import { SCENARIOS } from '../campaign/scenarios'
import { normalizeLoadedCampaign } from './migrate'

describe('normalizeLoadedCampaign scenarioSlotIndex', () => {
  it('fills missing scenarioSlotIndex from scenarioIndex when campaign in progress', () => {
    const snap = {
      worldPower: 0,
      cards: initialCampaignState().cards,
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1' as const,
    }
    const c = {
      ...initialCampaignState(),
      scenarioIndex: 1,
      battleAttemptSnapshot: snap,
    } as unknown as CampaignState
    const out = normalizeLoadedCampaign(c)
    expect(out.battleAttemptSnapshot?.scenarioSlotIndex).toBe(1)
  })

  it('fills missing scenarioSlotIndex with 0 when campaign finished', () => {
    const snap = {
      worldPower: 0,
      cards: initialCampaignState().cards,
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1' as const,
    }
    const c = {
      ...initialCampaignState(),
      scenarioIndex: SCENARIOS.length,
      battleAttemptSnapshot: snap,
    } as unknown as CampaignState
    const out = normalizeLoadedCampaign(c)
    expect(out.battleAttemptSnapshot?.scenarioSlotIndex).toBe(0)
  })

  it('does not overwrite existing scenarioSlotIndex', () => {
    const c = {
      ...initialCampaignState(),
      scenarioIndex: SCENARIOS.length,
      battleAttemptSnapshot: {
        worldPower: 0,
        cards: initialCampaignState().cards,
        playerUnitLevel: 1,
        modKillTargetCardId: 'c1',
        scenarioSlotIndex: 2,
      },
    }
    const out = normalizeLoadedCampaign(c)
    expect(out.battleAttemptSnapshot?.scenarioSlotIndex).toBe(2)
  })
})
