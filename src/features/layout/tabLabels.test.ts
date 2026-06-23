import { describe, expect, it } from 'vitest'
import { stashTabLabel, shopTabLabel, stashTabAriaLabel, shopTabAriaLabel } from './tabLabels'

describe('stashTabLabel', () => {
  it('returns full labels on desktop', () => {
    expect(stashTabLabel('items', 0, false)).toBe('Предметы (0)')
    expect(stashTabLabel('cards', 2, false)).toBe('Умения (2)')
    expect(stashTabLabel('passives', 3, false)).toBe('Навыки (3)')
    expect(stashTabLabel('chest', 1, false)).toBe('Сундук (1)')
  })

  it('returns compact labels on narrow viewport', () => {
    expect(stashTabLabel('items', 0, true)).toBe('Предм. (0)')
    expect(stashTabLabel('cards', 2, true)).toBe('Ум. (2)')
    expect(stashTabLabel('passives', 3, true)).toBe('Нав. (3)')
    expect(stashTabLabel('chest', 0, true)).toBe('Сунд. (0)')
  })
})

describe('shopTabLabel', () => {
  it('returns full labels on desktop', () => {
    expect(shopTabLabel('offers', null, false)).toBe('Магазин')
    expect(shopTabLabel('sell', null, false)).toBe('Продажа')
    expect(shopTabLabel('chest', 0, false)).toBe('Сундук (0)')
  })

  it('returns compact labels on narrow viewport', () => {
    expect(shopTabLabel('offers', null, true)).toBe('Маг.')
    expect(shopTabLabel('sell', null, true)).toBe('Прод.')
    expect(shopTabLabel('chest', 2, true)).toBe('Сунд. (2)')
  })
})

describe('aria labels', () => {
  it('always uses full text', () => {
    expect(stashTabAriaLabel('items', 0)).toBe('Предметы (0)')
    expect(shopTabAriaLabel('offers', null)).toBe('Магазин')
    expect(shopTabAriaLabel('chest', 1)).toBe('Сундук (1)')
  })
})
