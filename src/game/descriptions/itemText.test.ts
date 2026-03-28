import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '../content/itemTemplates'
import {
  itemInstanceDescriptionLines,
  itemPerLevelBonusesLines,
  itemSelectShortLabel,
  itemShopSummaryLine,
  itemTotalBonusesAtLevel,
} from './itemText'

describe('itemPerLevelBonusesLines', () => {
  it('wooden_sword: only card level', () => {
    const t = ITEM_TEMPLATES.wooden_sword!
    expect(itemPerLevelBonusesLines(t)).toEqual([
      '+1 к ⭐ для 💥 карт за уровень предмета',
    ])
  })

  it('leather_armor: only hp', () => {
    const t = ITEM_TEMPLATES.leather_armor!
    expect(itemPerLevelBonusesLines(t)).toEqual(['+2 к max ❤️ за уровень предмета'])
  })

  it('copper_ring: both', () => {
    const t = ITEM_TEMPLATES.copper_ring!
    expect(itemPerLevelBonusesLines(t)).toEqual([
      '+1 к max ❤️ за уровень предмета',
      '+1 к ⭐ для 💥 карт за уровень предмета',
    ])
  })
})

describe('itemTotalBonusesAtLevel', () => {
  it('leather_armor level 2', () => {
    const t = ITEM_TEMPLATES.leather_armor!
    expect(itemTotalBonusesAtLevel(t, 2)).toEqual({ hp: 4, cardLevel: 0 })
  })

  it('wooden_sword level 2', () => {
    const t = ITEM_TEMPLATES.wooden_sword!
    expect(itemTotalBonusesAtLevel(t, 2)).toEqual({ hp: 0, cardLevel: 2 })
  })
})

describe('itemSelectShortLabel', () => {
  it('includes totals for copper_ring level 1', () => {
    const t = ITEM_TEMPLATES.copper_ring!
    expect(itemSelectShortLabel(t, 1)).toBe('Медное кольцо · ⭐1 · ❤️ +1 · ⭐→💥 +1')
  })
})

describe('itemShopSummaryLine', () => {
  it('includes slot and bonuses', () => {
    const t = ITEM_TEMPLATES.wooden_sword!
    expect(itemShopSummaryLine(t)).toContain('Деревянный меч')
    expect(itemShopSummaryLine(t)).toContain('Оружие')
  })
})

describe('itemInstanceDescriptionLines', () => {
  it('leather_armor level 2 lists totals and per-level', () => {
    const t = ITEM_TEMPLATES.leather_armor!
    const lines = itemInstanceDescriptionLines(t, 2)
    expect(lines.some((l) => l.includes('+4'))).toBe(true)
    expect(lines.some((l) => l.includes('За уровень'))).toBe(true)
  })
})
