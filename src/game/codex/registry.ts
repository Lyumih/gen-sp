import { CARD_ATTACK_TEMPLATES } from '../content/cardTemplates'
import { ENEMY_TEMPLATES } from '../content/enemyTemplates'
import { ITEM_TEMPLATES } from '../content/itemTemplates'
import { MOD_TEMPLATES } from '../content/modTemplates'

export type CodexCategory = 'item' | 'card' | 'enemy' | 'mod'

export type CodexEntry = {
  id: string
  category: CodexCategory
  templateId: string
  label: string
  emoji?: string
}

function entryFromTemplate(
  category: CodexCategory,
  templateId: string,
  template: { label: string; emoji?: string },
): CodexEntry {
  return {
    id: codexEntryId(category, templateId),
    category,
    templateId,
    label: template.label || templateId,
    ...(template.emoji !== undefined ? { emoji: template.emoji } : {}),
  }
}

const ALL_CODEX_ENTRIES: readonly CodexEntry[] = [
  ...Object.entries(ITEM_TEMPLATES).map(([templateId, template]) =>
    entryFromTemplate('item', templateId, template),
  ),
  ...Object.entries(CARD_ATTACK_TEMPLATES).map(([templateId, template]) =>
    entryFromTemplate('card', templateId, template),
  ),
  ...Object.entries(ENEMY_TEMPLATES).map(([templateId, template]) =>
    entryFromTemplate('enemy', templateId, template),
  ),
  ...Object.entries(MOD_TEMPLATES).map(([templateId, template]) =>
    entryFromTemplate('mod', templateId, template),
  ),
]

const ENTRIES_BY_ID = new Map(ALL_CODEX_ENTRIES.map((entry) => [entry.id, entry]))

export function codexEntryId(category: CodexCategory, templateId: string): string {
  return `${category}:${templateId}`
}

export function allCodexEntries(): readonly CodexEntry[] {
  return ALL_CODEX_ENTRIES
}

export function codexEntriesByCategory(category: CodexCategory): readonly CodexEntry[] {
  return ALL_CODEX_ENTRIES.filter((entry) => entry.category === category)
}

export function codexEntryById(id: string): CodexEntry | undefined {
  return ENTRIES_BY_ID.get(id)
}
