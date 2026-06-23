import { describe, expect, it } from 'vitest'
import {
  CHARACTERS_SECTION_HELP,
  CHEST_SECTION_HELP,
  EQUIPMENT_SECTION_HELP,
  SKILLS_SECTION_HELP,
} from './sectionTooltips'

describe('sectionTooltips', () => {
  it('exports help text for all character tab sections', () => {
    expect(CHARACTERS_SECTION_HELP).toContain('Отряд')
    expect(EQUIPMENT_SECTION_HELP).toContain('Инвентарь')
    expect(SKILLS_SECTION_HELP).toContain('Коллекция')
    expect(CHEST_SECTION_HELP).toContain('сундук')
  })
})
