import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import type { BattleState, Unit } from '../types'
import {
  applyBossSkillUse,
  isBossSkill,
  modifyHealReceived,
  pickBlinkDestination,
  tryNegateSpellDamage,
  weakenHolyBuffIfNeeded,
} from './bossMechanics'
import { appendUnitStatus } from './unitStatus'
import { applyAction } from './reducer'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function unit(partial: Unit): Unit {
  return partial
}

function battle(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    width: 6,
    height: 4,
    walls: [],
    units: [],
    turnOrder: [],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    battleLog: [],
    gearDamageMult: 1,
    gearStrikeDamageMult: 1,
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

function bossCard(templateId: string, id = 'card-1') {
  return {
    id,
    templateId,
    global_level: 5,
    uses_count: 0,
    modSlots: [],
    cooldownRemaining: 0,
  }
}

describe('isBossSkill', () => {
  it('recognizes boss skill template ids', () => {
    expect(isBossSkill('boss_blink_adjacent')).toBe(true)
    expect(isBossSkill('boss_soul_mark')).toBe(true)
    expect(isBossSkill('fireball')).toBe(false)
  })
})

describe('boss_blink_adjacent', () => {
  it('teleports boss to a free ortho cell adjacent to target', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 3, y: 1, hp: 20, maxHp: 20, unitLevel: 1 }),
        unit({ id: 'boss', side: 'enemy', x: 0, y: 0, hp: 30, maxHp: 30, unitLevel: 1 }),
      ],
      turnOrder: ['boss', HERO_ID],
      currentTurnIndex: 0,
    })
    const dest = pickBlinkDestination(s, HERO_ID, 'boss', () => 0)
    expect(dest).toEqual({ x: 3, y: 0 })

    const next = applyBossSkillUse(s, {
      attackerId: 'boss',
      targetId: HERO_ID,
      card: bossCard('boss_blink_adjacent'),
      effectPower: 1,
      rng: () => 0,
    })
    const boss = next.units.find((u) => u.id === 'boss')!
    expect(Math.abs(boss.x - 3) + Math.abs(boss.y - 1)).toBe(1)
    expect(boss.x).not.toBe(0)
  })
})

describe('boss_soul_mark', () => {
  it('applies soul_mark debuff and reduces healing received by 50%', () => {
    const hero = unit({ id: HERO_ID, side: 'player', x: 1, y: 0, hp: 10, maxHp: 20, unitLevel: 1 })
    const s = battle({
      units: [
        hero,
        unit({ id: 'boss', side: 'enemy', x: 4, y: 0, hp: 30, maxHp: 30, unitLevel: 1 }),
      ],
      turnOrder: ['boss', HERO_ID],
      currentTurnIndex: 0,
    })
    const marked = applyBossSkillUse(s, {
      attackerId: 'boss',
      targetId: HERO_ID,
      card: bossCard('boss_soul_mark'),
      effectPower: 5,
      rng: () => 0,
    })
    const status = marked.units.find((u) => u.id === HERO_ID)?.statusEffects ?? []
    expect(status.some((e) => e.kind === 'soul_mark')).toBe(true)
    expect(modifyHealReceived(10, marked.units.find((u) => u.id === HERO_ID)!)).toBe(5)
  })
})

describe('boss_spell_eater', () => {
  it('grants spell_eaten and negates next magic-tagged damage', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 2, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
        unit({ id: 'boss', side: 'enemy', x: 0, y: 0, hp: 30, maxHp: 30, unitLevel: 1 }),
      ],
      turnOrder: ['boss', HERO_ID],
      currentTurnIndex: 0,
    })
    const buffed = applyBossSkillUse(s, {
      attackerId: 'boss',
      targetId: HERO_ID,
      card: bossCard('boss_spell_eater'),
      effectPower: 1,
      rng: () => 0,
    })
    const boss = buffed.units.find((u) => u.id === 'boss')!
    expect(boss.statusEffects?.some((e) => e.kind === 'spell_eaten')).toBe(true)

    const negated = tryNegateSpellDamage(12, ['magic', 'attack'], boss)
    expect(negated.damage).toBe(0)
    expect(negated.unit.statusEffects?.some((e) => e.kind === 'spell_eaten') ?? false).toBe(false)

    const again = tryNegateSpellDamage(12, ['magic', 'attack'], negated.unit)
    expect(again.damage).toBe(12)
  })

  it('spell_eaten blocks magic damage in reducer strike', () => {
    const s = battle({
      units: [
        unit({
          id: HERO_ID,
          side: 'player',
          x: 2,
          y: 0,
          hp: 20,
          maxHp: 20,
          unitLevel: 1,
          baseStats: {
            health: 20,
            defense: 0,
            attack: 3,
            magicPower: 8,
            mana: 0,
            healPower: 0,
            speed: 2,
            initiative: 5,
            critChance: 2,
          },
        }),
        unit({
          id: 'boss',
          side: 'enemy',
          x: 0,
          y: 0,
          hp: 30,
          maxHp: 30,
          unitLevel: 1,
          statusEffects: [
            {
              id: 'se-1',
              kind: 'spell_eaten',
              remainingTurns: 99,
              magnitude: 1,
              sourceTemplateId: 'boss_spell_eater',
            },
          ],
        }),
      ],
      turnOrder: [HERO_ID, 'boss'],
      currentTurnIndex: 0,
      playerCardsByUnitId: {
        [HERO_ID]: [
          {
            id: 'fb',
            templateId: 'shadow_bolt',
            global_level: 5,
            uses_count: 0,
            modSlots: [],
            cooldownRemaining: 0,
          },
        ],
      },
    })
    const next = applyAction(s, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'boss',
      damage: 15,
      kind: 'ranged',
      maxRange: 4,
      fromCard: { cardId: 'fb', templateId: 'shadow_bolt' },
    })
    expect(next.units.find((u) => u.id === 'boss')!.hp).toBe(30)
  })
})

describe('boss_decay_aura', () => {
  it('weakens holy buff magnitude on debuffed target', () => {
    const hero = appendUnitStatus(
      unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      {
        id: 'da-1',
        kind: 'decay_aura',
        remainingTurns: 2,
        magnitude: 50,
        sourceTemplateId: 'boss_decay_aura',
      },
    )
    const weakened = weakenHolyBuffIfNeeded(
      {
        id: 'hs-1',
        kind: 'damage_reduction',
        remainingTurns: 1,
        magnitude: 40,
        sourceTemplateId: 'divine_shield',
      },
      hero,
    )
    expect(weakened.magnitude).toBe(20)
  })
})
