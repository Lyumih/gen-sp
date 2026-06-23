import { describe, expect, it } from 'vitest'
import { BOSS_ARCHETYPE_IDS } from '../../campaign/scenarios'
import { HERO_ARCHETYPE_IDS } from '../../content/enemyArchetypes'
import { generateTunnel } from './tunnel'

describe('generateTunnel', () => {
  it('battle 0 uses melee pool, battle 1 uses hero or boss', () => {
    const b0 = generateTunnel({ seed: 1, battleIndex: 0, expeditionPartySize: 2 })
    const b1 = generateTunnel({ seed: 1, battleIndex: 1, expeditionPartySize: 2 })
    expect(b0.width).toBe(10)
    expect(b0.height).toBe(1)
    expect(b1.enemySpawns).toHaveLength(1)
    const archId =
      b1.enemySpawns[0]?.kind === 'fixed' ? b1.enemySpawns[0].archetypeId : ''
    const allowed = new Set<string>([...HERO_ARCHETYPE_IDS, ...BOSS_ARCHETYPE_IDS])
    expect(allowed.has(archId)).toBe(true)
  })
})
