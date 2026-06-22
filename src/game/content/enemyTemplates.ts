import type { BaseStats } from '../config/baseStats'

export type EnemyTemplate = {
  id: string
  label: string
  emoji?: string
  /** Legacy single-stat HP base. */
  baseHpStat: number
  baseStats: BaseStats
}

export const ENEMY_TEMPLATES: Readonly<Record<string, EnemyTemplate>> = {
  grunt: {
    id: 'grunt',
    label: 'Рядовой',
    emoji: '👹',
    baseHpStat: 8,
    baseStats: {
      health: 8,
      defense: 1,
      attack: 2,
      magicPower: 0,
      mana: 0,
      healPower: 0,
      speed: 2,
      initiative: 6,
      critChance: 2,
    },
  },
  boss: {
    id: 'boss',
    label: 'Босс',
    emoji: '💀',
    baseHpStat: 18,
    baseStats: {
      health: 18,
      defense: 3,
      attack: 4,
      magicPower: 2,
      mana: 10,
      healPower: 0,
      speed: 2,
      initiative: 8,
      critChance: 5,
    },
  },
}

export function getEnemyTemplate(id: string): EnemyTemplate | undefined {
  return ENEMY_TEMPLATES[id]
}
