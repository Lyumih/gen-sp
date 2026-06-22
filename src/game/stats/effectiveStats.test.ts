import { describe, expect, it } from 'vitest'
import type { BaseStats } from '../config/baseStats'
import { getItemTemplate } from '../content/itemTemplates'
import { computeCharacterMaxHp, computeEffectiveStat } from './effectiveStats'

const sampleBaseStats: BaseStats = {
  health: 20,
  defense: 2,
  attack: 3,
  magicPower: 1,
  mana: 10,
  healPower: 1,
  speed: 2,
  initiative: 8,
  critChance: 5,
}

describe('computeEffectiveStat', () => {
  it('scales base stat with unitLevel and worldPower', () => {
    expect(computeEffectiveStat(sampleBaseStats, 'health', 1, 0)).toBe(Math.round(20 * 1.02))
  })
})

describe('computeCharacterMaxHp', () => {
  it('uses character base health not scenario heroBaseHpStat', () => {
    const hp = computeCharacterMaxHp(
      {
        baseStats: sampleBaseStats,
        unitLevel: 1,
        items: [],
        equipment: { weapon: null, armor: null, accessory: null },
      },
      0,
      getItemTemplate,
    )
    expect(hp).toBe(Math.round(20 * (1 + 0.02 + 0)))
  })
})
