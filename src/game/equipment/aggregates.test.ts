import { describe, expect, it } from 'vitest'
import type { ItemInstance } from '../types'
import type { ItemTemplate } from '../content/itemTemplates'
import { EMPTY_EQUIPMENT } from './equipmentOrder'
import { aggregateGearCardLevelBonus, aggregateGearHpBonus } from './aggregates'

function tmpl(p: Partial<ItemTemplate> & Pick<ItemTemplate, 'id' | 'slot'>): ItemTemplate {
  return {
    shopPrice: 1,
    hpBonusPerItemLevel: 0,
    cardLevelBonusPerItemLevel: 0,
    label: p.id,
    ...p,
  }
}

describe('aggregateGearHpBonus / aggregateGearCardLevelBonus', () => {
  it('returns 0 for empty equipment', () => {
    const get = (): undefined => undefined
    expect(aggregateGearHpBonus([], EMPTY_EQUIPMENT, get)).toBe(0)
    expect(aggregateGearCardLevelBonus([], EMPTY_EQUIPMENT, get)).toBe(0)
  })

  it('sums bonuses for two equipped items by template and level', () => {
    const items: ItemInstance[] = [
      { id: 'i1', templateId: 't_w', itemLevel: 2 },
      { id: 'i2', templateId: 't_a', itemLevel: 3 },
    ]
    const equipment = { ...EMPTY_EQUIPMENT, weapon: 'i1', armor: 'i2' }
    const catalog: Record<string, ItemTemplate> = {
      t_w: tmpl({
        id: 't_w',
        slot: 'weapon',
        hpBonusPerItemLevel: 0,
        cardLevelBonusPerItemLevel: 5,
      }),
      t_a: tmpl({
        id: 't_a',
        slot: 'armor',
        hpBonusPerItemLevel: 4,
        cardLevelBonusPerItemLevel: 0,
      }),
    }
    const get = (id: string) => catalog[id]
    expect(aggregateGearHpBonus(items, equipment, get)).toBe(4 * 3)
    expect(aggregateGearCardLevelBonus(items, equipment, get)).toBe(5 * 2)
  })
})
