import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { initialCampaignState } from '../campaign/runReducer'
import type { BattlePlayerCard, BattleState, CardInstance, Unit } from '../types'
import { codexEntriesByCategory } from './registry'
import {
  codexEntryId,
  codexProgress,
  discoverCodexEntry,
  markCodexSeen,
  mergeBattleCodexDiscoveries,
  unreadCodexEntryIds,
  visibleCodexEntries,
} from './discovery'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function unit(partial: Unit): Unit {
  return partial
}

function battleCard(card: CardInstance): BattlePlayerCard {
  return { ...card, cooldownRemaining: 0 }
}

function battle(
  overrides: Partial<BattleState> & { playerCards?: BattlePlayerCard[] } = {},
): BattleState {
  const { playerCards, ...rest } = overrides
  const base: BattleState = {
    width: 4,
    height: 4,
    walls: [],
    units: [],
    turnOrder: [],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: playerCards ? { [HERO_ID]: playerCards } : {},
    battleLog: [],
    gearCardLevelBonus: 0,
  }
  return {
    ...base,
    ...rest,
    units: rest.units ?? base.units,
    battleLog: rest.battleLog ?? base.battleLog,
  }
}

describe('discoverCodexEntry', () => {
  it('is idempotent', () => {
    const id = codexEntryId('item', 'wooden_sword')
    const once = discoverCodexEntry([], id)
    const twice = discoverCodexEntry(once, id)
    expect(twice).toEqual(once)
    expect(once).toEqual([id])
  })
})

describe('visibleCodexEntries', () => {
  it('hides undiscovered when showAll is false', () => {
    const campaign = {
      ...initialCampaignState(),
      codexDiscovered: [codexEntryId('item', 'wooden_sword')],
      codexSeenEntryIds: [],
    }
    const visible = visibleCodexEntries(campaign, 'item', false)
    expect(visible).toHaveLength(1)
    expect(visible[0]?.templateId).toBe('wooden_sword')
  })

  it('shows all catalog entries when showAll is true', () => {
    const campaign = initialCampaignState()
    const visible = visibleCodexEntries(campaign, 'item', true)
    expect(visible.length).toBeGreaterThan(1)
  })
})

describe('codexProgress', () => {
  it('reports 0 opened and full catalog total for empty campaign', () => {
    const campaign = initialCampaignState()
    const { opened, total } = codexProgress(campaign, 'item')
    expect(opened).toBe(0)
    expect(total).toBe(codexEntriesByCategory('item').length)
  })
})

describe('unreadCodexEntryIds', () => {
  it('returns discovered minus seen', () => {
    const id = codexEntryId('card', 'strike')
    const campaign = {
      ...initialCampaignState(),
      codexDiscovered: [id],
      codexSeenEntryIds: [],
    }
    expect(unreadCodexEntryIds(campaign)).toEqual([id])
    const seen = markCodexSeen(campaign)
    expect(unreadCodexEntryIds(seen)).toEqual([])
  })

  it('ignores stale discovered ids missing from registry', () => {
    const id = codexEntryId('card', 'strike')
    const campaign = {
      ...initialCampaignState(),
      codexDiscovered: [id, 'item:removed_template'],
      codexSeenEntryIds: [],
    }
    expect(unreadCodexEntryIds(campaign)).toEqual([id])
  })
})

describe('mergeBattleCodexDiscoveries', () => {
  it('discovers enemy when killed', () => {
    const prev = battle({
      units: [
        unit({
          id: 'e1',
          side: 'enemy',
          x: 1,
          y: 0,
          hp: 5,
          maxHp: 5,
          unitLevel: 1,
          archetypeId: 'grunt',
        }),
      ],
    })
    const next = battle({
      units: [
        unit({
          id: 'e1',
          side: 'enemy',
          x: 1,
          y: 0,
          hp: 0,
          maxHp: 5,
          unitLevel: 1,
          archetypeId: 'grunt',
        }),
      ],
    })
    expect(mergeBattleCodexDiscoveries(prev, next, [])).toEqual([
      codexEntryId('enemy', 'grunt'),
    ])
  })

  it('discovers mod when level goes from 0 to positive', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'strike',
      global_level: 10,
      uses_count: 0,
      modSlots: [{ status: 'filled', templateId: 'mod-damage-up', lm: 0 }],
    }
    const prev = battle({ playerCards: [battleCard(card)] })
    const next = battle({
      playerCards: [battleCard({ ...card, modSlots: [{ status: 'filled', templateId: 'mod-damage-up', lm: 1 }] })],
    })
    expect(mergeBattleCodexDiscoveries(prev, next, [])).toEqual([
      codexEntryId('mod', 'mod-damage-up'),
    ])
  })

  it('discovers card from new strike battleLog entry', () => {
    const prev = battle({ battleLog: [] })
    const next = battle({
      battleLog: [
        {
          type: 'strike',
          attackerId: HERO_ID,
          targetId: 'e1',
          damage: 5,
          attackKind: 'melee',
          targetKilled: false,
          fromCard: { cardId: 'c1', templateId: 'strike' },
        },
      ],
    })
    expect(mergeBattleCodexDiscoveries(prev, next, [])).toEqual([
      codexEntryId('card', 'strike'),
    ])
  })
})
