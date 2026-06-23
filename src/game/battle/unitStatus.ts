import type { StatId } from '../config/baseStats'
import type { Unit } from '../types'
import { rotateShiftingResistTag } from './elementalResist'

export type UnitStatusKind =
  | 'attack_up'
  | 'defense_up'
  | 'defense_down'
  | 'card_damage_up'
  | 'rooted'
  | 'range_down'
  | 'dot'
  | 'regen'
  | 'damage_reduction'
  | 'soul_mark'
  | 'grave_silence'
  | 'spell_eaten'
  | 'silence_dark'
  | 'decay_aura'
  | 'stealth'
  | 'elemental_resist'

export type UnitStatusEffect = {
  id: string
  kind: UnitStatusKind
  remainingTurns: number
  magnitude: number
  sourceTemplateId?: string
}

export type StatusCombatModifiers = {
  attackFlat: number
  defenseFlat: number
  cardDamageMult: number
  rangePenalty: number
  damageReductionPct: number
}

const EMPTY_MODS: StatusCombatModifiers = {
  attackFlat: 0,
  defenseFlat: 0,
  cardDamageMult: 1,
  rangePenalty: 0,
  damageReductionPct: 0,
}

export function unitStatuses(unit: Unit): readonly UnitStatusEffect[] {
  return unit.statusEffects ?? []
}

export function hasUnitStatus(unit: Unit, kind: UnitStatusKind): boolean {
  return unitStatuses(unit).some((s) => s.kind === kind && s.remainingTurns > 0)
}

export function removeUnitStatusByKind(unit: Unit, kind: UnitStatusKind): Unit {
  const next = unitStatuses(unit).filter((s) => s.kind !== kind)
  return { ...unit, statusEffects: next.length > 0 ? next : undefined }
}

export function isUnitRooted(unit: Unit): boolean {
  return unitStatuses(unit).some((s) => s.kind === 'rooted' && s.remainingTurns > 0)
}

export function statusCombatModifiers(unit: Unit): StatusCombatModifiers {
  const mods = { ...EMPTY_MODS }
  for (const s of unitStatuses(unit)) {
    if (s.remainingTurns <= 0) continue
    switch (s.kind) {
      case 'attack_up':
        mods.attackFlat += s.magnitude
        break
      case 'defense_up':
        mods.defenseFlat += s.magnitude
        break
      case 'defense_down':
        mods.defenseFlat -= s.magnitude
        break
      case 'card_damage_up':
        mods.cardDamageMult += s.magnitude / 100
        break
      case 'range_down':
        mods.rangePenalty += s.magnitude
        break
      case 'damage_reduction':
        mods.damageReductionPct += s.magnitude
        break
      default:
        break
    }
  }
  return mods
}

export function applyDamageReduction(damage: number, target: Unit): number {
  const pct = statusCombatModifiers(target).damageReductionPct
  if (pct <= 0) return damage
  return Math.max(0, Math.round(damage * (1 - pct / 100)))
}

export function appendUnitStatus(unit: Unit, effect: UnitStatusEffect): Unit {
  const prev = unitStatuses(unit)
  return {
    ...unit,
    statusEffects: [...prev.filter((s) => s.kind !== effect.kind || s.sourceTemplateId !== effect.sourceTemplateId), effect],
  }
}

export function tickUnitStatusesAtTurnStart(unit: Unit): {
  unit: Unit
  dotDamage: number
  regenHeal: number
} {
  let dotDamage = 0
  let regenHeal = 0
  const next: UnitStatusEffect[] = []

  for (const s of unitStatuses(unit)) {
    if (s.kind === 'dot') dotDamage += s.magnitude
    if (s.kind === 'regen') regenHeal += s.magnitude
    if (s.kind === 'elemental_resist') {
      const remaining = s.remainingTurns - 1
      if (remaining <= 0) {
        next.push({
          ...s,
          sourceTemplateId: rotateShiftingResistTag(s.sourceTemplateId),
          remainingTurns: 3,
        })
      } else {
        next.push({ ...s, remainingTurns: remaining })
      }
      continue
    }
    const remaining = s.remainingTurns - 1
    if (remaining > 0) next.push({ ...s, remainingTurns: remaining })
  }

  return {
    unit: { ...unit, statusEffects: next },
    dotDamage,
    regenHeal,
  }
}

export function statusForSkill(
  templateId: string,
  effectPower: number,
): UnitStatusEffect | null {
  const id = `${templateId}-${Date.now()}-${Math.random()}`
  switch (templateId) {
    case 'battle_cry':
      return { id, kind: 'attack_up', remainingTurns: 2, magnitude: Math.max(1, Math.round(effectPower / 3)), sourceTemplateId: templateId }
    case 'frenzy':
      return { id, kind: 'attack_up', remainingTurns: 2, magnitude: Math.max(2, Math.round(effectPower / 2)), sourceTemplateId: templateId }
    case 'blood_rage':
      return { id, kind: 'card_damage_up', remainingTurns: 2, magnitude: Math.max(15, Math.min(60, effectPower * 5)), sourceTemplateId: templateId }
    case 'divine_shield':
      return { id, kind: 'damage_reduction', remainingTurns: 1, magnitude: Math.max(20, Math.min(50, effectPower * 4)), sourceTemplateId: templateId }
    case 'snare_trap':
      return { id, kind: 'rooted', remainingTurns: 1, magnitude: 1, sourceTemplateId: templateId }
    case 'smoke_bomb':
      return { id, kind: 'range_down', remainingTurns: 1, magnitude: 1, sourceTemplateId: templateId }
    case 'poison_blade':
      return { id, kind: 'dot', remainingTurns: 3, magnitude: Math.max(2, Math.round(effectPower / 3)), sourceTemplateId: templateId }
    case 'corruption':
      return { id, kind: 'dot', remainingTurns: 3, magnitude: Math.max(2, Math.round(effectPower / 2)), sourceTemplateId: templateId }
    case 'regeneration':
      return { id, kind: 'regen', remainingTurns: 3, magnitude: Math.max(2, Math.round(effectPower / 3)), sourceTemplateId: templateId }
    default:
      return null
  }
}

/** Optional frenzy defense debuff as separate effect */
export function frenzyDefenseDebuff(templateId: string, effectPower: number): UnitStatusEffect | null {
  if (templateId !== 'frenzy') return null
  return {
    id: `frenzy-def-${Date.now()}`,
    kind: 'defense_down',
    remainingTurns: 2,
    magnitude: Math.max(1, Math.round(effectPower / 4)),
    sourceTemplateId: templateId,
  }
}

export function effectiveStatWithStatuses(
  baseStat: number,
  statId: StatId,
  unit: Unit,
): number {
  const mods = statusCombatModifiers(unit)
  if (statId === 'attack') return Math.max(0, baseStat + mods.attackFlat)
  if (statId === 'defense') return Math.max(0, baseStat + mods.defenseFlat)
  return baseStat
}
