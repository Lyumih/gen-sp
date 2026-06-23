import type { BaseStats, ClassId } from '../config/baseStats'
import type { IconAccentId, ModSlotState } from '../types'
import type { RaceId } from './enemyRaces'

export type EnemySkillPreset = {
  templateId: string
  global_level: number
  modSlots: ModSlotState[]
}

export type EnemyPassivePreset = {
  templateId: string
  global_level: number
  modSlots: ModSlotState[]
}

export type EnemySkillPriority = {
  skillId: string
  baseScore: number
  preferLowHpTarget?: boolean
  preferRangedTarget?: boolean
  preferHealerTarget?: boolean
  minRange?: number
}

export type EnemyBaseAttack = 'strike' | 'shot' | 'magic_bolt'

export type EnemyArchetype = {
  id: string
  label: string
  emoji: string
  semanticEmojiId?: string
  iconAccent?: IconAccentId
  raceId: RaceId
  classId?: ClassId
  threatTags: readonly string[]
  counterClass: ClassId
  baseStats: BaseStats
  baseAttack: EnemyBaseAttack
  skillPresets: readonly EnemySkillPreset[]
  passivePresets: readonly EnemyPassivePreset[]
  skillPriorities: readonly EnemySkillPriority[]
  isBoss?: boolean
  isChaotic?: boolean
  spawnWeight: number
  descriptionRu: string
}

const EMPTY_MODS: ModSlotState[] = []

const LEGACY_GRUNT_STATS: BaseStats = {
  health: 8,
  defense: 1,
  attack: 2,
  magicPower: 0,
  mana: 0,
  healPower: 0,
  speed: 2,
  initiative: 6,
  critChance: 2,
}

const LEGACY_BOSS_STATS: BaseStats = {
  health: 18,
  defense: 3,
  attack: 4,
  magicPower: 2,
  mana: 10,
  healPower: 0,
  speed: 2,
  initiative: 8,
  critChance: 5,
}

const ENEMY_ARCHETYPES: Readonly<Record<string, EnemyArchetype>> = {
  grunt: {
    id: 'grunt',
    label: 'Рядовой',
    emoji: '👹',
    iconAccent: 'red',
    raceId: 'orc',
    threatTags: ['melee'],
    counterClass: 'warrior',
    baseStats: LEGACY_GRUNT_STATS,
    baseAttack: 'strike',
    skillPresets: [],
    passivePresets: [],
    skillPriorities: [],
    spawnWeight: 10,
    descriptionRu: 'MVP-рядовой враг (legacy).',
  },
  boss: {
    id: 'boss',
    label: 'Босс',
    emoji: '💀',
    iconAccent: 'purple',
    raceId: 'undead',
    threatTags: ['boss'],
    counterClass: 'warrior',
    baseStats: LEGACY_BOSS_STATS,
    baseAttack: 'strike',
    skillPresets: [],
    passivePresets: [],
    skillPriorities: [],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'MVP-босс (legacy).',
  },
  enemy_orc_ravager: {
    id: 'enemy_orc_ravager',
    label: 'Орк-разоритель',
    emoji: '🪓',
    raceId: 'orc',
    classId: 'berserker',
    threatTags: ['melee', 'rush'],
    counterClass: 'mage',
    baseStats: {
      health: 14,
      defense: 1,
      attack: 5,
      magicPower: 0,
      mana: 0,
      healPower: 0,
      speed: 4,
      initiative: 9,
      critChance: 4,
    },
    baseAttack: 'strike',
    skillPresets: [
      { templateId: 'frenzy', global_level: 3, modSlots: EMPTY_MODS },
      { templateId: 'whirlwind', global_level: 3, modSlots: EMPTY_MODS },
      { templateId: 'monster_roar', global_level: 2, modSlots: EMPTY_MODS },
    ],
    passivePresets: [],
    skillPriorities: [
      { skillId: 'frenzy', baseScore: 8 },
      { skillId: 'whirlwind', baseScore: 6, preferLowHpTarget: false },
      { skillId: 'monster_roar', baseScore: 4 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Быстрый раш, AoE — контрит мага в смешанном отряде.',
  },
  boss_blink_hunter: {
    id: 'boss_blink_hunter',
    label: 'Мстительный призрак',
    emoji: '👻',
    raceId: 'specter',
    classId: 'rogue',
    threatTags: ['boss', 'assassin'],
    counterClass: 'ranger',
    baseStats: {
      health: 22,
      defense: 2,
      attack: 5,
      magicPower: 1,
      mana: 8,
      healPower: 0,
      speed: 4,
      initiative: 10,
      critChance: 8,
    },
    baseAttack: 'strike',
    skillPresets: [
      { templateId: 'boss_blink_adjacent', global_level: 6, modSlots: EMPTY_MODS },
      { templateId: 'backstab', global_level: 5, modSlots: EMPTY_MODS },
    ],
    passivePresets: [],
    skillPriorities: [
      { skillId: 'boss_blink_adjacent', baseScore: 12, preferRangedTarget: true },
      { skillId: 'backstab', baseScore: 8, preferLowHpTarget: true },
    ],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Телепорт к дальнему бою — гибридный антипод лучника.',
  },
}

export const ENEMY_ARCHETYPE_IDS: readonly string[] = Object.keys(ENEMY_ARCHETYPES)

export function getEnemyArchetype(id: string): EnemyArchetype | undefined {
  return ENEMY_ARCHETYPES[id]
}
