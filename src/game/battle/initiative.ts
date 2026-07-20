import type { BattleLogEntry, BattleState, Unit } from '../types'
import { regenManaAtTurnStart } from './mana'
import { tickUnitStatusesAtTurnStart } from './unitStatus'

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
  const advanced = advanceFromPointer(state, fromPtr)
  const actorId = advanced.turnOrder[advanced.currentTurnIndex]
  if (!actorId) return advanced
  return processTurnStartStatuses(advanced, actorId)
}

function processTurnStartStatuses(state: BattleState, unitId: string): BattleState {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit || unit.hp <= 0) return state

  const { unit: ticked, dotDamage, regenHeal } = tickUnitStatusesAtTurnStart(unit)
  let units = state.units.map((u) => (u.id === unitId ? ticked : u))
  const logs: BattleLogEntry[] = []

  if (dotDamage > 0 || regenHeal > 0) {
    logs.push({
      type: 'status_tick',
      unitId,
      ...(dotDamage > 0 ? { dotDamage } : {}),
      ...(regenHeal > 0 ? { regenHeal } : {}),
    })
  }

  if (dotDamage > 0) {
    units = units.map((u) =>
      u.id === unitId ? { ...u, hp: Math.max(0, u.hp - dotDamage) } : u,
    )
  }
  if (regenHeal > 0) {
    units = units.map((u) =>
      u.id === unitId ? { ...u, hp: Math.min(u.maxHp, u.hp + regenHeal) } : u,
    )
  }

  const withMana = regenManaAtTurnStart(
    units.find((candidate) => candidate.id === unitId)!,
  )
  units = units.map((u) => (u.id === unitId ? withMana : u))

  if (logs.length === 0) {
    return units === state.units ? state : { ...state, units }
  }
  return { ...state, units, battleLog: [...state.battleLog, ...logs] }
}
