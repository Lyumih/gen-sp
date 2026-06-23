import type { CardInstance } from '../types'

let cardSeq = 0

export function newCardId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }
  cardSeq += 1
  return `card-${Date.now()}-${cardSeq}`
}

export function createCardInstance(templateId: string, id?: string): CardInstance {
  return {
    id: id ?? newCardId(),
    templateId,
    global_level: 1,
    uses_count: 0,
    modSlots: [],
  }
}

export function createStrikeCardForHero(heroId: string): CardInstance {
  return createCardInstance('strike', `c-${heroId}-strike`)
}
