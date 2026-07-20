import {
  UI_ATTACK,
  UI_CRIT,
  UI_DEFENSE,
  UI_HEAL,
  UI_HEART,
  UI_INITIATIVE,
  UI_MAGIC,
  UI_MANA,
  UI_MANA_REGEN,
  UI_SPEED,
} from '../ui/labels'

export type StatId =
  | 'health'
  | 'defense'
  | 'attack'
  | 'magicPower'
  | 'mana'
  | 'manaRegen'
  | 'healPower'
  | 'speed'
  | 'initiative'
  | 'critChance'

export type BaseStats = Record<StatId, number>

export type ClassId =
  | 'warrior'
  | 'mage'
  | 'ranger'
  | 'healer'
  | 'rogue'
  | 'paladin'
  | 'warlock'
  | 'berserker'

export type StatAffinityKind = 'primary' | 'secondary' | 'normal'

export const BASE_STAT_IDS: readonly StatId[] = [
  'health',
  'defense',
  'attack',
  'magicPower',
  'mana',
  'manaRegen',
  'healPower',
  'speed',
  'initiative',
  'critChance',
] as const

export const BASE_STAT_BOUNDS: Record<StatId, { min: number; max: number }> = {
  health: { min: 1, max: 30 },
  defense: { min: 0, max: 5 },
  attack: { min: 0, max: 5 },
  magicPower: { min: 0, max: 5 },
  mana: { min: 0, max: 30 },
  manaRegen: { min: 0, max: 8 },
  healPower: { min: 0, max: 5 },
  speed: { min: 1, max: 3 },
  initiative: { min: 0, max: 10 },
  critChance: { min: 0, max: 20 },
}

export const BASE_STAT_META: Record<
  StatId,
  { labelRu: string; emoji: string; descriptionRu: string }
> = {
  health: {
    labelRu: 'Здоровье',
    emoji: UI_HEART,
    descriptionRu: 'Максимум HP в бою после level и worldPower.',
  },
  defense: {
    labelRu: 'Защита',
    emoji: UI_DEFENSE,
    descriptionRu: 'Снижает входящий урон (фаза 2).',
  },
  attack: {
    labelRu: 'Атака',
    emoji: UI_ATTACK,
    descriptionRu: 'Бонус к урону карт и базовой атаки (фаза 2).',
  },
  magicPower: {
    labelRu: 'Сила магии',
    emoji: UI_MAGIC,
    descriptionRu: 'Бонус к магическому урону (фаза 2).',
  },
  mana: {
    labelRu: 'Мана',
    emoji: UI_MANA,
    descriptionRu: 'Максимум маны в бою (flat).',
  },
  manaRegen: {
    labelRu: 'Реген маны',
    emoji: UI_MANA_REGEN,
    descriptionRu: 'Восстановление 🔮 в начале своего хода в бою.',
  },
  healPower: {
    labelRu: 'Сила исцеления',
    emoji: UI_HEAL,
    descriptionRu: 'Бонус к лечению (фаза 2).',
  },
  speed: {
    labelRu: 'Скорость',
    emoji: UI_SPEED,
    descriptionRu: 'Шагов за ход (фаза 2).',
  },
  initiative: {
    labelRu: 'Инициатива',
    emoji: UI_INITIATIVE,
    descriptionRu: 'Порядок хода каждый раунд.',
  },
  critChance: {
    labelRu: 'Шанс крита',
    emoji: UI_CRIT,
    descriptionRu: 'Шанс критического удара в % (фаза 2).',
  },
}

export const CLASS_STAT_AFFINITY: Record<
  ClassId,
  { primary: StatId[]; secondary: StatId[] }
> = {
  warrior: { primary: ['health', 'defense'], secondary: ['attack'] },
  mage: { primary: ['mana', 'magicPower'], secondary: ['critChance'] },
  ranger: { primary: ['initiative', 'speed'], secondary: ['attack'] },
  healer: { primary: ['mana', 'healPower'], secondary: ['defense'] },
  rogue: { primary: ['critChance', 'speed'], secondary: ['initiative'] },
  paladin: { primary: ['defense', 'healPower'], secondary: ['health'] },
  warlock: { primary: ['magicPower', 'critChance'], secondary: ['mana'] },
  berserker: { primary: ['attack', 'health'], secondary: ['critChance'] },
}

export const CLASS_MANA_ROLL_MAX: Record<ClassId, number> = {
  mage: 35,
  healer: 30,
  warlock: 25,
  paladin: 18,
  ranger: 12,
  rogue: 10,
  warrior: 20,
  berserker: 18,
}

export const CLASS_MANA_REGEN_ROLL_MAX: Record<ClassId, number> = {
  mage: 8,
  healer: 6,
  warlock: 5,
  paladin: 4,
  ranger: 4,
  rogue: 3,
  warrior: 3,
  berserker: 3,
}

export function getStatAffinity(classId: string, statId: StatId): StatAffinityKind {
  const affinity = CLASS_STAT_AFFINITY[classId as ClassId]
  if (!affinity) return 'normal'
  if (affinity.primary.includes(statId)) return 'primary'
  if (affinity.secondary.includes(statId)) return 'secondary'
  return 'normal'
}

/** Fixed stats for the campaign starter hero (not a tavern roll). */
export const STARTER_HERO_BASE_STATS: BaseStats = {
  health: 20,
  defense: 2,
  attack: 3,
  magicPower: 0,
  mana: 5,
  manaRegen: 2,
  healPower: 0,
  speed: 2,
  initiative: 10,
  critChance: 3,
}
