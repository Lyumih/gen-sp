import { describe, expect, it } from 'vitest'
import { pickEnemyAiAction } from '../../features/battle/enemyAi'
import { HERO_BASIC_RANGED_DAMAGE } from './combat'
import { getCurrentActorId } from './reducer'
import { applyRunAction, initialCampaignState } from '../campaign/runReducer'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function dispatchRangedShot(s: ReturnType<typeof initialCampaignState>) {
  return applyRunAction(s, {
    type: 'BATTLE_DISPATCH',
    battleAction: {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: HERO_BASIC_RANGED_DAMAGE,
      kind: 'ranged',
      maxRange: 6,
    },
  })
}

describe('hero ranged cooldown integration', () => {
  it('after hero shot turn passes to enemy and enemy action progresses battle', () => {
    let s = applyRunAction(initialCampaignState(), { type: 'START_OR_CONTINUE_BATTLE' })
    expect(getCurrentActorId(s.battle!)).toBe(HERO_ID)

    const prevBattle = s.battle!
    s = dispatchRangedShot(s)
    const afterShot = s.battle!

    expect(afterShot).not.toBe(prevBattle)
    expect(afterShot?.skipHeroCooldownTick).toBeUndefined()
    expect(afterShot?.heroRangedCooldownByUnitId?.[HERO_ID]).toBe(1)
    expect(getCurrentActorId(afterShot!)).not.toBe(HERO_ID)

    const enemyAct = pickEnemyAiAction(afterShot!)
    expect(enemyAct).not.toBeNull()

    const beforeEnemy = s.battle!
    s = applyRunAction(s, { type: 'BATTLE_DISPATCH', battleAction: enemyAct! })
    expect(s.battle, JSON.stringify(enemyAct)).not.toBe(beforeEnemy)
    expect(s.battle?.phase).toBe('ongoing')
  })

  it('failed hero ranged shot on cooldown does not block enemy turn AI', () => {
    let s = applyRunAction(initialCampaignState(), { type: 'START_OR_CONTINUE_BATTLE' })
    s = dispatchRangedShot(s)
    expect(getCurrentActorId(s.battle!)).not.toBe(HERO_ID)

    const onEnemyTurn = s.battle!
    const blocked = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: HERO_ID,
        targetId: 'e1',
        damage: HERO_BASIC_RANGED_DAMAGE,
        kind: 'ranged',
        maxRange: 6,
      },
    })
    expect(blocked.battle).toBe(onEnemyTurn)

    const enemyAct = pickEnemyAiAction(onEnemyTurn)
    expect(enemyAct).not.toBeNull()
    const progressed = applyRunAction(blocked, {
      type: 'BATTLE_DISPATCH',
      battleAction: enemyAct!,
    })
    expect(progressed.battle).not.toBe(onEnemyTurn)
  })
})
