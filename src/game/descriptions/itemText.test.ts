import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '../content/itemTemplates'
import {
  itemInstanceDescriptionLines,
  itemPerLevelBonusesLines,
  itemPriceLine,
  itemSelectShortLabel,
  itemShopSummaryLine,
  itemTotalBonusesAtLevel,
} from './itemText'

describe('itemPerLevelBonusesLines', () => {
  it('wooden_sword: only damage pct', () => {
    const t = ITEM_TEMPLATES.wooden_sword!
    expect(itemPerLevelBonusesLines(t)).toEqual([
      '+1% к 💥 за уровень предмета',
    ])
  })

  it('leather_armor: only hp', () => {
    const t = ITEM_TEMPLATES.leather_armor!
    expect(itemPerLevelBonusesLines(t)).toEqual(['+2% к max ❤️ за уровень предмета'])
  })

  it('copper_ring: both', () => {
    const t = ITEM_TEMPLATES.copper_ring!
    expect(itemPerLevelBonusesLines(t)).toEqual([
      '+1% к max ❤️ за уровень предмета',
      '+1% к 💥 за уровень предмета',
    ])
  })
})

describe('itemTotalBonusesAtLevel', () => {
  it('leather_armor level 2', () => {
    const t = ITEM_TEMPLATES.leather_armor!
    expect(itemTotalBonusesAtLevel(t, 2)).toEqual({ hpMult: 1.04, damageMult: 1 })
  })

  it('wooden_sword level 2', () => {
    const t = ITEM_TEMPLATES.wooden_sword!
    expect(itemTotalBonusesAtLevel(t, 2)).toEqual({ hpMult: 1, damageMult: 1.02 })
  })
})

describe('itemSelectShortLabel', () => {
  it('includes totals for copper_ring level 1', () => {
    const t = ITEM_TEMPLATES.copper_ring!
    expect(itemSelectShortLabel(t, 1)).toBe('Медное кольцо · ⭐1 · ❤️ ×1.01 · 💥 ×1.01')
  })
})

describe('itemShopSummaryLine', () => {
  it('includes slot and bonuses', () => {
    const t = ITEM_TEMPLATES.wooden_sword!
    expect(itemShopSummaryLine(t)).toContain('Деревянный меч')
    expect(itemShopSummaryLine(t)).toContain('Оружие')
  })
})

describe('itemPriceLine', () => {
  it('formats amount with money emoji', () => {
    expect(itemPriceLine(10)).toBe('10 💰')
    expect(itemPriceLine(7)).toBe('7 💰')
  })
})

describe('itemInstanceDescriptionLines', () => {
  it('leather_armor level 2 lists mult totals without buy/sell lines', () => {
    const t = ITEM_TEMPLATES.leather_armor!
    const lines = itemInstanceDescriptionLines(t, 2)
    expect(lines.some((l) => l.includes('×1.04'))).toBe(true)
    expect(lines.some((l) => l.includes('За уровень'))).toBe(true)
    expect(lines.some((l) => l.includes('Покупка'))).toBe(false)
    expect(lines.some((l) => l.includes('Продажа'))).toBe(false)
    expect(lines.some((l) => l.includes('💰'))).toBe(false)
  })
})
