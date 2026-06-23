import { describe, expect, it } from 'vitest'
import type { ItemInstance } from '../types'
import type { ItemTemplate } from '../content/itemTemplates'
import { EMPTY_EQUIPMENT } from './equipmentOrder'
import {
  aggregateGearDamageMult,
  aggregateGearHpMult,
  aggregateGearStrikeDamageMult,
} from './aggregates'

function tmpl(p: Partial<ItemTemplate> & Pick<ItemTemplate, 'id' | 'slot'>): ItemTemplate {
  return {
    shopPrice: 1,
    hpPctPerLevel: 0,
    damagePctPerLevel: 0,
    label: p.id,
    tags: [],
    semanticEmojiId: 'sword-red',
    ...p,
  }
}

describe('gear mult aggregators', () => {
  it('returns 1 for empty equipment', () => {
    const get = (): undefined => undefined
    expect(aggregateGearHpMult([], EMPTY_EQUIPMENT, get)).toBe(1)
    expect(aggregateGearDamageMult([], EMPTY_EQUIPMENT, get)).toBe(1)
    expect(aggregateGearStrikeDamageMult([], EMPTY_EQUIPMENT, get)).toBe(1)
  })

  it('sums pct contributions into mult', () => {
    const items: ItemInstance[] = [
      { id: 'i1', templateId: 't_w', itemLevel: 2, modSlots: [] },
      { id: 'i2', templateId: 't_a', itemLevel: 3, modSlots: [] },
    ]
    const equipment = { ...EMPTY_EQUIPMENT, weapon: 'i1', armor: 'i2' }
    const catalog: Record<string, ItemTemplate> = {
      t_w: tmpl({ id: 't_w', slot: 'weapon', damagePctPerLevel: 5 }),
      t_a: tmpl({ id: 't_a', slot: 'armor', hpPctPerLevel: 4 }),
    }
    const get = (id: string) => catalog[id]
    expect(aggregateGearHpMult(items, equipment, get)).toBe(1 + (4 * 3) / 100)
    expect(aggregateGearDamageMult(items, equipment, get)).toBe(1 + (5 * 2) / 100)
  })

  it('strike damage mult excludes weapon slot', () => {
    const items: ItemInstance[] = [
      { id: 'i1', templateId: 't_w', itemLevel: 10, modSlots: [] },
      { id: 'i2', templateId: 't_r', itemLevel: 10, modSlots: [] },
    ]
    const equipment = { ...EMPTY_EQUIPMENT, weapon: 'i1', accessory: 'i2' }
    const catalog: Record<string, ItemTemplate> = {
      t_w: tmpl({ id: 't_w', slot: 'weapon', damagePctPerLevel: 10 }),
      t_r: tmpl({ id: 't_r', slot: 'accessory', damagePctPerLevel: 2 }),
    }
    const get = (id: string) => catalog[id]
    expect(aggregateGearDamageMult(items, equipment, get)).toBe(1 + (10 * 10 + 2 * 10) / 100)
    expect(aggregateGearStrikeDamageMult(items, equipment, get)).toBe(1 + (2 * 10) / 100)
  })
})
