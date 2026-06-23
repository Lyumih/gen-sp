import type { IconAccentId } from '../types'
import {
  ENEMY_ARCHETYPE_IDS,
  getEnemyArchetype,
  type EnemyArchetype,
} from './enemyArchetypes'

const LEGACY_TEMPLATE_IDS = ['grunt', 'boss'] as const

export type EnemyTemplate = Pick<EnemyArchetype, 'id' | 'label' | 'baseStats'> & {
  emoji?: string
  iconAccent?: IconAccentId
  baseHpStat: number
}

function toEnemyTemplate(a: EnemyArchetype): EnemyTemplate {
  return {
    id: a.id,
    label: a.label,
    emoji: a.emoji,
    iconAccent: a.iconAccent,
    baseHpStat: a.baseStats.health,
    baseStats: a.baseStats,
  }
}

const ALL_TEMPLATE_IDS = [...ENEMY_ARCHETYPE_IDS, ...LEGACY_TEMPLATE_IDS]

export const ENEMY_TEMPLATES: Readonly<Record<string, EnemyTemplate>> = Object.fromEntries(
  ALL_TEMPLATE_IDS.map((id) => {
    const a = getEnemyArchetype(id)!
    return [id, toEnemyTemplate(a)]
  }),
)

export function getEnemyTemplate(id: string): EnemyTemplate | undefined {
  const a = getEnemyArchetype(id)
  if (!a) return undefined
  return toEnemyTemplate(a)
}

export { getEnemyArchetype, type EnemyArchetype } from './enemyArchetypes'
