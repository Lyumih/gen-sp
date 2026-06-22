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

export function parseDragId(id: string): { kind: string; value: string } | null {
  const idx = id.indexOf(':')
  if (idx < 0) return null
  return { kind: id.slice(0, idx), value: id.slice(idx + 1) }
}
