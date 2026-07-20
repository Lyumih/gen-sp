import { describe, expect, it } from 'vitest'
import type { PassiveEquipLoadout } from '../types'
import { createPassiveInstance } from './passiveFactory'
import { aggregatePassiveSkillStatBonuses } from './passiveStatBonuses'
import { TEST_BASE_STATS } from '../stats/testFixtures'

const baseStats = TEST_BASE_STATS

function equip(ids: readonly string[]): PassiveEquipLoadout {
  const loadout: PassiveEquipLoadout = [null, null, null, null, null]
  ids.forEach((id, i) => {
    if (i < 5) loadout[i] = id
  })
  return loadout
}

describe('aggregatePassiveSkillStatBonuses', () => {
  it('adds flat defense bonus when equipped', () => {
    const fortitude = createPassiveInstance('warrior_fortitude')
    const bonuses = aggregatePassiveSkillStatBonuses(
      [fortitude],
      equip([fortitude.id]),
      baseStats,
    )
    expect(bonuses.defense).toBe(2)
  })

  it('ignores unequipped passives', () => {
    const fortitude = createPassiveInstance('warrior_fortitude')
    const bonuses = aggregatePassiveSkillStatBonuses(
      [fortitude],
      [null, null, null, null, null],
      baseStats,
    )
    expect(bonuses.defense).toBeUndefined()
  })

  it('pct bonus uses base stat value', () => {
    const vigor = createPassiveInstance('warrior_vigor')
    const bonuses = aggregatePassiveSkillStatBonuses(
      [vigor],
      equip([vigor.id]),
      baseStats,
    )
    expect(bonuses.health).toBe(Math.round((20 * 15) / 100))
  })
})
