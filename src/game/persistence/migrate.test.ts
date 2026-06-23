import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../campaign/runReducer'
import type { BattleState, BattleLoadout } from '../types'
import { getPrimaryCharacter } from '../campaign/selectors'
import { codexEntryId } from '../codex/discovery'
import type { CampaignState } from '../types'
import { SCENARIOS } from '../campaign/scenarios'
import { testCreateCharacter } from '../stats/testFixtures'
import {
  migrateFromUnknown,
  migrateV5CampaignToV6,
  migrateV6CampaignToV7,
  migrateV8CampaignToV9,
  normalizeLoadedCampaign,
} from './migrate'
import { SAVE_VERSION } from './schema'
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
        battleLoadout: ['c1', 'c2', null] as [string | null, string | null, string | null],
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
    expect(hero(out).battleLoadout).toEqual([strikeId, null, null])
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
          battleLoadout: [strike.id, extra.id] as unknown as BattleLoadout,
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

describe('migrate v7 → v8 gear damage mult', () => {
  it('migrates v7 battle gearCardLevelBonus to gear mult fields', () => {
    const init = initialCampaignState()
    const sword = { id: 'w1', templateId: 'wooden_sword', itemLevel: 50, modSlots: [] }
    const withGear = {
      ...init,
      characters: [
        {
          ...hero(init),
          items: [sword],
          equipment: { weapon: 'w1', armor: null, accessory: null },
        },
      ],
    }
    const inBattle = applyRunAction(withGear, { type: 'START_OR_CONTINUE_BATTLE' })
    const battle = inBattle.battle!
    const { gearDamageMult: _g, gearStrikeDamageMult: _s, ...legacyBattle } = battle
    const raw = {
      version: 7,
      campaign: {
        ...inBattle,
        battle: { ...legacyBattle, gearCardLevelBonus: 50 },
      },
    }
    const loaded = migrateFromUnknown(raw)
    expect(loaded).not.toBeNull()
    expect(loaded!.battle?.gearDamageMult).toBeCloseTo(1.5, 5)
    expect(loaded!.battle?.gearStrikeDamageMult).toBeGreaterThanOrEqual(1)
    expect(
      (loaded!.battle as BattleState & { gearCardLevelBonus?: number }).gearCardLevelBonus,
    ).toBeUndefined()
  })

  it('falls back to legacy bonus when hero has no items', () => {
    const init = initialCampaignState()
    const inBattle = applyRunAction(init, { type: 'START_OR_CONTINUE_BATTLE' })
    const battle = inBattle.battle!
    const { gearDamageMult: _g, gearStrikeDamageMult: _s, ...legacyBattle } = battle
    const loaded = migrateFromUnknown({
      version: 7,
      campaign: {
        ...inBattle,
        battle: { ...legacyBattle, gearCardLevelBonus: 25 },
      },
    })
    expect(loaded?.battle?.gearDamageMult).toBeCloseTo(1.25, 5)
    expect(loaded?.battle?.gearStrikeDamageMult).toBeCloseTo(1.25, 5)
  })
})

describe('migrate v8 → v9 passives and loadout', () => {
  function v8CampaignWithoutPassives(c: CampaignState): CampaignState {
    const strike = hero(c).cards[0]!
    const fireball = {
      id: 'c2',
      templateId: 'fireball',
      global_level: 1,
      uses_count: 0,
      modSlots: [],
    }
    const { passives: _p, passiveEquip: _pe, ...charWithoutPassives } = hero(c)
    return {
      ...c,
      characters: [
        {
          ...charWithoutPassives,
          cards: [strike, fireball],
          battleLoadout: [strike.id, fireball.id] as unknown as BattleLoadout,
        } as (typeof c.characters)[number],
      ],
      chest: { items: [], unboundCards: [], unboundPassives: [] },
    }
  }

  it('v8→v9 adds passives and extends loadout to 3', () => {
    const v8 = { version: 8 as const, campaign: v8CampaignWithoutPassives(initialCampaignState()) }
    const out = migrateFromUnknown(v8)
    expect(out).not.toBeNull()
    expect(SAVE_VERSION).toBe(9)
    expect(hero(out!).passives).toEqual([])
    expect(hero(out!).passiveEquip).toEqual([null, null, null, null])
    expect(hero(out!).battleLoadout).toHaveLength(3)
    expect(hero(out!).battleLoadout[2]).toBeNull()
    expect(out!.chest.unboundPassives).toEqual([])
  })

  it('migrateV8CampaignToV9 completes partially padded loadout from v8 normalize', () => {
    const init = initialCampaignState()
    const strike = hero(init).cards[0]!
    const { passives: _p, passiveEquip: _pe, ...charWithoutPassives } = hero(init)
    const legacy = {
      ...init,
      characters: [
        {
          ...charWithoutPassives,
          battleLoadout: [strike.id, null] as unknown as BattleLoadout,
        },
      ],
      chest: { items: [], unboundCards: [], unboundPassives: undefined as unknown as [] },
    } as unknown as CampaignState
    const out = migrateV8CampaignToV9(legacy)
    expect(hero(out).passives).toEqual([])
    expect(hero(out).passiveEquip).toEqual([null, null, null, null])
    expect(hero(out).battleLoadout).toEqual([strike.id, null, null])
    expect(out.chest.unboundPassives).toEqual([])
  })

  it('migrateFromUnknown accepts version 9 saves', () => {
    const out = migrateFromUnknown({ version: 9, campaign: initialCampaignState() })
    expect(out).not.toBeNull()
    expect(hero(out!).passives).toEqual([])
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
    characters: [{ ...hero(c), cards: [strike, fireball], battleLoadout: [strike.id, fireball.id] as unknown as BattleLoadout }],
  }
}
