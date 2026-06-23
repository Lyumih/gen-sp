import type { EnemyArchetype } from '../content/enemyArchetypes'
import type { ChaoticArchetypeResolution } from './enemySpawn'
import { mergeArchetypeWithChaoticResolution } from './enemySpawn'
import { cloneModSlots } from '../memento/modSlotsClone'
import type { BattlePlayerCard, BattleState, PassiveInstance } from '../types'

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

export function updateActorEnemyCards(
  state: BattleState,
  unitId: string,
  cards: readonly BattlePlayerCard[],
): BattleState {
  return {
    ...state,
    enemyCardsByUnitId: {
      ...state.enemyCardsByUnitId,
      [unitId]: cards,
    },
  }
}

export function getActorEnemyCards(
  state: BattleState,
  unitId: string | undefined,
): readonly BattlePlayerCard[] {
  if (!unitId) return []
  return state.enemyCardsByUnitId?.[unitId] ?? []
}

export function enemyCardsByUnitFromScenario(
  enemies: readonly { id: string; archetypeId: string }[],
  getArchetype: (id: string) => EnemyArchetype | undefined,
  chaoticByUnitId?: Readonly<Record<string, ChaoticArchetypeResolution>>,
): Record<string, BattlePlayerCard[]> {
  const out: Record<string, BattlePlayerCard[]> = {}
  for (const enemy of enemies) {
    const base = getArchetype(enemy.archetypeId)
    const chaotic = chaoticByUnitId?.[enemy.id]
    const archetype =
      base && chaotic ? mergeArchetypeWithChaoticResolution(base, chaotic) : base
    if (!archetype || archetype.skillPresets.length === 0) continue
    out[enemy.id] = enemyCardsFromArchetype(archetype, enemy.id)
  }
  return out
}

export function enemyPassivesByUnitFromScenario(
  enemies: readonly { id: string; archetypeId: string }[],
  getArchetype: (id: string) => EnemyArchetype | undefined,
  chaoticByUnitId?: Readonly<Record<string, ChaoticArchetypeResolution>>,
): Record<string, PassiveInstance[]> {
  const out: Record<string, PassiveInstance[]> = {}
  for (const enemy of enemies) {
    const base = getArchetype(enemy.archetypeId)
    const chaotic = chaoticByUnitId?.[enemy.id]
    const archetype =
      base && chaotic ? mergeArchetypeWithChaoticResolution(base, chaotic) : base
    if (!archetype || archetype.passivePresets.length === 0) continue
    out[enemy.id] = enemyPassivesFromArchetype(archetype, enemy.id)
  }
  return out
}
