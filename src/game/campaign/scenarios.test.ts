import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { createCharacter } from '../character/createCharacter'
import { ENEMY_TEMPLATES } from '../content/enemyTemplates'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import type { BattleAttemptSnapshot, PartyMemberBattleSnapshot } from '../types'
import {
  SCENARIOS,
  battleStateFromScenario,
  makePlayerUnits,
  type BattleScenario,
} from './scenarios'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function member(
  over: Partial<PartyMemberBattleSnapshot> & Pick<PartyMemberBattleSnapshot, 'characterId'>,
): PartyMemberBattleSnapshot {
  return {
    unitLevel: 1,
    items: [],
    equipment: { ...EMPTY_EQUIPMENT },
    cards: [],
    battleLoadout: ['c1', 'c2'],
    metaStatus: 'active',
    spawnIndex: 0,
    ...over,
  }
}

function snapshotWithParty(
  party: PartyMemberBattleSnapshot[],
  over: Partial<BattleAttemptSnapshot> = {},
): BattleAttemptSnapshot {
  return {
    worldPower: 0,
    modKillTargetCardId: null,
    scenarioSlotIndex: 0,
    gold: 0,
    party,
    ...over,
  }
}

const duoScenario: BattleScenario = {
  id: 'duo-test',
  width: 6,
  height: 4,
  walls: [],
  playerSpawns: [
    { x: 0, y: 1 },
    { x: 0, y: 2 },
  ],
  heroBaseHpStat: 20,
  enemies: [{ id: 'e1', x: 5, y: 2, baseHpStat: 8, unitLevel: 1, archetypeId: 'grunt' }],
}

describe('SCENARIOS enemy archetypes', () => {
  it('every enemy has archetypeId present in enemy templates', () => {
    for (const scenario of SCENARIOS) {
      for (const enemy of scenario.enemies) {
        expect(enemy.archetypeId, `${scenario.id}/${enemy.id}`).toBeTruthy()
        expect(ENEMY_TEMPLATES[enemy.archetypeId], `${scenario.id}/${enemy.id}`).toBeDefined()
      }
    }
  })
})

describe('makePlayerUnits', () => {
  it('spawns 2 active party members at playerSpawns[0] and [1]', () => {
    const snap = snapshotWithParty([
      member({ characterId: HERO_ID, spawnIndex: 0 }),
      member({ characterId: 'char-2', spawnIndex: 1, unitLevel: 2 }),
    ])

    const units = makePlayerUnits(snap, duoScenario)

    expect(units).toHaveLength(2)
    expect(units[0]).toMatchObject({ id: HERO_ID, x: 0, y: 1, side: 'player' })
    expect(units[1]).toMatchObject({ id: 'char-2', x: 0, y: 2, side: 'player', unitLevel: 2 })
  })

  it('skips downed party members', () => {
    const snap = snapshotWithParty([
      member({ characterId: HERO_ID, spawnIndex: 0 }),
      member({ characterId: 'char-2', spawnIndex: 1, metaStatus: 'downed' }),
    ])

    const units = makePlayerUnits(snap, duoScenario)
    expect(units).toHaveLength(1)
    expect(units[0]!.id).toBe(HERO_ID)
  })
})

describe('battleStateFromScenario', () => {
  it('uses character ids in units and turnOrder (no hardcoded hero)', () => {
    const snap = snapshotWithParty([member({ characterId: HERO_ID })])
    const battle = battleStateFromScenario(SCENARIOS[0]!, snap)

    const player = battle.units.find((u) => u.side === 'player')
    expect(player?.id).toBe(HERO_ID)
    expect(battle.turnOrder[0]).toBe(HERO_ID)
    expect(battle.turnOrder).not.toContain('hero')
  })

  it('spawns solo campaign hero at scenario player spawn', () => {
    const hero = createCharacter({
      id: HERO_ID,
      name: 'Hero',
      classId: 'warrior',
      initiativeBase: 10,
    })
    const snap = snapshotWithParty([
      {
        characterId: hero.id,
        unitLevel: hero.unitLevel,
        items: hero.items,
        equipment: { ...hero.equipment },
        cards: hero.cards,
        battleLoadout: [...hero.battleLoadout],
        metaStatus: 'active',
        spawnIndex: 0,
      },
    ])

    const battle = battleStateFromScenario(SCENARIOS[0]!, snap)
    const player = battle.units.find((u) => u.id === HERO_ID)
    expect(player).toMatchObject({ x: 0, y: 2 })
  })
})
