import type { BaseStats, ClassId } from '../config/baseStats'
import { BASE_STAT_IDS } from '../config/baseStats'
import { CHARACTER_CLASS_IDS } from '../content/characterClasses'
import type {
  EnemyArchetype,
  EnemyPassivePreset,
  EnemySkillPreset,
  EnemySkillPriority,
} from '../content/enemyArchetypes'
import { ENEMY_ARCHETYPE_IDS, getEnemyArchetype } from '../content/enemyArchetypes'
import { hashSeed } from '../stats/rollBaseStats'
import { ENEMY_PASSIVE_TEMPLATE_IDS } from '../content/enemyPassiveTemplates'
import type { RaceId } from '../content/enemyRaces'
import {
  createShiftingResistStatus,
  SHIFTING_RESIST_TAGS,
} from './elementalResist'

export { SHIFTING_RESIST_TAGS, type ShiftingResistTag } from './elementalResist'
export { rotateShiftingResistTag } from './elementalResist'

export type ChaoticArchetypeResolution = {
  classId?: ClassId
  raceId?: RaceId
  baseStats: BaseStats
  skillPresets: readonly EnemySkillPreset[]
  passivePresets: readonly EnemyPassivePreset[]
  skillPriorities: readonly EnemySkillPriority[]
  statusEffects?: readonly import('./unitStatus').UnitStatusEffect[]
}

const VARIANCE_MIN = 0.5
const VARIANCE_RANGE = 1

const ALL_RACE_IDS: readonly RaceId[] = [
  'beast',
  'undead',
  'human',
  'orc',
  'elf',
  'specter',
  'construct',
  'demon',
]

const WANDERER_PASSIVE_IDS = ENEMY_PASSIVE_TEMPLATE_IDS.filter((id) => id.startsWith('enemy_'))

function rollUniformVarianceMult(rng: () => number): number {
  return VARIANCE_MIN + rng() * VARIANCE_RANGE
}

export function rollVarianceMult(
  rng: () => number,
  chaotic: boolean,
  statCount: number,
): number | number[] {
  if (chaotic) {
    return Array.from({ length: statCount }, () => rollUniformVarianceMult(rng))
  }
  return rollUniformVarianceMult(rng)
}

export function applyVarianceToBaseStats(
  base: BaseStats,
  variance: number | readonly number[],
): BaseStats {
  const out = {} as BaseStats
  if (typeof variance === 'number') {
    for (const id of BASE_STAT_IDS) {
      out[id] = Math.round(base[id] * variance)
    }
    return out
  }
  BASE_STAT_IDS.forEach((id, i) => {
    out[id] = Math.round(base[id] * (variance[i] ?? 1))
  })
  return out
}

function archetypeMatchesPool(threatTags: readonly string[], poolTags: readonly string[]): boolean {
  return poolTags.every((tag) => threatTags.includes(tag))
}

function eligibleArchetypesForPool(poolTags: readonly string[]): readonly string[] {
  return ENEMY_ARCHETYPE_IDS.filter((id) => {
    const archetype = getEnemyArchetype(id)
    if (!archetype || archetype.spawnWeight <= 0 || archetype.isBoss) return false
    return archetypeMatchesPool(archetype.threatTags, poolTags)
  })
}

function pickWeightedArchetype(candidates: readonly string[], rng: () => number): string | undefined {
  let totalWeight = 0
  for (const id of candidates) {
    totalWeight += getEnemyArchetype(id)?.spawnWeight ?? 0
  }
  if (totalWeight <= 0) return undefined

  let roll = rng() * totalWeight
  for (const id of candidates) {
    const weight = getEnemyArchetype(id)?.spawnWeight ?? 0
    roll -= weight
    if (roll < 0) return id
  }
  return candidates[candidates.length - 1]
}

export function pickEnemyArchetypesFromPool(
  poolTags: readonly string[],
  count: number,
  rng: () => number,
): string[] {
  const candidates = eligibleArchetypesForPool(poolTags)
  if (candidates.length === 0 || count <= 0) return []

  const picks: string[] = []
  for (let i = 0; i < count; i++) {
    const id = pickWeightedArchetype(candidates, rng)
    if (id) picks.push(id)
  }
  return picks
}

function pickFromArray<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!
}

function pickUniqueSubset<T>(
  items: readonly T[],
  count: number,
  rng: () => number,
  key: (item: T) => string,
): T[] {
  const pool = [...items]
  const picks: T[] = []
  const seen = new Set<string>()
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length)
    const choice = pool[idx]!
    const k = key(choice)
    if (seen.has(k)) {
      pool.splice(idx, 1)
      i -= 1
      continue
    }
    seen.add(k)
    picks.push(choice)
    pool.splice(idx, 1)
  }
  return picks
}

