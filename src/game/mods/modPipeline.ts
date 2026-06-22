import { getModTemplate } from '../content/modTemplates'
import type { ModOp } from '../content/modTemplates'
import { scaleModValue } from '../memento/modScaling'
import type { ModSlotState } from '../types'

export type ModCombatContext = {
  carrierTags: readonly string[]
  modSlots: readonly ModSlotState[]
  rng: () => number // 1-100 for procs later
}

type FilledOp = { op: ModOp; lm: number }

function collectFilledOps(modSlots: readonly ModSlotState[]): FilledOp[] {
  const out: FilledOp[] = []
  for (const slot of modSlots) {
    if (slot.status !== 'filled') continue
    const tmpl = getModTemplate(slot.templateId)
    if (!tmpl) continue
    for (const op of tmpl.ops) {
      out.push({ op, lm: slot.lm })
    }
  }
  return out
}

function scaledOpValue(op: ModOp & { base: number; scaleMode: 'percent' | 'flat' }, lm: number): number {
  return scaleModValue(op.base, lm, op.scaleMode)
}

function sumOpsByKind(
  modSlots: readonly ModSlotState[],
  kind: ModOp['kind'],
): number {
  let total = 0
  for (const { op, lm } of collectFilledOps(modSlots)) {
    if (op.kind !== kind) continue
    if ('base' in op && 'scaleMode' in op) {
      total += scaledOpValue(op, lm)
    }
  }
  return total
}

export function applyDamageMods(baseDamage: number, ctx: ModCombatContext): number {
  const mult = sumOpsByKind(ctx.modSlots, 'damage_mult')
  return Math.round(baseDamage * (1 + mult))
}

export function applyHealMods(baseHeal: number, ctx: ModCombatContext): number {
  const mult = sumOpsByKind(ctx.modSlots, 'heal_mult')
  return Math.round(baseHeal * (1 + mult))
}

export function applyRangeMods(baseRange: number, ctx: ModCombatContext): number {
  return baseRange + sumOpsByKind(ctx.modSlots, 'range_add')
}

export function applyCooldownMods(baseCd: number, ctx: ModCombatContext): number {
  const delta = sumOpsByKind(ctx.modSlots, 'cooldown_add')
  return Math.max(0, baseCd + delta)
}

export function applyAoeSizeMods(baseSize: number, ctx: ModCombatContext): number {
  return baseSize + sumOpsByKind(ctx.modSlots, 'aoe_size_add')
}
