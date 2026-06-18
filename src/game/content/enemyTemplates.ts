export type EnemyTemplate = {
  id: string
  label: string
  emoji?: string
  baseHpStat: number
}

export const ENEMY_TEMPLATES: Readonly<Record<string, EnemyTemplate>> = {
  grunt: {
    id: 'grunt',
    label: 'Рядовой',
    emoji: '👹',
    baseHpStat: 8,
  },
  boss: {
    id: 'boss',
    label: 'Босс',
    emoji: '💀',
    baseHpStat: 18,
  },
}

export function getEnemyTemplate(id: string): EnemyTemplate | undefined {
  return ENEMY_TEMPLATES[id]
}
