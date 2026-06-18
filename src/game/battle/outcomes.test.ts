import { describe, expect, it } from 'vitest'
import type { BattlePlayerCard, BattleState, Unit } from '../types'
import { applyAction, WORLD_POWER_PER_ENEMY_KILL } from './reducer'

function unit(partial: Unit): Unit {
  return partial
}

const defaultCard = (id: string): BattlePlayerCard => ({
  id,
  templateId: 't1',
  global_level: 75,
  uses_count: 0,
  modifications: [{ templateId: 'kill_reward', level: 0 }],
  cooldownRemaining: 0,
})

function battle(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    width: 4,
    height: 4,
    walls: [],
    units: [
      unit({
        id: 'hero',
        side: 'player',
        x: 1,
        y: 0,
        hp: 10,
        maxHp: 10,
        unitLevel: 1,
      }),
      unit({
        id: 'e1',
        side: 'enemy',
        x: 2,
        y: 0,
        hp: 1,
        maxHp: 5,
        unitLevel: 1,
      }),
    ],
    turnOrder: ['hero', 'e1'],
    currentTurnIndex: 0,
    phase: 'ongoing',
    worldPower: 0,
    playerCards: [],
    modKillTargetCardId: null,
    battleLog: [],
    gearCardLevelBonus: 0,
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

describe('battle outcomes (kills & defeat)', () => {
  it('enemy death increases worldPower by fixed step', () => {
    const card = defaultCard('c1')
    const s = battle({
      worldPower: 2,
      playerCards: [card],
      modKillTargetCardId: 'c1',
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 2,
      kind: 'melee',
    })
    expect(end.worldPower).toBe(2 + WORLD_POWER_PER_ENEMY_KILL)
  })

  it('enemy death grants mod progression on target card', () => {
    const card = defaultCard('c1')
    const s = battle({
      playerCards: [card],
      modKillTargetCardId: 'c1',
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 2,
      kind: 'melee',
    })
    expect(end.playerCards[0]?.modifications[0]?.level).toBe(1)
  })

  it('hero defeat does not change worldPower', () => {
    const s = battle({
      worldPower: 7,
      units: [
        unit({
          id: 'hero',
          side: 'player',
          x: 1,
          y: 0,
          hp: 1,
          maxHp: 10,
          unitLevel: 1,
        }),
        unit({
          id: 'e1',
          side: 'enemy',
          x: 2,
          y: 0,
          hp: 10,
          maxHp: 10,
          unitLevel: 1,
        }),
      ],
      currentTurnIndex: 1,
      turnOrder: ['hero', 'e1'],
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: 'e1',
      targetId: 'hero',
      damage: 5,
      kind: 'melee',
    })
    expect(end.phase).toBe('defeat')
    expect(end.worldPower).toBe(7)
  })
})
