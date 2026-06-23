import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../campaign/runReducer'
import { getPrimaryCharacter } from '../campaign/selectors'
import { codexEntryId } from '../codex/discovery'
import type { CampaignState } from '../types'
import { SCENARIOS } from '../campaign/scenarios'
import { testCreateCharacter } from '../stats/testFixtures'
import { migrateFromUnknown, migrateV5CampaignToV6, migrateV6CampaignToV7, normalizeLoadedCampaign } from './migrate'
import { MOD_SLOT_MILESTONES } from '../config/modSlotMilestones'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'

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

  it('keeps strike-only hero cards without merging starter pool', () => {
    const init = initialCampaignState()
    const strikeOnly = hero(init).cards
    const c: CampaignState = {
      ...init,
      characters: [{ ...hero(init), cards: strikeOnly }],
    }
    const out = normalizeLoadedCampaign(c)
    expect(hero(out).cards).toHaveLength(1)
    expect(hero(out).cards[0]!.templateId).toBe('strike')
    expect(hero(out).battleLoadout[0]).toBe(hero(out).cards[0]!.id)
  })

  it('normalizes battle playerCards from loadout when in battle', () => {
    const init = initialCampaignState()
    const withBattle = applyRunAction(init, { type: 'START_OR_CONTINUE_BATTLE' })
    const out = normalizeLoadedCampaign(withBattle)
    const strikeId = hero(out).cards[0]!.id
    expect(out.battle?.playerCardsByUnitId[hero(out).id]?.map((card) => card.id)).toEqual([
      strikeId,
    ])
  })

  it('adds battleLoadout default when missing', () => {
    const init = initialCampaignState()
    const legacy = {
      ...init,
      characters: [{ ...hero(init), battleLoadout: undefined }],
    } as unknown as CampaignState
    const out = normalizeLoadedCampaign(legacy)
    const strikeId = hero(out).cards[0]!.id
    expect(hero(out).battleLoadout).toEqual([strikeId, null])
  })
})

describe('normalizeLoadedCampaign legacy codex and mod fields', () => {
  it('v1 envelope without codex fields gets warrior class discovered from roster', () => {
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
    expect(out?.codexDiscovered).toContain(codexEntryId('class', 'warrior'))
    expect(out?.codexSeenEntryIds).toEqual([])
  })

  it('discovers classes from roster idempotently on load', () => {
    const init = initialCampaignState()
    const mage = testCreateCharacter({ id: 'mage-1', name: 'Mage', classId: 'mage' })
    const legacy = {
      ...init,
      codexDiscovered: [codexEntryId('class', 'warrior')],
      characters: [...init.characters, mage],
    }
    const out = normalizeLoadedCampaign(legacy)
    expect(out.codexDiscovered).toContain(codexEntryId('class', 'warrior'))
    expect(out.codexDiscovered).toContain(codexEntryId('class', 'mage'))
    const again = normalizeLoadedCampaign(out)
    expect(again.codexDiscovered).toEqual(out.codexDiscovered)
  })

  it('campaign with modification { level: 0 } clears modSlots when L below milestone', () => {
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
    const out = migrateV5CampaignToV6(c)
    expect(hero(out).cards[0].modSlots).toEqual([])
  })
})

describe('migrateV5CampaignToV6', () => {
  it('v5 kill_reward becomes modSlots filled mod-damage-up', () => {
    const init = initialCampaignState()
    const threshold = MOD_SLOT_MILESTONES.firstThreshold
    const c = {
      ...init,
      modKillTargetCardId: 'c1',
      characters: [
        {
          ...hero(init),
          cards: [
            {
              id: 'c1',
              templateId: 'strike',
              global_level: threshold,
              uses_count: 0,
              modSlots: [{ status: 'filled', templateId: 'kill_reward', lm: 2 }],
            },
            ...hero(init).cards.slice(1),
          ],
        },
      ],
    } as unknown as CampaignState
    const out = migrateFromUnknown({ version: 5, campaign: c })
    expect(hero(out!).cards[0].modSlots[0]).toEqual({
      status: 'filled',
      templateId: 'mod-damage-up',
      lm: 2,
    })
  })

  it('drops modKillTargetCardId', () => {
    const init = initialCampaignState()
    const c = {
      ...init,
      modKillTargetCardId: 'c1',
    } as unknown as CampaignState
    const out = migrateV5CampaignToV6(c)
    expect(out).not.toHaveProperty('modKillTargetCardId')
    expect(out.battleAttemptSnapshot).toBeNull()
  })

  it('migrates codex mod/kill_reward to mod/mod-damage-up', () => {
    const init = initialCampaignState()
    const out = migrateV5CampaignToV6({
      ...init,
      codexDiscovered: ['mod:kill_reward'],
      codexSeenEntryIds: ['mod:kill_reward'],
    })
    expect(out.codexDiscovered).toEqual(
      expect.arrayContaining(['mod:mod-damage-up', codexEntryId('class', 'warrior')]),
    )
    expect(out.codexDiscovered).toHaveLength(2)
    expect(out.codexSeenEntryIds).toEqual(['mod:mod-damage-up'])
  })
})

describe('migrateV6CampaignToV7', () => {
  it('hero keeps only strike; extra cards go to chest', () => {
    const init = initialCampaignState()
    const strike = hero(init).cards[0]!
    const extra = {
      id: 'c-extra',
      templateId: 'fireball',
      global_level: 1,
      uses_count: 0,
      modSlots: [],
    }
    const c: CampaignState = {
      ...init,
      characters: [
        {
          ...hero(init),
          cards: [strike, extra],
          battleLoadout: [strike.id, extra.id] as [string, string],
        },
      ],
    }
    const out = migrateV6CampaignToV7(c)
    expect(hero(out).cards).toHaveLength(1)
    expect(hero(out).cards[0]!.templateId).toBe('strike')
    expect(out.chest.unboundCards.some((card) => card.id === 'c-extra')).toBe(true)
  })

  it('non-hero characters get one random skill; old cards unbound', () => {
    const init = initialCampaignState()
    const recruit = testCreateCharacter({ id: 'char-2', name: 'Наёмник', classId: 'warrior' })
    recruit.cards = [
      { id: 'r1', templateId: 'heal', global_level: 1, uses_count: 0, modSlots: [] },
      { id: 'r2', templateId: 'fireball', global_level: 1, uses_count: 0, modSlots: [] },
    ]
    const c = {
      ...init,
      characters: [hero(init), recruit],
    }
    const out = migrateV6CampaignToV7(c)
    const migrated = out.characters.find((ch) => ch.id === 'char-2')!
    expect(migrated.cards).toHaveLength(1)
    expect(migrated.cards[0]!.templateId).not.toBe('strike')
    expect(out.chest.unboundCards.filter((card) => card.id === 'r1' || card.id === 'r2')).toHaveLength(2)
  })

  it('migrateFromUnknown v6 applies v7 migration', () => {
    const init = initialCampaignState()
    const c = withClassicLegacyCards(init)
    const out = migrateFromUnknown({ version: 6, campaign: c })
    expect(out).not.toBeNull()
    expect(hero(out!).cards.every((card) => card.templateId === 'strike')).toBe(true)
  })
})

function withClassicLegacyCards(c: CampaignState): CampaignState {
  const strike = hero(c).cards[0]!
  const fireball = {
    id: 'c2',
    templateId: 'fireball',
    global_level: 1,
    uses_count: 0,
    modSlots: [],
  }
  return {
    ...c,
    characters: [{ ...hero(c), cards: [strike, fireball], battleLoadout: [strike.id, fireball.id] }],
  }
}
