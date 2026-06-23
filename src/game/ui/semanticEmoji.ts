import type { IconAccentId } from '../types'
import { UI_ATTACK, UI_HEAL, UI_HEART, UI_MAGIC } from './labels'

export type SemanticEmoji = {
  id: string
  base: string
  accent: IconAccentId
  labelRu: string
  themeTag?: string
}

const ENTRIES: SemanticEmoji[] = [
  { id: 'heart-heal', base: UI_HEART, accent: 'red', labelRu: 'Исцеление', themeTag: 'heal' },
  { id: 'heart-blue', base: UI_HEART, accent: 'blue', labelRu: 'Регенерация', themeTag: 'regen' },
  { id: 'heart-gold', base: UI_HEART, accent: 'gold', labelRu: 'Святое исцеление', themeTag: 'holy' },
  { id: 'heal-red', base: UI_HEAL, accent: 'red', labelRu: 'Сила исцеления', themeTag: 'heal' },
  { id: 'heal-blue', base: UI_HEAL, accent: 'blue', labelRu: 'Регенерация', themeTag: 'regen' },
  { id: 'drop-green', base: '💧', accent: 'green', labelRu: 'Яд', themeTag: 'poison' },
  { id: 'skull-green', base: '☠️', accent: 'green', labelRu: 'Порча', themeTag: 'dot' },
  { id: 'skull-purple', base: '💀', accent: 'purple', labelRu: 'Душа', themeTag: 'dark' },
  { id: 'shield-gray', base: '🛡️', accent: 'gray', labelRu: 'Защита', themeTag: 'defense' },
  { id: 'shield-gold', base: '🛡️', accent: 'gold', labelRu: 'Святой щит', themeTag: 'holy' },
  { id: 'sword-red', base: UI_ATTACK, accent: 'red', labelRu: 'Физический урон', themeTag: 'attack' },
  { id: 'sword-gold', base: '⚔️', accent: 'gold', labelRu: 'Святой удар', themeTag: 'holy' },
  { id: 'spark-gold', base: '✨', accent: 'gold', labelRu: 'Святая магия', themeTag: 'holy' },
  { id: 'spark-purple', base: UI_MAGIC, accent: 'purple', labelRu: 'Тёмная магия', themeTag: 'dark' },
  { id: 'fire-red', base: '🔥', accent: 'red', labelRu: 'Огненный урон', themeTag: 'magic' },
  { id: 'frost-blue', base: '❄️', accent: 'blue', labelRu: 'Лёд', themeTag: 'magic' },
  { id: 'bow-default', base: '🏹', accent: 'default', labelRu: 'Выстрел' },
  { id: 'bow-teal', base: '🏹', accent: 'teal', labelRu: 'Залп', themeTag: 'mobility' },
  { id: 'trap-gray', base: '🪤', accent: 'gray', labelRu: 'Ловушка', themeTag: 'utility' },
  { id: 'smoke-gray', base: '💨', accent: 'gray', labelRu: 'Дым', themeTag: 'utility' },
  { id: 'horn-gold', base: '📯', accent: 'gold', labelRu: 'Боевой клич', themeTag: 'buff' },
  { id: 'dagger-purple', base: '🗡️', accent: 'purple', labelRu: 'Скрытный удар', themeTag: 'crit' },
  { id: 'orb-purple', base: UI_MAGIC, accent: 'purple', labelRu: 'Магия', themeTag: 'magic' },
  { id: 'orb-blue', base: '🔮', accent: 'blue', labelRu: 'Мана', themeTag: 'magic' },
  { id: 'ring-gold', base: '💍', accent: 'gold', labelRu: 'Кольцо' },
  { id: 'target-teal', base: '🎯', accent: 'teal', labelRu: 'Меткость', themeTag: 'crit' },
  { id: 'target-purple', base: '🎯', accent: 'purple', labelRu: 'Критический удар', themeTag: 'crit' },
  { id: 'robe-purple', base: '🧙', accent: 'purple', labelRu: 'Мантия мага', themeTag: 'magic' },
  { id: 'gi-teal', base: '🥋', accent: 'teal', labelRu: 'Лёгкий доспех', themeTag: 'mobility' },
  { id: 'mask-gray', base: '🎭', accent: 'gray', labelRu: 'Маскировка', themeTag: 'mobility' },
  { id: 'moon-purple', base: '🌑', accent: 'purple', labelRu: 'Мрак', themeTag: 'dark' },
  { id: 'axe-red', base: '🪓', accent: 'red', labelRu: 'Ярость', themeTag: 'attack' },
  { id: 'blood-red', base: '🩸', accent: 'red', labelRu: 'Кровь', themeTag: 'lifesteal' },
  { id: 'vampire-purple', base: '🧛', accent: 'purple', labelRu: 'Вампиризм', themeTag: 'lifesteal' },
]

const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]))

export const SEMANTIC_EMOJI_IDS: readonly string[] = ENTRIES.map((e) => e.id)

export function getSemanticEmoji(id: string): SemanticEmoji | undefined {
  return BY_ID.get(id)
}
