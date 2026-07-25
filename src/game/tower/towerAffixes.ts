import type { Unit } from '../types'

export const TOWER_AFFIX_LABELS: Record<
  string,
  { title: string; description: string }
> = {
  tower_affix_enemy_initiative: {
    title: 'Стремительные враги',
    description: 'Все враги получают +2 к инициативе.',
  },
  tower_affix_heal_down: {
    title: 'Истощение',
    description: 'Исцеление героев ×0.75.',
  },
  tower_affix_narrow_field: {
    title: 'Тесный зал',
    description: 'Уменьшенное поле боя.',
  },
}

export function getTowerAffixLabel(id: string): { title: string; description: string } {
  return (
    TOWER_AFFIX_LABELS[id] ?? {
      title: id,
      description: '',
    }
  )
}

export function applyTowerAffixToUnits(units: Unit[], affixId: string): Unit[] {
  if (affixId !== 'tower_affix_enemy_initiative') return units
  return units.map((unit) => {
    if (unit.side !== 'enemy') return unit
    const initiativeBase = (unit.initiativeBase ?? 0) + 2
    return { ...unit, initiativeBase }
  })
}

/** Multiplier for player-target heals when tower affix active. */
export function towerHealMultiplier(affixId: string | undefined): number {
  if (affixId === 'tower_affix_heal_down') return 0.75
  return 1
}
