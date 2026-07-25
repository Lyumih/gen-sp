import { describe, expect, it } from 'vitest'
import { applyRunAction, initialCampaignState } from '../campaign/runReducer'
import { HERO_BASIC_MELEE_DAMAGE } from '../battle/combat'
import { describeBasicActionStats } from './basicActionText'

function battleFixture() {
  const started = applyRunAction(initialCampaignState(), { type: 'START_OR_CONTINUE_BATTLE' })
  const battle = started.battle
  if (!battle) throw new Error('expected battle')
  return battle
}

describe('describeBasicActionStats', () => {
  it('melee expectedDamage includes passive attack flat', () => {
    const battle = battleFixture()
    const hero = battle.units.find((u) => u.side === 'player')!
    const desc = describeBasicActionStats({
      kind: 'melee',
      battle,
      actor: hero,
      effectiveRangedRange: 6,
      rangedCooldownRemaining: 0,
    })
    expect(desc.expectedDamage).toBeGreaterThanOrEqual(HERO_BASIC_MELEE_DAMAGE)
    expect(desc.contextBadge).toContain('💥')
  })

  it('move contextBadge shows move range', () => {
    const battle = battleFixture()
    const desc = describeBasicActionStats({
      kind: 'move',
      battle,
      effectiveRangedRange: 6,
      rangedCooldownRemaining: 0,
    })
    expect(desc.moveRange).toBe(3)
    expect(desc.contextBadge).toContain('⬜')
  })
})
