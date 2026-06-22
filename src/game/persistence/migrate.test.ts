import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../campaign/runReducer'
import { getPrimaryCharacter } from '../campaign/selectors'
import type { CampaignState } from '../types'
import { SCENARIOS } from '../campaign/scenarios'
import { DEFAULT_MOD_KILL_TEMPLATE_ID } from '../content/modTemplates'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import { migrateFromUnknown, normalizeLoadedCampaign } from './migrate'

function hero(c: CampaignState) {
  return getPrimaryCharacter(c)
}

describe('migrateFromUnknown v2 → v3', () => {
  it('migrates v2 save with flat hero fields to v3 Character roster', () => {
    const v2 = {
      version: 2,
      campaign: {
        scenarioIndex: 0,
        worldPower: 2,
        playerUnitLevel: 3,
        cards: [{ id: 'c1', templateId: 'strike', global_level: 1, uses_count: 0, modSlots: [] }],
        battleLoadout: ['c1', null] as const,
        modKillTargetCardId: 'c1',
        gold: 50,
        items: [],
        equipment: { weapon: null, armor: null, accessory: null },
        phase: 'hub',
        battle: null,
        battleAttemptId: 0,
        battleAttemptSnapshot: null,
        codexDiscovered: [],
        codexSeenEntryIds: [],
      },
    }
    const c = migrateFromUnknown(v2)
    expect(c).not.toBeNull()
    expect(c!.characters).toHaveLength(1)
    expect(c!.characters[0].id).toBe('char-hero-1')
    expect(c!.characters[0].unitLevel).toBe(3)
    expect(c!.characters[0].cards[0].id).toBe('c1')
    expect(c!.squad).toEqual(['char-hero-1', null, null, null])
    expect(c!.expedition).toBeNull()
    expect('playerUnitLevel' in c!).toBe(false)
  })
})

describe('normalizeLoadedCampaign scenarioSlotIndex', () => {
  it('fills missing scenarioSlotIndex from scenarioIndex when campaign in progress', () => {
    const init = initialCampaignState()
    const snap = {
      worldPower: 0,
      cards: hero(init).cards,
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1' as const,
      gold: 0,
      items: [],
      equipment: { ...EMPTY_EQUIPMENT },
    }
    const c = {
      ...init,
      scenarioIndex: 1,
      battleAttemptSnapshot: snap,
    } as unknown as CampaignState
    const out = normalizeLoadedCampaign(c)
    expect(out.battleAttemptSnapshot?.scenarioSlotIndex).toBe(1)
  })

  it('fills missing scenarioSlotIndex with 0 when campaign finished', () => {
    const init = initialCampaignState()
    const snap = {
      worldPower: 0,
      cards: hero(init).cards,
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1' as const,
      gold: 0,
      items: [],
      equipment: { ...EMPTY_EQUIPMENT },
    }
    const c = {
      ...init,
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
        cards: hero(initialCampaignState()).cards,
        battleLoadout: ['c1', 'c2'] as [string | null, string | null],
        playerUnitLevel: 1,
        modKillTargetCardId: 'c1',
        scenarioSlotIndex: 2,
        gold: 0,
        items: [],
        equipment: { ...EMPTY_EQUIPMENT },
      },
    } as unknown as CampaignState
    const out = normalizeLoadedCampaign(c)
    expect(out.battleAttemptSnapshot?.scenarioSlotIndex).toBe(2)
  })

  it('clears equipment slot when item id is missing from items', () => {
    const init = initialCampaignState()
    const c: CampaignState = {
      ...init,
      characters: [
        {
          ...hero(init),
          items: [],
          equipment: { ...EMPTY_EQUIPMENT, weapon: 'missing-id' },
        },
      ],
    }
    const out = normalizeLoadedCampaign(c)
    expect(hero(out).equipment.weapon).toBeNull()
  })

  it('adds missing starter cards from old saves', () => {
    const init = initialCampaignState()
    const strikeOnly = hero(init).cards.filter((c) => c.id === 'c1')
    const c: CampaignState = {
      ...init,
      characters: [{ ...hero(init), cards: strikeOnly }],
    }
    const out = normalizeLoadedCampaign(c)
    expect(hero(out).cards.map((card) => card.id)).toEqual(['c1', 'c2', 'c3'])
    expect(hero(out).cards.find((card) => card.id === 'c2')?.templateId).toBe('fireball')
    expect(hero(out).cards.find((card) => card.id === 'c3')?.templateId).toBe('heal')
    expect(hero(out).battleLoadout).toEqual(['c1', 'c2'])
  })

  it('adds missing starter cards to active battle playerCards', () => {
    const init = initialCampaignState()
    const strikeOnly = hero(init).cards.filter((c) => c.id === 'c1')
    const withBattle = applyRunAction(
      {
        ...init,
        characters: [{ ...hero(init), cards: strikeOnly }],
      },
      { type: 'START_OR_CONTINUE_BATTLE' },
    )
    const out = normalizeLoadedCampaign(withBattle)
    expect(out.battle?.playerCardsByUnitId[hero(out).id]?.map((card) => card.id)).toEqual(['c1', 'c2'])
  })

  it('adds battleLoadout default when missing', () => {
    const init = initialCampaignState()
    const legacy = {
      ...init,
      characters: [{ ...hero(init), battleLoadout: undefined }],
    } as unknown as CampaignState
    const out = normalizeLoadedCampaign(legacy)
    expect(hero(out).battleLoadout).toEqual(['c1', 'c2'])
  })
})

describe('normalizeLoadedCampaign legacy codex and mod fields', () => {
  it('v1 envelope without codex fields gets empty arrays after migrateFromUnknown', () => {
    const v1 = {
      version: 1,
      campaign: {
        scenarioIndex: 0,
        worldPower: 0,
        playerUnitLevel: 1,
        cards: hero(initialCampaignState()).cards,
        battleLoadout: ['c1', 'c2'],
        modKillTargetCardId: 'c1',
        gold: 0,
        items: [],
        equipment: { ...EMPTY_EQUIPMENT },
        phase: 'hub',
        battle: null,
        battleAttemptId: 0,
        battleAttemptSnapshot: null,
      },
    }
    const out = migrateFromUnknown(v1)
    expect(out?.codexDiscovered).toEqual([])
    expect(out?.codexSeenEntryIds).toEqual([])
  })

  it('campaign with modification { level: 0 } only gets templateId backfilled', () => {
    const init = initialCampaignState()
    const c = {
      ...init,
      characters: [
        {
          ...hero(init),
          cards: [
            {
              ...hero(init).cards[0],
              modifications: [{ level: 0 }],
            },
            ...hero(init).cards.slice(1),
          ],
        },
      ],
    } as unknown as CampaignState
    const out = normalizeLoadedCampaign(c)
    expect(hero(out).cards[0].modSlots).toEqual([
      { status: 'filled', templateId: DEFAULT_MOD_KILL_TEMPLATE_ID, lm: 0 },
    ])
  })
})
