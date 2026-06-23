import type { EnemyArchetype } from '../content/enemyArchetypes'
import { cloneModSlots } from '../memento/modSlotsClone'
import type { BattlePlayerCard, PassiveInstance } from '../types'

export function enemyCardsFromArchetype(
  archetype: EnemyArchetype,
  unitId: string,
): BattlePlayerCard[] {
  return archetype.skillPresets.map((preset, i) => ({
    id: `${unitId}-skill-${i}`,
    templateId: preset.templateId,
    global_level: preset.global_level,
    uses_count: 0,
    modSlots: cloneModSlots(preset.modSlots),
    cooldownRemaining: 0,
  }))
}

export function enemyPassivesFromArchetype(
  archetype: EnemyArchetype,
  unitId: string,
): PassiveInstance[] {
  return archetype.passivePresets.map((preset, i) => ({
    id: `${unitId}-passive-${i}`,
    templateId: preset.templateId,
    global_level: preset.global_level,
    uses_count: 0,
    modSlots: cloneModSlots(preset.modSlots),
  }))
}

export function enemyCardsByUnitFromScenario(
  enemies: readonly { id: string; archetypeId: string }[],
  getArchetype: (id: string) => EnemyArchetype | undefined,
): Record<string, BattlePlayerCard[]> {
  const out: Record<string, BattlePlayerCard[]> = {}
  for (const enemy of enemies) {
    const archetype = getArchetype(enemy.archetypeId)
    if (!archetype || archetype.skillPresets.length === 0) continue
    out[enemy.id] = enemyCardsFromArchetype(archetype, enemy.id)
  }
  return out
}

export function enemyPassivesByUnitFromScenario(
  enemies: readonly { id: string; archetypeId: string }[],
  getArchetype: (id: string) => EnemyArchetype | undefined,
): Record<string, PassiveInstance[]> {
  const out: Record<string, PassiveInstance[]> = {}
  for (const enemy of enemies) {
    const archetype = getArchetype(enemy.archetypeId)
    if (!archetype || archetype.passivePresets.length === 0) continue
    out[enemy.id] = enemyPassivesFromArchetype(archetype, enemy.id)
  }
  return out
}
