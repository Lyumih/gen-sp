import { HERO_BASIC_RANGED_COOLDOWN_TURNS } from './combat'
import type { BattleState } from '../types'

export function getHeroRangedCooldown(state: BattleState, unitId: string): number {
  return state.heroRangedCooldownByUnitId?.[unitId] ?? 0
}

export function isHeroRangedReady(state: BattleState, unitId: string): boolean {
  return getHeroRangedCooldown(state, unitId) <= 0
}

export function setHeroRangedCooldown(state: BattleState, unitId: string): BattleState {
  const cd = HERO_BASIC_RANGED_COOLDOWN_TURNS
  if (cd <= 0) return state
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit || unit.side !== 'player') return state
  return {
    ...state,
    heroRangedCooldownByUnitId: {
      ...state.heroRangedCooldownByUnitId,
      [unitId]: cd,
    },
    skipHeroCooldownTick: true,
  }
}

export function tickHeroRangedCooldown(state: BattleState, actorId: string): BattleState {
  const current = state.heroRangedCooldownByUnitId?.[actorId] ?? 0
  if (current <= 0) return state
  const next = current - 1
  const map = { ...state.heroRangedCooldownByUnitId }
  if (next <= 0) {
    delete map[actorId]
  } else {
    map[actorId] = next
  }
  return {
    ...state,
    heroRangedCooldownByUnitId: Object.keys(map).length > 0 ? map : undefined,
  }
}
