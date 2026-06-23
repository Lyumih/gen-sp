import { describe, expect, it } from 'vitest'
import { generateAmbush } from './ambush'
import { battleStateFromScenario, enemySpawnCount } from '../../campaign/scenarios'
import { TEST_BASE_STATS } from '../../stats/testFixtures'
import type { BattleAttemptSnapshot, PartyMemberBattleSnapshot } from '../../types'

const CENTER_ZONE = { xMin: 3, xMax: 6, yMin: 3, yMax: 6 }
const FIELD_SIZE = 10

function inCenter(x: number, y: number): boolean {
  return (
    x >= CENTER_ZONE.xMin &&
    x <= CENTER_ZONE.xMax &&
    y >= CENTER_ZONE.yMin &&
    y <= CENTER_ZONE.yMax
  )
}

function onPerimeter(x: number, y: number, size = FIELD_SIZE): boolean {
  return x === 0 || x === size - 1 || y === 0 || y === size - 1
}

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

function ambushSnapshot(party: PartyMemberBattleSnapshot[]): BattleAttemptSnapshot {
  return { worldPower: 0, scenarioSlotIndex: -1, gold: 0, party }
}

describe('generateAmbush', () => {
  it('is 10x10 with up to 8 enemies', () => {
    const s = generateAmbush({ seed: 99, battleIndex: 0, expeditionPartySize: 4 })
    expect(s.width).toBe(10)
    expect(s.height).toBe(10)
    expect(enemySpawnCount(s)).toBeLessThanOrEqual(8)
    expect(s.playerSpawnZone).toEqual(CENTER_ZONE)
  })

  it('places heroes in center and enemies on perimeter', () => {
    for (let seed = 0; seed < 50; seed++) {
      const scenario = generateAmbush({ seed, battleIndex: 0, expeditionPartySize: 4 })
      const party = [
        partyMember('h1', 0),
        partyMember('h2', 1),
        partyMember('h3', 2),
        partyMember('h4', 3),
      ]
      const battle = battleStateFromScenario(scenario, ambushSnapshot(party), seed)

      const players = battle.units.filter((u) => u.side === 'player')
      const enemies = battle.units.filter((u) => u.side === 'enemy')

      expect(players.length).toBe(4)
      for (const p of players) {
        expect(inCenter(p.x, p.y)).toBe(true)
      }
      for (const e of enemies) {
        expect(onPerimeter(e.x, e.y)).toBe(true)
        expect(inCenter(e.x, e.y)).toBe(false)
      }

      const occupied = new Set(battle.units.map((u) => `${u.x},${u.y}`))
      expect(occupied.size).toBe(battle.units.length)
    }
  })
})
