import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import type { BaseStats, Unit } from '../types'
import { appendUnitStatus } from './unitStatus'
import { unitCombatMiniStats } from './unitCombatStats'

const MINI_BASE_STATS: BaseStats = {
  health: 10,
  defense: 3,
  attack: 5,
  magicPower: 0,
  mana: 0,
  healPower: 0,
  speed: 0,
  initiative: 0,
  critChance: 0,
}

function unit(partial: Unit): Unit {
  return partial
}

describe('unitCombatMiniStats', () => {
  it('returns null when unit has no baseStats', () => {
    const campaign = initialCampaignState()
    const u = unit({
      id: 'e1',
      side: 'enemy',
      x: 0,
      y: 0,
      hp: 10,
      maxHp: 10,
      unitLevel: 1,
    })
    expect(unitCombatMiniStats(u, campaign, 0)).toBeNull()
  })

  it('includes status flat modifiers on defense', () => {
    const campaign = initialCampaignState()
    let u = unit({
      id: 'e1',
      side: 'enemy',
      x: 0,
      y: 0,
      hp: 10,
      maxHp: 10,
      unitLevel: 0,
      baseStats: MINI_BASE_STATS,
    })
    u = appendUnitStatus(u, {
      id: 'def-up',
      kind: 'defense_up',
      remainingTurns: 2,
      magnitude: 2,
    })

    const stats = unitCombatMiniStats(u, campaign, 0)
    expect(stats).not.toBeNull()
    expect(stats!.attack).toBe(5)
    expect(stats!.defense).toBe(5)
  })
})
