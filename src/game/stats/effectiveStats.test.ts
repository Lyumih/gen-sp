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
    expect(computeEffectiveStat(sampleBaseStats, 'health', 1, 0)).toBe(Math.round(20 * 1.01))
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
    expect(hp).toBe(Math.round(20 * (1 + 0.01 + 0)))
  })

  it('adds mod-hp-bonus-armor carrier_hp_add when armor has filled mod', () => {
    const scaledBase = Math.round(20 * (1 + 0.01 + 0))
    const gearMult = 1 + (2 * 1) / 100
    const modHp = 3
    const hp = computeCharacterMaxHp(
      {
        baseStats: sampleBaseStats,
        unitLevel: 1,
        items: [
          {
            id: 'i1',
            templateId: 'leather_armor',
            itemLevel: 1,
            modSlots: [{ status: 'filled', templateId: 'mod-hp-bonus-armor', lm: 0 }],
          },
        ],
        equipment: { weapon: null, armor: 'i1', accessory: null },
      },
      0,
      getItemTemplate,
    )
    expect(hp).toBe(Math.round(scaledBase * gearMult) + modHp)
  })
})
