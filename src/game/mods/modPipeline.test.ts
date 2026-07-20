import { describe, expect, it } from 'vitest'
import type { ItemInstance, ModSlotState } from '../types'
import {
  aggregatePassiveModBonuses,
  applyAoeCenterDamageMods,
  applyAoeSizeMods,
  applyCooldownMods,
  applyDamageMods,
  applyHealMods,
  applyManaCostMods,
  applyRangeMods,
  computeHealSplashAmount,
  computeLifestealHeal,
  computeReflectDamage,
  computeSelfHealOnDamaged,
  computeSelfHealOnUse,
  rollProcExtraHits,
  type ModCombatContext,
} from './modPipeline'

function ctx(
  slots: ModSlotState[],
  tags: readonly string[] = ['attack', 'skill'],
): ModCombatContext {
  return { carrierTags: tags, modSlots: slots, rng: () => 50 }
}

describe('aggregatePassiveModBonuses', () => {
  it('sums carrier_hp_add, defense_add, initiative_add from equipped items', () => {
    const items: ItemInstance[] = [
      {
        id: 'armor',
        templateId: 'leather_armor',
        itemLevel: 1,
        modSlots: [
          { status: 'filled', templateId: 'mod-hp-bonus-armor', lm: 0 },
          { status: 'filled', templateId: 'mod-armor-bonus', lm: 0 },
        ],
      },
      {
        id: 'ring',
        templateId: 'copper_ring',
        itemLevel: 1,
        modSlots: [{ status: 'filled', templateId: 'mod-initiative', lm: 0 }],
      },
    ]
    expect(aggregatePassiveModBonuses(items)).toEqual({
      health: 3,
      defense: 1,
      initiative: 2,
    })
  })

  it('ignores empty mod slots', () => {
    const items: ItemInstance[] = [
      {
        id: 'armor',
        templateId: 'leather_armor',
        itemLevel: 1,
        modSlots: [{ status: 'empty', offer: null }],
      },
    ]
    expect(aggregatePassiveModBonuses(items)).toEqual({
      health: 0,
      defense: 0,
      initiative: 0,
    })
  })
})

describe('applyDamageMods', () => {
  it('applies +50% damage_mult at lm=0 → 1.5×', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-damage-up', lm: 0 }]
    expect(applyDamageMods(10, ctx(slots))).toBe(15)
  })

  it('returns base when no filled slots', () => {
    expect(applyDamageMods(10, ctx([]))).toBe(10)
  })

  it('scales mult with lm', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-damage-up', lm: 100 }]
    // base 0.5 × (1 + 100/100) = 1.0 → 2× damage
    expect(applyDamageMods(10, ctx(slots))).toBe(20)
  })
})

describe('applyHealMods', () => {
  it('applies +50% heal_mult at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-heal-up', lm: 0 }]
    expect(applyHealMods(8, ctx(slots, ['heal', 'skill']))).toBe(12)
  })
})

describe('applyRangeMods', () => {
  it('applies range_add +1 at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-range-up', lm: 0 }]
    expect(applyRangeMods(3, ctx(slots, ['ranged', 'attack', 'skill']))).toBe(4)
  })
})

describe('applyManaCostMods', () => {
  it('mod-mana-save −20% rounds up with ceil', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-mana-save', lm: 0 }]
    const combatCtx: ModCombatContext = { carrierTags: ['skill'], modSlots: slots, rng: () => 50 }
    expect(applyManaCostMods(10, combatCtx)).toBe(8)
    expect(applyManaCostMods(13, combatCtx)).toBe(11)
  })

  it('never goes below 0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-mana-save', lm: 0 }]
    const combatCtx: ModCombatContext = { carrierTags: ['skill'], modSlots: slots, rng: () => 50 }
    expect(applyManaCostMods(1, combatCtx)).toBeGreaterThanOrEqual(0)
  })
})

describe('applyCooldownMods', () => {
  it('applies cooldown_add −1 at lm=0, min 0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-cooldown-down', lm: 0 }]
    expect(applyCooldownMods(2, ctx(slots, ['skill']))).toBe(1)
    expect(applyCooldownMods(1, ctx(slots, ['skill']))).toBe(0)
    expect(applyCooldownMods(0, ctx(slots, ['skill']))).toBe(0)
  })
})

describe('applyAoeSizeMods', () => {
  it('applies aoe_size_add +1 at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-aoe-size', lm: 0 }]
    expect(applyAoeSizeMods(3, ctx(slots, ['aoe', 'ranged', 'attack', 'skill']))).toBe(4)
  })
})

describe('computeSelfHealOnUse', () => {
  it('returns round(5) at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-self-heal-on-use', lm: 0 }]
    expect(computeSelfHealOnUse(ctx(slots, ['skill']))).toBe(5)
  })
})

describe('computeLifestealHeal', () => {
  it('returns 20% of damage at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-lifesteal', lm: 0 }]
    expect(computeLifestealHeal(10, ctx(slots, ['attack']))).toBe(2)
  })
})

describe('rollProcExtraHits', () => {
  it('rolls double and triple strike independently', () => {
    const slots: ModSlotState[] = [
      { status: 'filled', templateId: 'mod-double-strike', lm: 0 },
      { status: 'filled', templateId: 'mod-triple-strike', lm: 0 },
    ]
    let roll = 0
    const rolls = [20, 5]
    const results = rollProcExtraHits({
      carrierTags: ['attack'],
      modSlots: slots,
      rng: () => rolls[roll++] ?? 100,
    })
    expect(results).toEqual([
      { modTemplateId: 'mod-double-strike', label: 'Двойной удар', extraHits: 1 },
      { modTemplateId: 'mod-triple-strike', label: 'Тройной удар', extraHits: 2 },
    ])
  })

  it('skips proc when roll above threshold', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-double-strike', lm: 0 }]
    expect(
      rollProcExtraHits({
        carrierTags: ['attack'],
        modSlots: slots,
        rng: () => 99,
      }),
    ).toEqual([])
  })
})

describe('computeReflectDamage', () => {
  it('returns 3 thorns damage at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-thorns', lm: 0 }]
    expect(computeReflectDamage(ctx(slots, ['armor']))).toBe(3)
  })
})

describe('computeSelfHealOnDamaged', () => {
  it('returns 3 regen at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-heal-on-hit-taken', lm: 0 }]
    expect(computeSelfHealOnDamaged(ctx(slots, ['armor']))).toBe(3)
  })
})

describe('applyAoeCenterDamageMods', () => {
  it('doubles center cell damage at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-aoe-center-bonus', lm: 0 }]
    expect(applyAoeCenterDamageMods(10, true, ctx(slots, ['aoe']))).toBe(20)
    expect(applyAoeCenterDamageMods(10, false, ctx(slots, ['aoe']))).toBe(10)
  })
})

describe('computeHealSplashAmount', () => {
  it('returns 50% of primary heal at lm=0', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-ally-heal-splash', lm: 0 }]
    expect(computeHealSplashAmount(10, ctx(slots, ['heal']))).toBe(5)
  })
})
