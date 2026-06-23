import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { createCharacter } from '../character/createCharacter'
import { ENEMY_TEMPLATES } from '../content/enemyTemplates'
import { getEnemyArchetype } from '../content/enemyArchetypes'
import { SHIFTING_RESIST_TAGS } from '../battle/enemySpawn'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import type { BattleAttemptSnapshot, PartyMemberBattleSnapshot } from '../types'
import {
  SCENARIOS,
  battleStateFromScenario,
  getBossArchetypeId,
  isBossCampaignSlot,
  makePlayerUnits,
  resolveScenarioEnemies,
  resolveScenarioForCampaignSlot,
  type BattleScenario,
} from './scenarios'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function member(
  over: Partial<PartyMemberBattleSnapshot> & Pick<PartyMemberBattleSnapshot, 'characterId'>,
): PartyMemberBattleSnapshot {
  return {
    unitLevel: 1,
    baseStats: TEST_BASE_STATS,
    items: [],
    equipment: { ...EMPTY_EQUIPMENT },
    cards: [],
    passives: [],
    passiveEquip: [null, null, null, null],
    battleLoadout: ['c1', 'c2', null],
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
  enemySpawns: [
    { kind: 'fixed', archetypeId: 'grunt', x: 5, y: 2, unitLevel: 1 },
  ],
}

const poolScenario: BattleScenario = {
  id: 'pool-test',
  width: 6,
  height: 4,
  walls: [],
  playerSpawns: [{ x: 0, y: 1 }],
  heroBaseHpStat: 20,
  enemySpawns: [
    {
      kind: 'pool',
      poolTags: ['arena', 'melee'],
      count: 3,
      spawnZone: { xMin: 5, xMax: 5, yMin: 0, yMax: 3 },
    },
  ],
}

describe('SCENARIOS enemy archetypes', () => {
  it('every enemy has archetypeId present in enemy templates', () => {
    for (const scenario of SCENARIOS) {
      for (const enemy of resolveScenarioEnemies(scenario, 0, 0)) {
        expect(enemy.archetypeId, `${scenario.id}/${enemy.id}`).toBeTruthy()
        expect(ENEMY_TEMPLATES[enemy.archetypeId], `${scenario.id}/${enemy.id}`).toBeDefined()
      }
    }
  })
})

describe('resolveScenarioEnemies', () => {
  it('pool spawn places count enemies on free cells', () => {
    const enemies = resolveScenarioEnemies(poolScenario, 42, 0)

    expect(enemies).toHaveLength(3)
    expect(enemies.every((e) => e.x === 5)).toBe(true)
    expect(new Set(enemies.map((e) => `${e.x},${e.y}`)).size).toBe(3)
    for (const enemy of enemies) {
      expect(getEnemyArchetype(enemy.archetypeId)?.threatTags).toEqual(
        expect.arrayContaining(['arena', 'melee']),
      )
    }
  })

  it('bossIndex 2 maps to boss_spell_eater', () => {
    const bossScenario: BattleScenario = {
      ...poolScenario,
      isBossScenario: true,
      bossIndex: 2,
      enemySpawns: [{ kind: 'fixed', archetypeId: 'placeholder', x: 4, y: 2, unitLevel: 2 }],
    }

    const enemies = resolveScenarioEnemies(bossScenario, 1, 0)
    expect(enemies).toHaveLength(1)
    expect(enemies[0]!.archetypeId).toBe('boss_spell_eater')
    expect(getBossArchetypeId(2)).toBe('boss_spell_eater')
  })

  it('is deterministic for the same seed', () => {
    const a = resolveScenarioEnemies(poolScenario, 99, 0)
    const b = resolveScenarioEnemies(poolScenario, 99, 0)
    expect(b).toEqual(a)
  })
})

describe('boss campaign schedule', () => {
  it('marks every 4th slot as boss', () => {
    expect(isBossCampaignSlot(2)).toBe(false)
    expect(isBossCampaignSlot(3)).toBe(true)
    expect(isBossCampaignSlot(7)).toBe(true)
  })

  it('slot 3 uses first boss archetype', () => {
    const base: BattleScenario = {
      ...poolScenario,
      enemySpawns: [{ kind: 'pool', poolTags: ['forest'], count: 2 }],
    }
    const resolved = resolveScenarioForCampaignSlot(base, 3)
    expect(resolved.isBossScenario).toBe(true)
    expect(resolved.bossIndex).toBe(1)

    const enemies = resolveScenarioEnemies(resolved, 5, 0)
    expect(enemies[0]!.archetypeId).toBe('boss_iron_colossus')
  })

  it('slot 7 uses second boss archetype', () => {
    const base: BattleScenario = {
      ...poolScenario,
      enemySpawns: [{ kind: 'pool', poolTags: ['forest'], count: 2 }],
    }
    const resolved = resolveScenarioForCampaignSlot(base, 7)
    expect(resolved.bossIndex).toBe(2)

    const enemies = resolveScenarioEnemies(resolved, 5, 0)
    expect(enemies[0]!.archetypeId).toBe('boss_spell_eater')
  })
})

describe('makePlayerUnits', () => {
  it('spawns 2 active party members on unique spawn cells', () => {
    const snap = snapshotWithParty([
      member({ characterId: HERO_ID, spawnIndex: 0 }),
      member({ characterId: 'char-2', spawnIndex: 1, unitLevel: 2 }),
    ])

    const enemies = resolveScenarioEnemies(duoScenario, 99, 0)
    const { units } = makePlayerUnits(snap, duoScenario, enemies, 99)

    expect(units).toHaveLength(2)
    expect(units[0]).toMatchObject({ side: 'player' })
    expect(units[1]).toMatchObject({ side: 'player', unitLevel: 2 })
    const keys = units.map((u) => `${u.x},${u.y}`)
    expect(new Set(keys).size).toBe(2)
    expect(units.every((u) => u.x === 0)).toBe(true)
  })

  it('skips downed party members', () => {
    const snap = snapshotWithParty([
      member({ characterId: HERO_ID, spawnIndex: 0 }),
      member({ characterId: 'char-2', spawnIndex: 1, metaStatus: 'downed' }),
    ])

    const enemies = resolveScenarioEnemies(duoScenario, 0, 0)
    const { units } = makePlayerUnits(snap, duoScenario, enemies)
    expect(units).toHaveLength(1)
    expect(units[0]!.id).toBe(HERO_ID)
  })

  it('excludes overflow heroes when spawn pool is too small', () => {
    const tinyScenario: BattleScenario = {
      ...duoScenario,
      playerSpawns: [{ x: 0, y: 1 }],
    }
    const snap = snapshotWithParty([
      member({ characterId: HERO_ID, spawnIndex: 0 }),
      member({ characterId: 'char-2', spawnIndex: 1 }),
    ])
    const enemies = resolveScenarioEnemies(tinyScenario, 0, 0)
    const { units, excludedCharacterIds } = makePlayerUnits(snap, tinyScenario, enemies)
    expect(units).toHaveLength(1)
    expect(excludedCharacterIds).toHaveLength(1)
  })
})

describe('battleStateFromScenario', () => {
  it('uses character ids in units and turnOrder (no hardcoded hero)', () => {
    const snap = snapshotWithParty([member({ characterId: HERO_ID })])
    const battle = battleStateFromScenario(SCENARIOS[0]!, snap)

    const player = battle.units.find((u) => u.side === 'player')
    expect(player?.id).toBe(HERO_ID)
    expect(battle.turnOrder).toContain(HERO_ID)
    expect(battle.turnOrder).not.toContain('hero')
  })

  it('spawns solo campaign hero at scenario player spawn', () => {
    const hero = createCharacter({
      id: HERO_ID,
      name: 'Hero',
      classId: 'warrior',
      baseStats: TEST_BASE_STATS,
      baseStatRating: 0.5,
    })
    const snap = snapshotWithParty([
      {
        characterId: hero.id,
        unitLevel: hero.unitLevel,
        baseStats: hero.baseStats,
        items: hero.items,
        equipment: { ...hero.equipment },
        cards: hero.cards,
        passives: hero.passives,
        passiveEquip: [...hero.passiveEquip],
        battleLoadout: [...hero.battleLoadout],
        metaStatus: 'active',
        spawnIndex: 0,
      },
    ])

    const battle = battleStateFromScenario(SCENARIOS[0]!, snap, 1)
    const player = battle.units.find((u) => u.id === HERO_ID)
    expect(player?.x).toBe(0)
    expect(player?.y).toBe(2)
  })

  it('enemy units snapshot display fields from template', () => {
    const snap = snapshotWithParty([member({ characterId: HERO_ID })])
    const battle = battleStateFromScenario(SCENARIOS[0]!, snap)
    const enemy = battle.units.find((u) => u.side === 'enemy')
    expect(enemy).toMatchObject({
      displayName: 'Орк-разоритель',
      iconEmoji: '🪓',
      iconAccent: 'default',
    })
  })

  it('instant defeat when all heroes excluded', () => {
    const snap = snapshotWithParty([
      member({ characterId: HERO_ID, spawnIndex: 0 }),
      member({ characterId: 'char-2', spawnIndex: 1 }),
    ])
    const tiny: BattleScenario = {
      ...SCENARIOS[0]!,
      playerSpawns: [],
      playerSpawnCells: [],
      playerSpawnZone: { xMin: 99, xMax: 99, yMin: 0, yMax: 0 },
    }
    const battle = battleStateFromScenario(tiny, snap)
    expect(battle.phase).toBe('defeat')
    expect(battle.units.filter((u) => u.side === 'player')).toHaveLength(0)
  })

  it('wires enemy skills, passives, and raceId from archetype', () => {
    const ravagerScenario: BattleScenario = {
      ...duoScenario,
      enemySpawns: [
        { kind: 'fixed', archetypeId: 'enemy_orc_ravager', x: 5, y: 2, unitLevel: 1 },
      ],
    }
    const snap = snapshotWithParty([member({ characterId: HERO_ID })])
    const battle = battleStateFromScenario(ravagerScenario, snap)

    const enemy = battle.units.find((u) => u.archetypeId === 'enemy_orc_ravager')
    expect(enemy?.raceId).toBe('orc')
    expect(battle.enemyCardsByUnitId?.[enemy!.id]).toHaveLength(3)
    expect(battle.enemyCardsByUnitId?.[enemy!.id]?.map((c) => c.templateId)).toEqual([
      'frenzy',
      'whirlwind',
      'monster_roar',
    ])
    expect(battle.enemyCardsByUnitId?.[enemy!.id]?.every((c) => c.cooldownRemaining === 0)).toBe(true)
  })

  it('resolves chaotic aberration skills and variance from spawn seed', () => {
    const chaoticScenario: BattleScenario = {
      ...duoScenario,
      enemySpawns: [
        { kind: 'fixed', archetypeId: 'enemy_chaos_aberration', x: 5, y: 2, unitLevel: 1 },
      ],
    }
    const snap = snapshotWithParty([member({ characterId: HERO_ID })])
    const battle = battleStateFromScenario(chaoticScenario, snap, 42)

    const enemy = battle.units.find((u) => u.archetypeId === 'enemy_chaos_aberration')
    expect(enemy?.archetypeId).toBe('enemy_chaos_aberration')
    expect(battle.enemyCardsByUnitId?.[enemy!.id]).toHaveLength(2)
    expect(enemy?.baseStats?.health).not.toBe(
      getEnemyArchetype('enemy_chaos_aberration')!.baseStats.health,
    )
  })

  it('shifting shaman spawns with rotating elemental resist status', () => {
    const shamanScenario: BattleScenario = {
      ...duoScenario,
      enemySpawns: [
        { kind: 'fixed', archetypeId: 'enemy_shifting_shaman', x: 5, y: 2, unitLevel: 1 },
      ],
    }
    const snap = snapshotWithParty([member({ characterId: HERO_ID })])
    const battle = battleStateFromScenario(shamanScenario, snap, 7)
    const enemy = battle.units.find((u) => u.archetypeId === 'enemy_shifting_shaman')
    expect(enemy?.statusEffects?.[0]).toMatchObject({
      kind: 'elemental_resist',
      remainingTurns: 3,
    })
    expect(SHIFTING_RESIST_TAGS).toContain(enemy?.statusEffects?.[0]?.sourceTemplateId)
  })
})
