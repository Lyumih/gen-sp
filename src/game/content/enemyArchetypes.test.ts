import { describe, expect, it } from 'vitest'
import { ENEMY_ARCHETYPE_IDS, getEnemyArchetype } from './enemyArchetypes'

describe('getEnemyArchetype', () => {
  it('returns enemy_orc_ravager with orc race and mage counterClass', () => {
    const a = getEnemyArchetype('enemy_orc_ravager')
    expect(a).toBeDefined()
    expect(a?.raceId).toBe('orc')
    expect(a?.counterClass).toBe('mage')
  })

  it('returns boss_blink_hunter as boss', () => {
    const a = getEnemyArchetype('boss_blink_hunter')
    expect(a).toBeDefined()
    expect(a?.isBoss).toBe(true)
    expect(a?.raceId).toBe('specter')
    expect(a?.counterClass).toBe('ranger')
  })

  it('keeps legacy grunt and boss entries', () => {
    expect(getEnemyArchetype('grunt')?.baseStats.health).toBe(8)
    expect(getEnemyArchetype('boss')?.baseStats.health).toBe(18)
  })

  it('returns undefined for unknown id', () => {
    expect(getEnemyArchetype('unknown_enemy')).toBeUndefined()
  })

  it('lists all registered archetype ids', () => {
    expect(ENEMY_ARCHETYPE_IDS).toContain('enemy_orc_ravager')
    expect(ENEMY_ARCHETYPE_IDS).toContain('boss_blink_hunter')
    expect(ENEMY_ARCHETYPE_IDS).toContain('grunt')
    expect(ENEMY_ARCHETYPE_IDS).toContain('boss')
    expect(ENEMY_ARCHETYPE_IDS).toHaveLength(4)
  })
})
