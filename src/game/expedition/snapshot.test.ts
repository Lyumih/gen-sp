import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { TEST_BASE_STATS, testCreateCharacter } from '../stats/testFixtures'
import type { ExpeditionChainConfig } from './config'
import { buildExpeditionSnapshot } from './snapshot'

const fourMemberChain: ExpeditionChainConfig = {
  id: 'test-four',
  partySize: 4,
  battleCount: 2,
  battleScenarioIds: ['tutorial', 'two-front'],
}

describe('buildExpeditionSnapshot', () => {
  it('builds squad snapshot with partySize slots and deep-copied loadout/equipment', () => {
    const hero = testCreateCharacter({
      id: 'char-hero-1',
      name: 'Hero',
      classId: 'warrior',
    })
    const ally2 = testCreateCharacter({
      id: 'char-2',
      name: 'Ally 2',
      classId: 'warrior',
      baseStats: { ...TEST_BASE_STATS, initiative: 9 },
    })
    const ally3 = testCreateCharacter({
      id: 'char-3',
      name: 'Ally 3',
      classId: 'warrior',
      baseStats: { ...TEST_BASE_STATS, initiative: 8 },
    })
    const ally4 = testCreateCharacter({
      id: 'char-4',
      name: 'Ally 4',
      classId: 'warrior',
      baseStats: { ...TEST_BASE_STATS, initiative: 7 },
    })

    const campaign = {
      ...initialCampaignState(),
      characters: [hero, ally2, ally3, ally4],
      squad: ['char-hero-1', 'char-2', 'char-3', 'char-4'],
    }

    const selectedIds = ['char-hero-1', 'char-2', 'char-3', 'char-4'] as const
    const expedition = buildExpeditionSnapshot(
      campaign,
      fourMemberChain,
      selectedIds,
      () => 0,
    )

    expect(expedition.partySize).toBe(4)
    expect(expedition.squadSnapshot).toHaveLength(4)
    expect(expedition.battleCount).toBe(2)
    expect(expedition.scenarioChainId).toBe('test-four')
    expect(expedition.battleIndex).toBe(0)
    expect(expedition.shopLocked).toBe(true)

    const liveHero = campaign.characters[0]!
    const snapHero = expedition.squadSnapshot[0]!
    expect(snapHero.characterId).toBe('char-hero-1')
    expect(snapHero.equipment).toEqual(liveHero.equipment)
    expect(snapHero.battleLoadout).toEqual(liveHero.battleLoadout)
    expect(snapHero.equipment).not.toBe(liveHero.equipment)
    expect(snapHero.battleLoadout).not.toBe(liveHero.battleLoadout)
    expect(snapHero.metaStatus).toBe('active')

    liveHero.equipment.weapon = 'mutated'
    liveHero.battleLoadout[0] = 'mutated'
    expect(snapHero.equipment.weapon).not.toBe('mutated')
    expect(snapHero.battleLoadout[0]).not.toBe('mutated')
  })
})
