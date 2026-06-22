import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import type { BattleAttemptSnapshot, PartyMemberBattleSnapshot } from '../types'
import { computeCharacterMaxHpForScenario } from './heroMaxHp'
import { SCENARIOS, battleStateFromScenario } from './scenarios'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function member(
  over: Partial<PartyMemberBattleSnapshot> = {},
): PartyMemberBattleSnapshot {
  return {
    characterId: HERO_ID,
    unitLevel: 1,
    baseStats: TEST_BASE_STATS,
    items: [],
    equipment: { ...EMPTY_EQUIPMENT },
    cards: [],
    battleLoadout: ['c1', 'c2'],
    metaStatus: 'active',
    spawnIndex: 0,
    ...over,
  }
}

function minimalSnapshot(over: Partial<BattleAttemptSnapshot> = {}): BattleAttemptSnapshot {
  return {
    worldPower: 0,
    modKillTargetCardId: null,
    scenarioSlotIndex: 0,
    gold: 0,
    party: [member()],
    ...over,
  }
}

describe('computeCharacterMaxHpForScenario', () => {
  it('matches battleStateFromScenario player maxHp for tutorial', () => {
    const scenario = SCENARIOS[0]!
    const snap = minimalSnapshot()
    const battle = battleStateFromScenario(scenario, snap)
    const player = battle.units.find((u) => u.id === HERO_ID)
    expect(player).toBeDefined()
    expect(computeCharacterMaxHpForScenario(snap.party[0]!, scenario, snap.worldPower)).toBe(
      player!.maxHp,
    )
  })

  it('matches battle player maxHp with gear HP bonus', () => {
    const scenario = SCENARIOS[0]!
    const snap = minimalSnapshot({
      party: [
        member({
          items: [{ id: 'i1', templateId: 'leather_armor', itemLevel: 2, modSlots: [] }],
          equipment: { weapon: null, armor: 'i1', accessory: null },
        }),
      ],
    })
    const battle = battleStateFromScenario(scenario, snap)
    const player = battle.units.find((u) => u.id === HERO_ID)
    expect(
      computeCharacterMaxHpForScenario(snap.party[0]!, scenario, snap.worldPower),
    ).toBe(player!.maxHp)
  })
})
