import type { ModTemplate } from '../content/modTemplates'
import { seededRng } from '../tavern/generateCandidates'
import type { ModOffer } from '../types'

export function filterModsForCarrier(
  pool: readonly ModTemplate[],
  carrierTags: readonly string[],
  occupiedTemplateIds: readonly string[],
): ModTemplate[] {
  const tagSet = new Set(carrierTags)
  const occupied = new Set(occupiedTemplateIds)

  return pool.filter((mod) => {
    if (mod.enabled === false) return false

    const requires = mod.requires ?? []
    if (!requires.every((tag) => tagSet.has(tag))) return false

    const excludes = mod.excludes ?? []
    if (excludes.some((tag) => tagSet.has(tag))) return false

    if (occupied.has(mod.id)) return false

    return true
  })
}

export function generateOffer(
  pool: readonly ModTemplate[],
  carrierTags: readonly string[],
  occupiedTemplateIds: readonly string[],
  _slotIndex: number,
  seed: number,
): ModOffer {
  const eligible = filterModsForCarrier(pool, carrierTags, occupiedTemplateIds)
  const rng = seededRng(seed)

  const pickId = (): string => {
    const idx = Math.floor(rng() * eligible.length)
    return eligible[idx]!.id
  }

  return {
    modIds: [pickId(), pickId(), pickId()],
    rollSeed: seed,
  }
}
