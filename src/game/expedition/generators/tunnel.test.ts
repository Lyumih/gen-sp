import { describe, expect, it } from 'vitest'
import {
  battleStateFromScenario,
  makePlayerUnits,
  resolveScenarioEnemies,
} from '../../campaign/scenarios'
import { BOSS_ARCHETYPE_IDS } from '../../campaign/scenarios'
import { HERO_ARCHETYPE_IDS } from '../../content/enemyArchetypes'
import { TEST_BASE_STATS } from '../../stats/testFixtures'
import type { BattleAttemptSnapshot, PartyMemberBattleSnapshot } from '../../types'
import { generateTunnel } from './tunnel'

function partyMember(characterId: string, spawnIndex: number): PartyMemberBattleSnapshot {
  return {
    characterId,
    unitLevel: 1,
    baseStats: TEST_BASE_STATS,
    items: [],
    equipment: { weapon: null, armor: null, accessory: null },
    cards: [],
    passives: [],
    passiveEquip: [null, null, null, null, null],
    battleLoadout: ['c1', 'c2', null, null],
    metaStatus: 'active',
    spawnIndex,
  }
}

function tunnelSnapshot(party: PartyMemberBattleSnapshot[]): BattleAttemptSnapshot {
  return {
    worldPower: 0,
    scenarioSlotIndex: -1,
    gold: 0,
    party,
  }
}

describe('generateTunnel', () => {
  it('battle 0 uses melee pool, battle 1 uses hero or boss', () => {
    const b0 = generateTunnel({ seed: 1, battleIndex: 0, expeditionPartySize: 2 })
    const b1 = generateTunnel({ seed: 1, battleIndex: 1, expeditionPartySize: 2 })
    expect(b0.width).toBe(10)
    expect(b0.height).toBe(2)
    expect(b0.playerSpawnZone).toEqual({ xMin: 0, xMax: 0, yMin: 0, yMax: 1 })
    expect(b1.enemySpawns).toHaveLength(1)
    const archId =
      b1.enemySpawns[0]?.kind === 'fixed' ? b1.enemySpawns[0].archetypeId : ''
    const allowed = new Set<string>([...HERO_ARCHETYPE_IDS, ...BOSS_ARCHETYPE_IDS])
    expect(allowed.has(archId)).toBe(true)
  })

  it('spawns two heroes when expedition party size is 2', () => {
    const scenario = generateTunnel({ seed: 42, battleIndex: 0, expeditionPartySize: 2 })
    const party = [partyMember('hero-a', 0), partyMember('hero-b', 1)]
    const enemies = resolveScenarioEnemies(scenario, 99, -1)
    const { units, excludedCharacterIds } = makePlayerUnits(
      tunnelSnapshot(party),
      scenario,
      enemies,
      99,
    )
    expect(units).toHaveLength(2)
    expect(excludedCharacterIds).toEqual([])
    expect(new Set(units.map((u) => `${u.x},${u.y}`)).size).toBe(2)

    const battle = battleStateFromScenario(scenario, tunnelSnapshot(party), 99)
    expect(battle.units.filter((u) => u.side === 'player')).toHaveLength(2)
  })

  it('uses height 1 when expedition party size is 1', () => {
    const scenario = generateTunnel({ seed: 7, battleIndex: 0, expeditionPartySize: 1 })
    expect(scenario.height).toBe(1)
    expect(scenario.playerSpawnZone).toEqual({ xMin: 0, xMax: 0, yMin: 0, yMax: 0 })
  })
})
