import type { PassiveInstance } from '../types'

let passiveSeq = 0

export function newPassiveId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }
  passiveSeq += 1
  return `passive-${Date.now()}-${passiveSeq}`
}

export function createPassiveInstance(templateId: string, id?: string): PassiveInstance {
  return {
    id: id ?? newPassiveId(),
    templateId,
    global_level: 1,
    uses_count: 0,
    modSlots: [],
  }
}
