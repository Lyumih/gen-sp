import { describe, expect, it } from 'vitest'
import { applyTowerAffixToUnits, towerHealMultiplier } from './towerAffixes'
import type { Unit } from '../types'

const enemy: Unit = {
  id: 'e1',
  side: 'enemy',
  x: 1,
  y: 1,
  hp: 10,
  maxHp: 10,
  unitLevel: 1,
  initiativeBase: 5,
}

describe('towerAffixes', () => {
  it('initiative affix adds +2 to enemies', () => {
    const out = applyTowerAffixToUnits([enemy], 'tower_affix_enemy_initiative')
    expect(out[0]!.initiativeBase).toBe(7)
  })

  it('heal down multiplier', () => {
    expect(towerHealMultiplier('tower_affix_heal_down')).toBe(0.75)
    expect(towerHealMultiplier(undefined)).toBe(1)
  })
})
