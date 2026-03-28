import { describe, expect, it } from 'vitest'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import type { BattleAttemptSnapshot } from '../types'
import { computeHeroMaxHpForScenario } from './heroMaxHp'
import { SCENARIOS, battleStateFromScenario } from './scenarios'

function minimalSnapshot(over: Partial<BattleAttemptSnapshot> = {}): BattleAttemptSnapshot {
  return {
    worldPower: 0,
    cards: [],
    playerUnitLevel: 1,
    modKillTargetCardId: null,
    scenarioSlotIndex: 0,
    gold: 0,
    items: [],
    equipment: { ...EMPTY_EQUIPMENT },
    ...over,
  }
}

describe('computeHeroMaxHpForScenario', () => {
  it('matches battleStateFromScenario hero maxHp for tutorial', () => {
    const scenario = SCENARIOS[0]!
    const snap = minimalSnapshot()
    const battle = battleStateFromScenario(scenario, snap)
    const hero = battle.units.find((u) => u.id === 'hero')
    expect(hero).toBeDefined()
    expect(computeHeroMaxHpForScenario(snap, scenario)).toBe(hero!.maxHp)
  })

  it('matches battle hero maxHp with gear HP bonus', () => {
    const scenario = SCENARIOS[0]!
    const snap = minimalSnapshot({
      items: [{ id: 'i1', templateId: 'leather_armor', itemLevel: 2 }],
      equipment: { weapon: null, armor: 'i1', accessory: null },
    })
    const battle = battleStateFromScenario(scenario, snap)
    const hero = battle.units.find((u) => u.id === 'hero')
    expect(computeHeroMaxHpForScenario(snap, scenario)).toBe(hero!.maxHp)
  })
})
