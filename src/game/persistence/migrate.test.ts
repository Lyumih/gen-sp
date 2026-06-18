import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../campaign/runReducer'
import type { CampaignState } from '../types'
import { SCENARIOS } from '../campaign/scenarios'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import { normalizeLoadedCampaign } from './migrate'

describe('normalizeLoadedCampaign scenarioSlotIndex', () => {
  it('fills missing scenarioSlotIndex from scenarioIndex when campaign in progress', () => {
    const snap = {
      worldPower: 0,
      cards: initialCampaignState().cards,
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1' as const,
      gold: 0,
      items: [],
      equipment: { ...EMPTY_EQUIPMENT },
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
      gold: 0,
      items: [],
      equipment: { ...EMPTY_EQUIPMENT },
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
        gold: 0,
        items: [],
        equipment: { ...EMPTY_EQUIPMENT },
      },
    }
    const out = normalizeLoadedCampaign(c)
    expect(out.battleAttemptSnapshot?.scenarioSlotIndex).toBe(2)
  })

  it('clears equipment slot when item id is missing from items', () => {
    const c: CampaignState = {
      ...initialCampaignState(),
      items: [],
      equipment: { ...EMPTY_EQUIPMENT, weapon: 'missing-id' },
    }
    const out = normalizeLoadedCampaign(c)
    expect(out.equipment.weapon).toBeNull()
  })

  it('adds missing starter cards from old saves', () => {
    const strikeOnly = initialCampaignState().cards.filter((c) => c.id === 'c1')
    const c: CampaignState = {
      ...initialCampaignState(),
      cards: strikeOnly,
    }
    const out = normalizeLoadedCampaign(c)
    expect(out.cards.map((card) => card.id)).toEqual(['c1', 'c2'])
    expect(out.cards.find((card) => card.id === 'c2')?.templateId).toBe('fireball')
  })

  it('adds missing starter cards to active battle playerCards', () => {
    const strikeOnly = initialCampaignState().cards.filter((c) => c.id === 'c1')
    const withBattle = applyRunAction(
      { ...initialCampaignState(), cards: strikeOnly },
      { type: 'START_OR_CONTINUE_BATTLE' },
    )
    const out = normalizeLoadedCampaign(withBattle)
    expect(out.battle?.playerCards.map((card) => card.id)).toEqual(['c1', 'c2'])
  })
})
