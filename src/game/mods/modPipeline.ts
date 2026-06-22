import { getModTemplate } from '../content/modTemplates'
import type { ModOp } from '../content/modTemplates'
import { scaleModValue } from '../memento/modScaling'
import type { ItemInstance, ModSlotState } from '../types'

export type PassiveModBonuses = {
  health: number
  defense: number
  initiative: number
}

export type ModCombatContext = {
  carrierTags: readonly string[]
  modSlots: readonly ModSlotState[]
  rng: () => number // 1-100 for procs
}

export type ModProcResult = {
  modTemplateId: string
  label: string
  extraHits: number
}

type FilledOp = { op: ModOp; lm: number; templateId: string; label: string }

function collectFilledOps(modSlots: readonly ModSlotState[]): FilledOp[] {
  const out: FilledOp[] = []
  for (const slot of modSlots) {
    if (slot.status !== 'filled') continue
    const tmpl = getModTemplate(slot.templateId)
    if (!tmpl) continue
    for (const op of tmpl.ops) {
      out.push({ op, lm: slot.lm, templateId: tmpl.id, label: tmpl.label })
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

export function applyAoeCenterDamageMods(
  baseDamage: number,
  isCenter: boolean,
  ctx: ModCombatContext,
): number {
  if (!isCenter) return baseDamage
  const mult = sumOpsByKind(ctx.modSlots, 'aoe_center_damage_mult')
  return Math.round(baseDamage * (1 + mult))
}

export function computeSelfHealOnUse(ctx: ModCombatContext): number {
  let total = 0
  for (const { op, lm } of collectFilledOps(ctx.modSlots)) {
    if (op.kind !== 'self_heal_on_use') continue
    total += Math.round(scaledOpValue(op, lm))
  }
  return total
}

export function computeLifestealHeal(damageDealt: number, ctx: ModCombatContext): number {
  const pct = sumOpsByKind(ctx.modSlots, 'lifesteal_pct')
  if (pct <= 0 || damageDealt <= 0) return 0
  return Math.round(damageDealt * pct)
}

export function computeReflectDamage(ctx: ModCombatContext): number {
  let total = 0
  for (const { op, lm } of collectFilledOps(ctx.modSlots)) {
    if (op.kind !== 'reflect_on_hit') continue
    total += Math.round(scaledOpValue(op, lm))
  }
  return total
}

export function computeSelfHealOnDamaged(ctx: ModCombatContext): number {
  let total = 0
  for (const { op, lm } of collectFilledOps(ctx.modSlots)) {
    if (op.kind !== 'self_heal_on_damaged') continue
    total += Math.round(scaledOpValue(op, lm))
  }
  return total
}

export function computeHealSplashAmount(primaryHeal: number, ctx: ModCombatContext): number {
  if (primaryHeal <= 0) return 0
  let ratio = 0
  for (const { op, lm } of collectFilledOps(ctx.modSlots)) {
    if (op.kind !== 'heal_splash') continue
    ratio += scaleModValue(op.splashRatio, lm, op.scaleMode)
  }
  if (ratio <= 0) return 0
  return Math.round(primaryHeal * ratio)
}

/** Sums passive carrier stats from filled mod slots on equipped items. */
export function aggregatePassiveModBonuses(
  equippedItems: readonly ItemInstance[],
): PassiveModBonuses {
  let health = 0
  let defense = 0
  let initiative = 0
  for (const item of equippedItems) {
    health += sumOpsByKind(item.modSlots, 'carrier_hp_add')
    defense += sumOpsByKind(item.modSlots, 'defense_add')
    initiative += sumOpsByKind(item.modSlots, 'initiative_add')
  }
  return { health, defense, initiative }
}

/** Independent RNG roll per proc_extra_hit mod (slot order). */
export function rollProcExtraHits(ctx: ModCombatContext): ModProcResult[] {
  const results: ModProcResult[] = []
  for (const { op, templateId, label } of collectFilledOps(ctx.modSlots)) {
    if (op.kind !== 'proc_extra_hit') continue
    const roll = ctx.rng()
    const threshold = op.baseChance * 100
    if (roll <= threshold) {
      results.push({ modTemplateId: templateId, label, extraHits: op.hits })
    }
  }
  return results
}
