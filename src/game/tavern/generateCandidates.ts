import { getCharacterClass, CHARACTER_CLASS_IDS } from '../content/characterClasses'
import type { BaseStats } from '../config/baseStats'
import { computeBaseStatRating } from '../stats/computeRating'
import { rollBaseStatsForClass } from '../stats/rollBaseStats'
import { EQUIPMENT_ROLL_ORDER } from '../equipment/equipmentOrder'
import type { EquipmentSlot } from '../types'

export const TAVERN_REFRESH_COST = 15
export const TAVERN_CANDIDATE_COUNT = 3

export type TavernCandidate = {
  candidateId: string
  classId: string
  price: number
  previewGear: Partial<Record<EquipmentSlot, string>>
  baseStats: BaseStats
  baseStatRating: number
}

function weightedPick<T extends { weight: number }>(
  items: readonly T[],
  rng: () => number,
): T | undefined {
  if (items.length === 0) return undefined
  const total = items.reduce((sum, i) => sum + i.weight, 0)
  if (total <= 0) return items[0]
  let roll = rng() * total
  for (const item of items) {
    roll -= item.weight
    if (roll < 0) return item
  }
  return items[items.length - 1]
}

function rollGearForClass(
  classId: string,
  rng: () => number,
): Partial<Record<EquipmentSlot, string>> {
  const cls = getCharacterClass(classId)
  if (!cls) return {}
  const preview: Partial<Record<EquipmentSlot, string>> = {}
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    const pool = cls.gearPool.filter((g) => g.slot === slot)
    const picked = weightedPick(pool, rng)
    if (picked) preview[slot] = picked.templateId
  }
  return preview
}

function newCandidateId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID()
  }
  return `cand-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function generateTavernCandidates(
  rng: () => number,
  count: number = TAVERN_CANDIDATE_COUNT,
): TavernCandidate[] {
  const out: TavernCandidate[] = []
  for (let i = 0; i < count; i++) {
    const classIdx = Math.floor(rng() * CHARACTER_CLASS_IDS.length)
    const classId = CHARACTER_CLASS_IDS[classIdx]!
    const cls = getCharacterClass(classId)
    if (!cls) continue
    const baseStats = rollBaseStatsForClass(classId, rng)
    out.push({
      candidateId: newCandidateId(),
      classId,
      price: cls.hirePrice,
      previewGear: rollGearForClass(classId, rng),
      baseStats,
      baseStatRating: computeBaseStatRating(baseStats),
    })
  }
  return out
}

export function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}
