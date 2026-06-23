export type TagGroup = 'carrier' | 'theme'

export type TagDefinition = {
  id: string
  labelRu: string
  group: TagGroup
}

const TAG_DEFINITIONS: readonly TagDefinition[] = [
  // carrier
  { id: 'skill', labelRu: 'Умение', group: 'carrier' },
  { id: 'attack', labelRu: 'Атака', group: 'carrier' },
  { id: 'melee', labelRu: 'Ближний бой', group: 'carrier' },
  { id: 'ranged', labelRu: 'Дальний бой', group: 'carrier' },
  { id: 'aoe', labelRu: 'Область', group: 'carrier' },
  { id: 'heal', labelRu: 'Исцеление', group: 'carrier' },
  { id: 'weapon', labelRu: 'Оружие', group: 'carrier' },
  { id: 'armor', labelRu: 'Броня', group: 'carrier' },
  { id: 'accessory', labelRu: 'Аксессуар', group: 'carrier' },
  { id: 'regen', labelRu: 'Регенерация', group: 'carrier' },
  { id: 'resurrect', labelRu: 'Воскрешение', group: 'carrier' },
  { id: 'dot', labelRu: 'Урон со временем', group: 'carrier' },
  { id: 'buff', labelRu: 'Бафф', group: 'carrier' },
  { id: 'debuff', labelRu: 'Дебафф', group: 'carrier' },
  // theme
  { id: 'magic', labelRu: 'Магия', group: 'theme' },
  { id: 'holy', labelRu: 'Святость', group: 'theme' },
  { id: 'dark', labelRu: 'Тьма', group: 'theme' },
  { id: 'poison', labelRu: 'Яд', group: 'theme' },
  { id: 'support', labelRu: 'Поддержка', group: 'theme' },
  { id: 'mobility', labelRu: 'Мобильность', group: 'theme' },
  { id: 'crit', labelRu: 'Крит', group: 'theme' },
  { id: 'tank', labelRu: 'Танк', group: 'theme' },
  { id: 'defense', labelRu: 'Защита', group: 'theme' },
  { id: 'lifesteal', labelRu: 'Вампиризм', group: 'theme' },
  { id: 'utility', labelRu: 'Утилита', group: 'theme' },
]

const BY_ID = new Map(TAG_DEFINITIONS.map((t) => [t.id, t]))

export function tagLabelRu(tagId: string): string {
  return BY_ID.get(tagId)?.labelRu ?? tagId
}

export function tagGroup(tagId: string): TagGroup {
  return BY_ID.get(tagId)?.group ?? 'theme'
}

export function allTagIds(): readonly string[] {
  return TAG_DEFINITIONS.map((t) => t.id)
}
