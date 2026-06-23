import type { CodexCategory, CodexEntry } from '../../game/codex/registry'

export type { CodexCategory }

export const CODEX_CATEGORY_ORDER: CodexCategory[] = [
  'class',
  'item',
  'card',
  'passive',
  'mod',
  'enemy',
]

export const CODEX_CATEGORY_LABEL: Record<CodexCategory, string> = {
  class: 'Классы',
  item: 'Предметы',
  card: 'Умения',
  passive: 'Навыки',
  mod: 'Модификаторы',
  enemy: 'Враги',
}

// TODO(release): сменить default на false перед релизом игры
export const CODEX_SHOW_ALL_DEFAULT = true

export const CODEX_EMPTY_HINT: Record<CodexCategory, string> = {
  class: 'Нанимите героя этого класса в таверне.',
  item: 'Купите или получите предмет в кампании.',
  card: 'Используйте умение в бою.',
  passive: 'Привяжите навык к герою или наймите героя с навыком в таверне.',
  mod: 'Получите очки модификации за убийство врага.',
  enemy: 'Победите врага в бою.',
}

export function filterCodexEntries(
  entries: readonly CodexEntry[],
  searchValue: string,
): readonly CodexEntry[] {
  const query = searchValue.trim().toLocaleLowerCase('ru')
  if (!query) return entries
  return entries.filter((entry) => entry.label.toLocaleLowerCase('ru').includes(query))
}
