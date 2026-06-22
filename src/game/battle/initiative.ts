import type { BattleState, Unit } from '../types'

export type InitiativeContext = {
  gearBonusByUnitId?: Readonly<Record<string, number>>
  battleBuffsByUnitId?: Readonly<Record<string, number>>
}

export function computeUnitInitiative(
  unit: Unit,
  ctx: { gearBonus?: number; battleBuffs?: number } = {},
): number {
  const base = unit.initiativeBase ?? 10
  return base + (ctx.gearBonus ?? 0) + (ctx.battleBuffs ?? 0)
}

export function buildRoundTurnOrder(
  units: readonly Unit[],
  ctx: InitiativeContext = {},
): readonly string[] {
  const alive = units.filter((u) => u.hp > 0)
  const scored = alive.map((unit) => ({
    id: unit.id,
    initiative: computeUnitInitiative(unit, {
      gearBonus: ctx.gearBonusByUnitId?.[unit.id] ?? 0,
      battleBuffs: ctx.battleBuffsByUnitId?.[unit.id] ?? 0,
    }),
  }))
  scored.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative
    return a.id.localeCompare(b.id)
  })
  return scored.map((s) => s.id)
}

function getUnit(state: BattleState, id: string): Unit | undefined {
  return state.units.find((u) => u.id === id)
}

function isAliveUnit(u: Unit | undefined): u is Unit {
  return u !== undefined && u.hp > 0
}

function resolveActorPointer(state: BattleState): number {
  const n = state.turnOrder.length
  if (n === 0) return 0
  for (let i = 0; i < n; i++) {
    const idx = (state.currentTurnIndex + i) % n
    const id = state.turnOrder[idx]
    if (isAliveUnit(getUnit(state, id))) return idx
  }
  return state.currentTurnIndex
}

function advanceFromPointer(state: BattleState, fromPtr: number): BattleState {
  const n = state.turnOrder.length
  if (n === 0) return state

  for (let step = 1; step <= n; step++) {
    const idx = (fromPtr + step) % n
    const id = state.turnOrder[idx]
    if (!isAliveUnit(getUnit(state, id))) continue

    const wrapped = idx <= fromPtr
    if (wrapped) {
      const turnOrder = buildRoundTurnOrder(state.units)
      return {
        ...state,
        roundNumber: state.roundNumber + 1,
        turnOrder,
        currentTurnIndex: 0,
      }
    }
    return { ...state, currentTurnIndex: idx }
  }
  return { ...state, currentTurnIndex: (fromPtr + 1) % n }
}

/** Advances to the next living actor; wraps to a new initiative round when the queue cycles. */
export function advanceTurn(state: BattleState): BattleState {
  const fromPtr = resolveActorPointer(state)
  return advanceFromPointer(state, fromPtr)
}
