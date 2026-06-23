import { describe, expect, it } from 'vitest'
import {
  CHARACTERS_SECTION_HELP,
  CHEST_SECTION_HELP,
  EQUIPMENT_SECTION_HELP,
  SHOP_OFFERS_SECTION_HELP,
  SHOP_RAIL_SECTION_HELP,
  SHOP_SELL_SECTION_HELP,
  SKILLS_SECTION_HELP,
  SQUAD_SECTION_HELP,
} from './sectionTooltips'

describe('sectionTooltips', () => {
  it('exports help text for all character tab sections', () => {
    expect(CHARACTERS_SECTION_HELP).toContain('Бой')
    expect(SQUAD_SECTION_HELP).toContain('отряд')
    expect(EQUIPMENT_SECTION_HELP).toContain('Предметы')
    expect(SKILLS_SECTION_HELP).toContain('Умения')
    expect(CHEST_SECTION_HELP).toContain('сундук')
  })

  it('exports shop section help', () => {
    expect(SHOP_RAIL_SECTION_HELP).toContain('героя')
    expect(SHOP_OFFERS_SECTION_HELP).toContain('золото')
    expect(SHOP_SELL_SECTION_HELP).toContain('Быстрая продажа')
  })
})
