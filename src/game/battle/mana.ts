import type { BaseStats } from '../config/baseStats'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { applyManaCostMods, type ModCombatContext } from '../mods/modPipeline'
import type { Unit } from '../types'

export function unitManaFromBaseStats(
  baseStats: BaseStats,
): { mana: number; maxMana: number } {
  return {
    mana: baseStats.mana,
    maxMana: baseStats.mana,
  }
}

export function regenManaAtTurnStart(unit: Unit): Unit {
  const regen = unit.baseStats?.manaRegen ?? 0
  if (unit.mana === undefined || unit.maxMana === undefined || regen === 0) return unit

  return {
    ...unit,
    mana: Math.min(unit.maxMana, unit.mana + regen),
  }
}

export function canAffordManaCost(unit: Unit, cost: number): boolean {
  return (unit.mana ?? 0) >= cost
}

export function spendMana(unit: Unit, cost: number): Unit {
  return {
    ...unit,
    mana: Math.max(0, (unit.mana ?? 0) - cost),
  }
}

export function effectiveManaCostForTemplate(
  templateId: string,
  modCtx: ModCombatContext,
): number | null {
  const template = getCardAttackTemplate(templateId)
  if (!template) return null
  return applyManaCostMods(template.manaCost, modCtx)
}