function poolTagsForSkills(threatTags: readonly string[]): readonly string[] {
  return threatTags.filter((tag) => tag !== 'chaotic' && tag !== 'boss')
}

function collectSkillsFromThreatPool(threatTags: readonly string[]): EnemySkillPreset[] {
  const poolTags = poolTagsForSkills(threatTags)
  const byTemplate = new Map<string, EnemySkillPreset>()
  for (const id of ENEMY_ARCHETYPE_IDS) {
    const archetype = getEnemyArchetype(id)
    if (!archetype || archetype.isBoss || archetype.isChaotic) continue
    if (!poolTags.some((tag) => archetype.threatTags.includes(tag))) continue
    for (const preset of archetype.skillPresets) {
      byTemplate.set(preset.templateId, preset)
    }
  }
  return [...byTemplate.values()]
}

function skillPrioritiesFromPresets(presets: readonly EnemySkillPreset[]): EnemySkillPriority[] {
  return presets.map((preset, i) => ({
    skillId: preset.templateId,
    baseScore: Math.max(1, 6 - i),
  }))
}

function passivePresetFromTemplate(templateId: string, global_level: number): EnemyPassivePreset {
  return { templateId, global_level, modSlots: [] }
}

function resolveChaosAberration(
  archetype: EnemyArchetype,
  rng: () => number,
): ChaoticArchetypeResolution {
  const classId = pickFromArray(CHARACTER_CLASS_IDS, rng) as ClassId
  const skillPool = collectSkillsFromThreatPool(archetype.threatTags)
  const skillPresets = pickUniqueSubset(skillPool, 2, rng, (s) => s.templateId)
  const variance = rollVarianceMult(rng, true, BASE_STAT_IDS.length) as number[]
  const baseStats = applyVarianceToBaseStats(archetype.baseStats, variance)
  return {
    classId,
    raceId: archetype.raceId,
    baseStats,
    skillPresets,
    passivePresets: [],
    skillPriorities: skillPrioritiesFromPresets(skillPresets),
  }
}

function resolveMutantWanderer(
  archetype: EnemyArchetype,
  rng: () => number,
): ChaoticArchetypeResolution {
  const raceId = pickFromArray(ALL_RACE_IDS, rng)
  const skillPool = collectSkillsFromThreatPool(archetype.threatTags)
  const skillPresets = pickUniqueSubset(skillPool, 3, rng, (s) => s.templateId)
  const includePassive = rng() < 0.5
  const passivePresets = includePassive
    ? [passivePresetFromTemplate(pickFromArray(WANDERER_PASSIVE_IDS, rng), 2)]
    : []
  return {
    raceId,
    baseStats: { ...archetype.baseStats },
    skillPresets,
    passivePresets,
    skillPriorities: skillPrioritiesFromPresets(skillPresets),
  }
}

function resolveShiftingShaman(
  archetype: EnemyArchetype,
  rng: () => number,
): ChaoticArchetypeResolution {
  const startingTag = pickFromArray(SHIFTING_RESIST_TAGS, rng)
  return {
    classId: archetype.classId ?? 'mage',
    raceId: archetype.raceId,
    baseStats: { ...archetype.baseStats },
    skillPresets: [...archetype.skillPresets],
    passivePresets: [...archetype.passivePresets],
    skillPriorities: [...archetype.skillPriorities],
    statusEffects: [createShiftingResistStatus(archetype.id, startingTag)],
  }
}

export function resolveChaoticArchetype(
  archetype: EnemyArchetype,
  rng: () => number,
): ChaoticArchetypeResolution {
  switch (archetype.id) {
    case 'enemy_chaos_aberration':
      return resolveChaosAberration(archetype, rng)
    case 'enemy_mutant_wanderer':
      return resolveMutantWanderer(archetype, rng)
    case 'enemy_shifting_shaman':
      return resolveShiftingShaman(archetype, rng)
    default:
      return {
        raceId: archetype.raceId,
        classId: archetype.classId,
        baseStats: { ...archetype.baseStats },
        skillPresets: [...archetype.skillPresets],
        passivePresets: [...archetype.passivePresets],
        skillPriorities: [...archetype.skillPriorities],
      }
  }
}

export function mergeArchetypeWithChaoticResolution(
  archetype: EnemyArchetype,
  resolution: ChaoticArchetypeResolution,
): EnemyArchetype {
  return {
    ...archetype,
    ...(resolution.classId !== undefined ? { classId: resolution.classId } : {}),
    ...(resolution.raceId !== undefined ? { raceId: resolution.raceId } : {}),
    baseStats: resolution.baseStats,
    skillPresets: resolution.skillPresets,
    passivePresets: resolution.passivePresets,
    skillPriorities: resolution.skillPriorities,
  }
}

export function makeChaoticSpawnRng(spawnSeed: number, enemyId: string): () => number {
  let s = hashSeed(`${spawnSeed}:${enemyId}`) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}
