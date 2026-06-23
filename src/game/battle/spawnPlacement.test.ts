import { describe, expect, it } from 'vitest'
import { cellKey } from './grid'
import { assignPlayerSpawnPositions, collectSpawnCellPool } from './spawnPlacement'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import type { BattleScenario } from '../campaign/scenarios'
import type { PartyMemberBattleSnapshot } from '../types'

const scenario: BattleScenario = {
  id: 'test',
  width: 4,
  height: 3,
  walls: [cellKey(0, 1)],
  playerSpawns: [],
  playerSpawnZone: { xMin: 0, xMax: 0, yMin: 0, yMax: 2 },
  heroBaseHpStat: 20,
  enemySpawns: [{ kind: 'fixed', archetypeId: 'grunt', x: 3, y: 1, unitLevel: 1 }],
}

function member(id: string, spawnIndex: number): PartyMemberBattleSnapshot {
  return {
    characterId: id,
    unitLevel: 1,
    baseStats: TEST_BASE_STATS,
    items: [],
    equipment: { ...EMPTY_EQUIPMENT },
    cards: [],
    passives: [],
    passiveEquip: [null, null, null, null, null],
    battleLoadout: [null, null, null, null],
    metaStatus: 'active',
    spawnIndex,
  }
}

describe('assignPlayerSpawnPositions', () => {
  it('assigns unique cells in zone excluding walls and enemies', () => {
    const enemyOccupied = new Set([cellKey(3, 1)])
    const pool = collectSpawnCellPool(scenario, enemyOccupied)
    expect(pool.map((c) => cellKey(c.x, c.y))).not.toContain(cellKey(0, 1))
    expect(pool.map((c) => cellKey(c.x, c.y))).not.toContain(cellKey(3, 1))

    const { placements, excludedCharacterIds } = assignPlayerSpawnPositions({
      scenario,
      activeMembers: [member('a', 0), member('b', 1), member('c', 2)],
      enemyOccupied,
      seed: 42,
    })
    expect(excludedCharacterIds).toEqual(['c'])
    expect(placements.size).toBe(2)
    const coords = [...placements.values()]
    expect(new Set(coords.map((c) => cellKey(c.x, c.y))).size).toBe(2)
  })

  it('is deterministic for same seed', () => {
    const enemyOccupied = new Set<string>()
    const input = {
      scenario,
      activeMembers: [member('a', 0), member('b', 1)],
      enemyOccupied,
      seed: 7,
    }
    expect(assignPlayerSpawnPositions(input)).toEqual(assignPlayerSpawnPositions(input))
  })
})
