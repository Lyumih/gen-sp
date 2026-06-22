import type { IconAccentId } from '../types'
import { getEnemyTemplate } from './enemyTemplates'
import type { BattleScenarioEnemy } from '../campaign/scenarios'

export type EnemyUnitDisplay = {
  name: string
  emoji: string
  accent: IconAccentId
}

export function resolveEnemyUnitDisplay(
  enemy: BattleScenarioEnemy,
): EnemyUnitDisplay {
  const tmpl = getEnemyTemplate(enemy.archetypeId)
  return {
    name: enemy.displayName ?? tmpl?.label ?? enemy.id,
    emoji: enemy.iconEmoji ?? tmpl?.emoji ?? '👾',
    accent: enemy.iconAccent ?? tmpl?.iconAccent ?? 'default',
  }
}
