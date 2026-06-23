export function stashDragId(itemId: string): string {
  return `stash:${itemId}`
}

export function slotDragId(slot: string): string {
  return `slot:${slot}`
}

export function shopDragId(templateId: string): string {
  return `shop:${templateId}`
}

export function cardDragId(cardId: string): string {
  return `card:${cardId}`
}

export function stashEmptyDragId(index: number): string {
  return `stash-empty:${index}`
}

export function loadoutDragId(slotIndex: number): string {
  return `loadout:${slotIndex}`
}

export function rosterCharacterDragId(characterId: string): string {
  return `roster-drag:${characterId}`
}

export function rosterCharacterDropId(characterId: string): string {
  return `roster-drop:${characterId}`
}

export function squadSlotDragId(slotIndex: number): string {
  return `squad-slot:${slotIndex}`
}

export function chestItemDragId(itemId: string): string {
  return `chest-item:${itemId}`
}

export function chestCardDragId(cardId: string): string {
  return `chest-card:${cardId}`
}

export function chestDropDragId(): string {
  return 'chest-drop:main'
}

const COMPOUND_PREFIXES = [
  'roster-drag:',
  'roster-drop:',
  'squad-slot:',
  'stash-empty:',
  'chest-item:',
  'chest-card:',
  'chest-drop:',
] as const

export function parseDragId(id: string): { kind: string; value: string } | null {
  for (const prefix of COMPOUND_PREFIXES) {
    if (id.startsWith(prefix)) {
      return { kind: prefix.slice(0, -1), value: id.slice(prefix.length) }
    }
  }
  const idx = id.indexOf(':')
  if (idx < 0) return null
  return { kind: id.slice(0, idx), value: id.slice(idx + 1) }
}

export type SquadDragResolution =
  | { type: 'set'; slotIndex: number; characterId: string }
  | { type: 'swap'; from: number; to: number }

/** Резерв → слот, пустой слот, или swap двух бойцов отряда. */
export function resolveSquadDragDrop(
  squad: readonly (string | null)[],
  characterId: string,
  targetSlotIndex: number,
): SquadDragResolution {
  const fromSlotIndex = squad.indexOf(characterId)
  const occupant = squad[targetSlotIndex] ?? null
  if (
    fromSlotIndex >= 0 &&
    occupant !== null &&
    occupant !== characterId &&
    fromSlotIndex !== targetSlotIndex
  ) {
    return { type: 'swap', from: fromSlotIndex, to: targetSlotIndex }
  }
  return { type: 'set', slotIndex: targetSlotIndex, characterId }
}
