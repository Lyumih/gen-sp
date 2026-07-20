import { describe, expect, it } from 'vitest'
import { BASE_STAT_IDS } from '../config/baseStats'
import type { BaseStats } from '../config/baseStats'
import { getEnemyArchetype } from '../content/enemyArchetypes'
import { hashSeed } from '../stats/rollBaseStats'
import {
  applyVarianceToBaseStats,
  pickEnemyArchetypesFromPool,
  resolveChaoticArchetype,
  rollVarianceMult,
  SHIFTING_RESIST_TAGS,
} from './enemySpawn'
import { rotateShiftingResistTag } from './elementalResist'
import { tickUnitStatusesAtTurnStart } from './unitStatus'
import type { Unit } from '../types'
import { CHARACTER_CLASS_IDS } from '../content/characterClasses'

function makeSeededRng(seedKey: string): () => number {
  let s = hashSeed(seedKey) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

const sampleBase: BaseStats = {
  health: 10,
  defense: 2,
  attack: 4,
  magicPower: 1,
  mana: 5,
  healPower: 0,
  speed: 2,
  initiative: 6,
  critChance: 3,
}

describe('rollVarianceMult', () => {
  it('returns a single multiplier in 0.5–1.5 for global variance', () => {
    const rng = makeSeededRng('global-variance')
    const mult = rollVarianceMult(rng, false, BASE_STAT_IDS.length)
    expect(typeof mult).toBe('number')
    expect(mult as number).toBeGreaterThanOrEqual(0.5)
    expect(mult as number).toBeLessThanOrEqual(1.5)
  })

  it('returns independent multipliers per stat for chaotic variance', () => {
    const rng = makeSeededRng('chaotic-variance')
    const mults = rollVarianceMult(rng, true, BASE_STAT_IDS.length) as number[]
    expect(mults).toHaveLength(BASE_STAT_IDS.length)
    for (const m of mults) {
      expect(m).toBeGreaterThanOrEqual(0.5)
      expect(m).toBeLessThanOrEqual(1.5)
    }
    expect(new Set(mults).size).toBeGreaterThan(1)
  })
})

describe('applyVarianceToBaseStats', () => {
  it('scales all stats proportionally with a global multiplier', () => {
    const out = applyVarianceToBaseStats(sampleBase, 1.2)
    for (const id of BASE_STAT_IDS) {
      expect(out[id]).toBe(Math.round(sampleBase[id] * 1.2))
    }
  })

  it('applies per-stat multipliers in BASE_STAT_IDS order', () => {
    const perStat = BASE_STAT_IDS.map((_, i) => 0.5 + i * 0.1)
    const out = applyVarianceToBaseStats(sampleBase, perStat)
    BASE_STAT_IDS.forEach((id, i) => {
      expect(out[id]).toBe(Math.round(sampleBase[id] * perStat[i]!))
    })
  })
})

describe('pickEnemyArchetypesFromPool', () => {
  it('never returns archetypes missing a pool tag', () => {
    const rng = makeSeededRng('forest-pool')
    const picks = pickEnemyArchetypesFromPool(['forest'], 20, rng)
    for (const id of picks) {
      const tags = getEnemyArchetype(id)?.threatTags ?? []
      expect(tags).toContain('forest')
    }
  })

  it('excludes zero-weight and boss entries from melee pool', () => {
    const rng = makeSeededRng('melee-pool')
    const picks = pickEnemyArchetypesFromPool(['melee'], 10, rng)
    expect(picks.length).toBeGreaterThan(0)
    for (const id of picks) {
      const a = getEnemyArchetype(id)
      expect(a?.isBoss).not.toBe(true)
      expect(a?.spawnWeight).toBeGreaterThan(0)
      expect(a?.threatTags).toContain('melee')
    }
  })

  it('respects spawnWeight when rng favors the heavier entry', () => {
    const picks: string[] = []
    const rng = () => 0.99
    for (let i = 0; i < 5; i++) {
      picks.push(...pickEnemyArchetypesFromPool(['arena', 'melee', 'rush'], 1, rng))
    }
    expect(picks.every((id) => id === 'enemy_orc_ravager')).toBe(true)
  })
})

describe('resolveChaoticArchetype', () => {
  it('chaos aberration picks random class and 2 swamp-pool skills with fixed seed', () => {
    const archetype = getEnemyArchetype('enemy_chaos_aberration')!
    const rng = makeSeededRng('aberration-spawn')
    const resolved = resolveChaoticArchetype(archetype, rng)
    const again = resolveChaoticArchetype(archetype, makeSeededRng('aberration-spawn'))

    expect(again).toEqual(resolved)
    expect(CHARACTER_CLASS_IDS).toContain(resolved.classId)
    expect(resolved.skillPresets).toHaveLength(2)
    expect(resolved.skillPresets.map((s) => s.templateId)).toEqual([
      'monster_plague_cloud',
      'monster_mana_siphon',
    ])
    expect(resolved.passivePresets).toHaveLength(0)
    expect(resolved.baseStats.health).not.toBe(archetype.baseStats.health)
  })

  it('chaos aberration varies class and skills across seeds', () => {
    const archetype = getEnemyArchetype('enemy_chaos_aberration')!
    const a = resolveChaoticArchetype(archetype, makeSeededRng('seed-a'))
    const b = resolveChaoticArchetype(archetype, makeSeededRng('seed-b'))
    const sameClassAndSkills =
      a.classId === b.classId &&
      a.skillPresets.map((s) => s.templateId).join() ===
        b.skillPresets.map((s) => s.templateId).join()
    expect(sameClassAndSkills).toBe(false)
  })

  it('mutant wanderer picks random race, 3 unique skills, and 0–1 passive', () => {
    const archetype = getEnemyArchetype('enemy_mutant_wanderer')!
    const resolved = resolveChaoticArchetype(archetype, makeSeededRng('wanderer-spawn'))

    expect(resolved.raceId).toBeDefined()
    expect(resolved.skillPresets).toHaveLength(3)
    expect(new Set(resolved.skillPresets.map((s) => s.templateId)).size).toBe(3)
    expect(resolved.passivePresets.length).toBeLessThanOrEqual(1)
  })

  it('mutant wanderer passive roll varies by seed', () => {
    const archetype = getEnemyArchetype('enemy_mutant_wanderer')!
    const counts = Array.from({ length: 24 }, (_, i) =>
      resolveChaoticArchetype(archetype, makeSeededRng(`wanderer-${i}`)).passivePresets.length,
    )
    expect(counts.some((n) => n === 0)).toBe(true)
    expect(counts.some((n) => n === 1)).toBe(true)
  })

  it('shifting shaman starts with elemental resist status cycling fire/ice/poison', () => {
    const archetype = getEnemyArchetype('enemy_shifting_shaman')!
    const resolved = resolveChaoticArchetype(archetype, makeSeededRng('shaman-resist'))

    expect(resolved.classId).toBe('mage')
    expect(resolved.raceId).toBe('elf')
    expect(resolved.statusEffects).toHaveLength(1)
    const ward = resolved.statusEffects![0]!
    expect(ward.kind).toBe('elemental_resist')
    expect(ward.remainingTurns).toBe(3)
    expect(SHIFTING_RESIST_TAGS).toContain(ward.sourceTemplateId)
    expect(ward.magnitude).toBeGreaterThan(0)
  })

  it('rotateShiftingResistTag cycles fire -> ice -> poison', () => {
    expect(rotateShiftingResistTag('fire')).toBe('ice')
    expect(rotateShiftingResistTag('ice')).toBe('poison')
    expect(rotateShiftingResistTag('poison')).toBe('fire')
  })

  it('elemental resist status rotates on turn tick expiry', () => {
    const unit: Unit = {
      id: 'shaman',
      side: 'enemy',
      x: 2,
      y: 2,
      hp: 20,
      maxHp: 20,
      unitLevel: 1,
      statusEffects: [
        {
          id: 'ward',
          kind: 'elemental_resist',
          remainingTurns: 1,
          magnitude: 30,
          sourceTemplateId: 'fire',
        },
      ],
    }
    const { unit: ticked } = tickUnitStatusesAtTurnStart(unit)
    expect(ticked.statusEffects?.[0]?.sourceTemplateId).toBe('ice')
    expect(ticked.statusEffects?.[0]?.remainingTurns).toBe(3)
  })
})
