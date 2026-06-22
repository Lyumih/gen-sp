import type { BattlePlayerCard, BattleState } from '../types'
import { getCurrentActorId } from './reducer'
import { updateActorPlayerCards } from './playerCards'

export function tickHeroCardCooldowns(
  state: BattleState,
  actorId?: string,
): BattleState {
  if (state.skipHeroCooldownTick) {
    const { skipHeroCooldownTick: _, ...rest } = state
    return rest
  }
  if (state.phase !== 'ongoing') return state
  const id = actorId ?? getCurrentActorId(state)
  if (!id) return state
  const cards = state.playerCardsByUnitId[id]
  if (!cards) return state
  const nextCards = cards.map((c) =>
    c.cooldownRemaining > 0
      ? { ...c, cooldownRemaining: c.cooldownRemaining - 1 }
      : c,
  ) satisfies readonly BattlePlayerCard[]
  return updateActorPlayerCards(state, id, nextCards)
}

export function heroTurnAdvanced(prev: BattleState, next: BattleState): boolean {
  if (prev.phase !== 'ongoing') return false
  const prevActor = prev.turnOrder[prev.currentTurnIndex]
  if (!prevActor) return false
  const unit = prev.units.find((u) => u.id === prevActor)
  if (!unit || unit.side !== 'player') return false
  if (next.phase !== 'ongoing') return true
  return next.currentTurnIndex !== prev.currentTurnIndex
}
