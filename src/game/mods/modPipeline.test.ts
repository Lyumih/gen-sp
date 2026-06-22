import { describe, expect, it } from 'vitest'
import type { ModSlotState } from '../types'
import {
  applyAoeSizeMods,
  applyCooldownMods,
  applyDamageMods,
  applyHealMods,
  applyRangeMods,
  type ModCombatContext,
} from './modPipeline'

function ctx(
  slots: ModSlotState[],
  tags: readonly string[] = ['attack', 'skill'],
): ModCombatContext {
  return { carrierTags: tags, modSlots: slots, rng: () => 50 }
}

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
