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

function skill(templateId: string, global_level: number, modSlots: ModSlotState[] = EMPTY_MODS): EnemySkillPreset {
  return { templateId, global_level, modSlots }
}

function passive(templateId: string, global_level: number, modSlots: ModSlotState[] = EMPTY_MODS): EnemyPassivePreset {
  return { templateId, global_level, modSlots }
}

/** Regular enemy baseline (~grunt power). */
const REGULAR_STATS: BaseStats = {
  health: 12,
  defense: 2,
  attack: 3,
  magicPower: 1,
  mana: 4,
  healPower: 0,
  speed: 2,
  initiative: 7,
  critChance: 3,
}

/** Boss baseline (~legacy boss power, tuned up). */
const BOSS_STATS: BaseStats = {
  health: 24,
  defense: 3,
  attack: 5,
  magicPower: 3,
  mana: 12,
  healPower: 0,
  speed: 2,
  initiative: 9,
  critChance: 6,
}

const ENEMY_ARCHETYPES: Readonly<Record<string, EnemyArchetype>> = {
  // --- Legacy MVP aliases (excluded from ENEMY_ARCHETYPE_IDS) ---
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

  // --- §6.1 Против Воина ---
  enemy_siege_golem: {
    id: 'enemy_siege_golem',
    label: 'Осадный голем',
    emoji: '🗿',
    raceId: 'construct',
    classId: 'warrior',
    threatTags: ['ruins', 'melee', 'aoe'],
    counterClass: 'warrior',
    baseStats: { ...REGULAR_STATS, health: 16, defense: 4, attack: 4, speed: 1, initiative: 5 },
    baseAttack: 'strike',
    skillPresets: [skill('cleave', 2), skill('whirlwind', 2), skill('monster_armor_break', 2)],
    passivePresets: [passive('warrior_riposte', 3)],
    skillPriorities: [
      { skillId: 'monster_armor_break', baseScore: 9 },
      { skillId: 'whirlwind', baseScore: 7 },
      { skillId: 'cleave', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Пробивает броню, AoE — контрит воина в смешанном отряде.',
  },
  enemy_ether_duelist: {
    id: 'enemy_ether_duelist',
    label: 'Эфирный дуэлянт',
    emoji: '👤',
    raceId: 'specter',
    classId: 'mage',
    threatTags: ['ruins', 'magic', 'kite'],
    counterClass: 'warrior',
    baseStats: { ...REGULAR_STATS, health: 10, defense: 1, magicPower: 4, mana: 8, speed: 3, initiative: 9 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('arcane_bolt', 2), skill('frost_nova', 2), skill('smoke_bomb', 2)],
    passivePresets: [passive('mage_frost_ward', 2)],
    skillPriorities: [
      { skillId: 'smoke_bomb', baseScore: 8, minRange: 2 },
      { skillId: 'frost_nova', baseScore: 7 },
      { skillId: 'arcane_bolt', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Кайтит, замедляет — контрит воина в смешанном отряде.',
  },

  // --- §6.2 Против Мага ---
  enemy_orc_ravager: {
    id: 'enemy_orc_ravager',
    label: 'Орк-разоритель',
    emoji: '🪓',
    raceId: 'orc',
    classId: 'berserker',
    threatTags: ['arena', 'melee', 'rush'],
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
    skillPresets: [skill('frenzy', 3), skill('whirlwind', 3), skill('monster_roar', 2)],
    passivePresets: [passive('enemy_rage_trait', 2)],
    skillPriorities: [
      { skillId: 'frenzy', baseScore: 8 },
      { skillId: 'whirlwind', baseScore: 6 },
      { skillId: 'monster_roar', baseScore: 4 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Быстрый раш, AoE — контрит мага в смешанном отряде.',
  },
  enemy_mana_leech: {
    id: 'enemy_mana_leech',
    label: 'Пожиратель маны',
    emoji: '😈',
    raceId: 'demon',
    classId: 'warlock',
    threatTags: ['swamp', 'magic', 'debuff'],
    counterClass: 'mage',
    baseStats: { ...REGULAR_STATS, health: 11, magicPower: 4, mana: 10, speed: 3, initiative: 8 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('shadow_bolt', 2), skill('life_drain', 2), skill('monster_mana_siphon', 3)],
    passivePresets: [passive('enemy_anti_mana', 3)],
    skillPriorities: [
      { skillId: 'monster_mana_siphon', baseScore: 10, preferRangedTarget: true },
      { skillId: 'shadow_bolt', baseScore: 7 },
      { skillId: 'life_drain', baseScore: 5, preferLowHpTarget: true },
    ],
    spawnWeight: 10,
    descriptionRu: 'Высасывает ресурс мага — контрит мага в смешанном отряде.',
  },

  // --- §6.3 Против Лучника ---
  enemy_shadow_stalker: {
    id: 'enemy_shadow_stalker',
    label: 'Теневой охотник',
    emoji: '🌑',
    raceId: 'specter',
    classId: 'rogue',
    threatTags: ['forest', 'assassin', 'melee'],
    counterClass: 'ranger',
    baseStats: { ...REGULAR_STATS, health: 10, defense: 1, attack: 4, speed: 4, initiative: 10, critChance: 6 },
    baseAttack: 'strike',
    skillPresets: [skill('smoke_bomb', 3), skill('backstab', 3), skill('poison_blade', 2)],
    passivePresets: [passive('rogue_agility', 2)],
    skillPriorities: [
      { skillId: 'smoke_bomb', baseScore: 9, minRange: 2 },
      { skillId: 'backstab', baseScore: 8, preferLowHpTarget: true },
      { skillId: 'poison_blade', baseScore: 6 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Сближение через дым — контрит лучника в смешанном отряде.',
  },
  enemy_iron_bulwark: {
    id: 'enemy_iron_bulwark',
    label: 'Железный бастион',
    emoji: '🛡',
    raceId: 'human',
    classId: 'warrior',
    threatTags: ['arena', 'tank', 'melee'],
    counterClass: 'ranger',
    baseStats: { ...REGULAR_STATS, health: 16, defense: 5, attack: 3, speed: 1, initiative: 6 },
    baseAttack: 'strike',
    skillPresets: [skill('shield_bash', 2), skill('battle_cry', 2), skill('monster_armor_break', 2)],
    passivePresets: [passive('warrior_fortitude', 3), passive('enemy_thorns', 2)],
    skillPriorities: [
      { skillId: 'shield_bash', baseScore: 8, preferRangedTarget: true },
      { skillId: 'monster_armor_break', baseScore: 6 },
      { skillId: 'battle_cry', baseScore: 4 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Высокая защита, отражение — контрит лучника в смешанном отряде.',
  },

  // --- §6.4 Против Лекаря ---
  enemy_plague_herald: {
    id: 'enemy_plague_herald',
    label: 'Чумной вестник',
    emoji: '☠️',
    raceId: 'undead',
    classId: 'warlock',
    threatTags: ['crypt', 'swamp', 'dot'],
    counterClass: 'healer',
    baseStats: { ...REGULAR_STATS, health: 11, magicPower: 4, mana: 8, initiative: 7 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('monster_plague_cloud', 3), skill('corruption', 2), skill('shadow_bolt', 2)],
    passivePresets: [passive('enemy_anti_heal_aura', 3)],
    skillPriorities: [
      { skillId: 'monster_plague_cloud', baseScore: 9 },
      { skillId: 'corruption', baseScore: 7, preferHealerTarget: true },
      { skillId: 'shadow_bolt', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Снижает хил, DoT — контрит лекаря в смешанном отряде.',
  },
  enemy_bone_assassin: {
    id: 'enemy_bone_assassin',
    label: 'Костяной убийца',
    emoji: '💀',
    raceId: 'undead',
    classId: 'rogue',
    threatTags: ['crypt', 'assassin', 'burst'],
    counterClass: 'healer',
    baseStats: { ...REGULAR_STATS, health: 10, attack: 4, speed: 4, initiative: 10, critChance: 8 },
    baseAttack: 'strike',
    skillPresets: [skill('backstab', 3), skill('poison_blade', 3), skill('monster_bite', 2)],
    passivePresets: [passive('rogue_precision', 3)],
    skillPriorities: [
      { skillId: 'backstab', baseScore: 10, preferHealerTarget: true, preferLowHpTarget: true },
      { skillId: 'poison_blade', baseScore: 7 },
      { skillId: 'monster_bite', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Burst быстрее хила — контрит лекаря в смешанном отряде.',
  },

  // --- §6.5 Против Разбойника ---
  enemy_iron_warden: {
    id: 'enemy_iron_warden',
    label: 'Железный караульный',
    emoji: '⚔️',
    raceId: 'human',
    classId: 'warrior',
    threatTags: ['arena', 'melee', 'aoe'],
    counterClass: 'rogue',
    baseStats: { ...REGULAR_STATS, health: 14, defense: 4, attack: 4, speed: 2, initiative: 7 },
    baseAttack: 'strike',
    skillPresets: [skill('cleave', 2), skill('shield_bash', 2), skill('whirlwind', 2)],
    passivePresets: [passive('enemy_thorns', 2), passive('warrior_battle_line', 2)],
    skillPriorities: [
      { skillId: 'whirlwind', baseScore: 8 },
      { skillId: 'cleave', baseScore: 6 },
      { skillId: 'shield_bash', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'AoE, шипы — контрит разбойника в смешанном отряде.',
  },
  enemy_storm_caller: {
    id: 'enemy_storm_caller',
    label: 'Призыватель бури',
    emoji: '⛈️',
    raceId: 'elf',
    classId: 'mage',
    threatTags: ['ruins', 'magic', 'aoe'],
    counterClass: 'rogue',
    baseStats: { ...REGULAR_STATS, health: 10, magicPower: 5, mana: 10, initiative: 8 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('fireball', 2), skill('frost_nova', 2), skill('arcane_bolt', 2)],
    passivePresets: [passive('mage_ignite', 2)],
    skillPriorities: [
      { skillId: 'fireball', baseScore: 9 },
      { skillId: 'frost_nova', baseScore: 7 },
      { skillId: 'arcane_bolt', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'AoE по области — контрит разбойника в смешанном отряде.',
  },

  // --- §6.6 Против Паладина ---
  enemy_dark_cultist: {
    id: 'enemy_dark_cultist',
    label: 'Культист тьмы',
    emoji: '🕯️',
    raceId: 'human',
    classId: 'warlock',
    threatTags: ['crypt', 'magic', 'dark'],
    counterClass: 'paladin',
    baseStats: { ...REGULAR_STATS, health: 11, magicPower: 4, mana: 8 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('shadow_bolt', 2), skill('corruption', 2), skill('life_drain', 2)],
    passivePresets: [passive('enemy_dark_affinity', 2)],
    skillPriorities: [
      { skillId: 'corruption', baseScore: 8 },
      { skillId: 'shadow_bolt', baseScore: 7 },
      { skillId: 'life_drain', baseScore: 5, preferLowHpTarget: true },
    ],
    spawnWeight: 10,
    descriptionRu: 'Тёмный урон — контрит паладина в смешанном отряде.',
  },
  enemy_grave_speaker: {
    id: 'enemy_grave_speaker',
    label: 'Говорящий с мёртвыми',
    emoji: '👻',
    raceId: 'undead',
    classId: 'mage',
    threatTags: ['crypt', 'magic', 'dot'],
    counterClass: 'paladin',
    baseStats: { ...REGULAR_STATS, health: 11, magicPower: 4, mana: 8, initiative: 7 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('corruption', 2), skill('frost_nova', 2), skill('monster_bone_throw', 2)],
    passivePresets: [passive('healer_renewal', 2)],
    skillPriorities: [
      { skillId: 'corruption', baseScore: 8 },
      { skillId: 'monster_bone_throw', baseScore: 6, preferRangedTarget: true },
      { skillId: 'frost_nova', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Нежить + DoT — контрит паладина в смешанном отряде.',
  },

  // --- §6.7 Против Колдуна ---
  enemy_holy_crusader: {
    id: 'enemy_holy_crusader',
    label: 'Святой каратель',
    emoji: '✝️',
    raceId: 'human',
    classId: 'paladin',
    threatTags: ['arena', 'holy', 'melee'],
    counterClass: 'warlock',
    baseStats: { ...REGULAR_STATS, health: 14, defense: 3, attack: 4, healPower: 2, mana: 6 },
    baseAttack: 'strike',
    skillPresets: [skill('holy_strike', 2), skill('divine_shield', 2), skill('lay_on_hands', 2)],
    passivePresets: [passive('enemy_holy_ward', 2)],
    skillPriorities: [
      { skillId: 'holy_strike', baseScore: 8 },
      { skillId: 'divine_shield', baseScore: 6 },
      { skillId: 'lay_on_hands', baseScore: 4 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Святой урон + щит — контрит колдуна в смешанном отряде.',
  },
  enemy_lightbound: {
    id: 'enemy_lightbound',
    label: 'Светоносец',
    emoji: '✨',
    raceId: 'elf',
    classId: 'healer',
    threatTags: ['forest', 'holy', 'heal'],
    counterClass: 'warlock',
    baseStats: { ...REGULAR_STATS, health: 12, healPower: 4, mana: 8, defense: 2 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('holy_strike', 2), skill('heal', 2), skill('regeneration', 2)],
    passivePresets: [passive('enemy_holy_ward', 2)],
    skillPriorities: [
      { skillId: 'holy_strike', baseScore: 7 },
      { skillId: 'regeneration', baseScore: 6 },
      { skillId: 'heal', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Переживает DoT — контрит колдуна в смешанном отряде.',
  },

  // --- §6.8 Против Берсерка ---
  enemy_frost_shaman: {
    id: 'enemy_frost_shaman',
    label: 'Ледяной шаман',
    emoji: '❄️',
    raceId: 'elf',
    classId: 'mage',
    threatTags: ['forest', 'magic', 'kite'],
    counterClass: 'berserker',
    baseStats: { ...REGULAR_STATS, health: 10, magicPower: 4, mana: 8, speed: 3, initiative: 9 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('frost_nova', 3), skill('arcane_bolt', 2), skill('monster_roar', 2)],
    passivePresets: [passive('mage_frost_ward', 3)],
    skillPriorities: [
      { skillId: 'frost_nova', baseScore: 9, minRange: 1 },
      { skillId: 'monster_roar', baseScore: 6 },
      { skillId: 'arcane_bolt', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Замедление, кайт — контрит берсерка в смешанном отряде.',
  },
  enemy_spinebeast: {
    id: 'enemy_spinebeast',
    label: 'Шипозверь',
    emoji: '🦔',
    raceId: 'beast',
    classId: 'warrior',
    threatTags: ['forest', 'melee', 'tank'],
    counterClass: 'berserker',
    baseStats: { ...REGULAR_STATS, health: 15, defense: 4, attack: 4, speed: 2, initiative: 6 },
    baseAttack: 'strike',
    skillPresets: [skill('shield_bash', 2), skill('monster_bite', 2), skill('cleave', 2)],
    passivePresets: [passive('enemy_thorns', 3)],
    skillPriorities: [
      { skillId: 'shield_bash', baseScore: 7 },
      { skillId: 'monster_bite', baseScore: 6 },
      { skillId: 'cleave', baseScore: 5 },
    ],
    spawnWeight: 10,
    descriptionRu: 'Защита + отражение — контрит берсерка в смешанном отряде.',
  },

  // --- §7 Боссы ---
  boss_iron_colossus: {
    id: 'boss_iron_colossus',
    label: 'Железный колосс',
    emoji: '🤖',
    raceId: 'construct',
    classId: 'warrior',
    threatTags: ['boss', 'melee', 'aoe'],
    counterClass: 'warrior',
    baseStats: { ...BOSS_STATS, health: 28, defense: 5, attack: 6, speed: 1, initiative: 7 },
    baseAttack: 'strike',
    skillPresets: [skill('boss_ground_slam', 6), skill('monster_armor_break', 5)],
    passivePresets: [passive('boss_ignore_armor', 5)],
    skillPriorities: [
      { skillId: 'boss_ground_slam', baseScore: 12 },
      { skillId: 'monster_armor_break', baseScore: 8 },
    ],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Удар по земле, игнор брони — гибридный антипод воина.',
  },
  boss_spell_eater: {
    id: 'boss_spell_eater',
    label: 'Пожиратель заклинаний',
    emoji: '🌀',
    raceId: 'demon',
    classId: 'mage',
    threatTags: ['boss', 'magic', 'anti-mage'],
    counterClass: 'mage',
    baseStats: { ...BOSS_STATS, health: 22, magicPower: 6, mana: 16, defense: 2 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('boss_spell_eater', 7), skill('monster_mana_siphon', 6)],
    passivePresets: [passive('enemy_anti_mana', 5)],
    skillPriorities: [
      { skillId: 'boss_spell_eater', baseScore: 12, preferRangedTarget: true },
      { skillId: 'monster_mana_siphon', baseScore: 9 },
    ],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Поглощает заклинания — гибридный антипод мага.',
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
    skillPresets: [skill('boss_blink_adjacent', 6), skill('backstab', 5)],
    passivePresets: [passive('boss_ranged_ward', 5)],
    skillPriorities: [
      { skillId: 'boss_blink_adjacent', baseScore: 12, preferRangedTarget: true },
      { skillId: 'backstab', baseScore: 8, preferLowHpTarget: true },
    ],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Телепорт к дальнему бою — гибридный антипод лучника.',
  },
  boss_soul_reaper: {
    id: 'boss_soul_reaper',
    label: 'Жнец душ',
    emoji: '⚰️',
    raceId: 'undead',
    classId: 'warlock',
    threatTags: ['boss', 'anti-heal', 'dark'],
    counterClass: 'healer',
    baseStats: { ...BOSS_STATS, health: 23, magicPower: 5, mana: 14 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('boss_soul_mark', 6), skill('boss_grave_silence', 6)],
    passivePresets: [passive('enemy_anti_heal_aura', 5)],
    skillPriorities: [
      { skillId: 'boss_soul_mark', baseScore: 12, preferHealerTarget: true },
      { skillId: 'boss_grave_silence', baseScore: 9, preferHealerTarget: true },
    ],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Метка души, блок воскрешения — гибридный антипод лекаря.',
  },
  boss_abyss_warden: {
    id: 'boss_abyss_warden',
    label: 'Страж Бездны',
    emoji: '🛡',
    raceId: 'construct',
    classId: 'warrior',
    threatTags: ['boss', 'tank', 'melee'],
    counterClass: 'rogue',
    baseStats: { ...BOSS_STATS, health: 26, defense: 6, attack: 5, speed: 1 },
    baseAttack: 'strike',
    skillPresets: [skill('boss_ward_pulse', 7)],
    passivePresets: [passive('boss_no_flank', 5)],
    skillPriorities: [{ skillId: 'boss_ward_pulse', baseScore: 12 }],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Импульс стража, без фланга — гибридный антипод разбойника.',
  },
  boss_decay_avatar: {
    id: 'boss_decay_avatar',
    label: 'Аватар упадка',
    emoji: '🦠',
    raceId: 'demon',
    classId: 'warlock',
    threatTags: ['boss', 'dot', 'dark'],
    counterClass: 'paladin',
    baseStats: { ...BOSS_STATS, health: 24, magicPower: 5, mana: 14 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('boss_decay_aura', 7), skill('monster_plague_cloud', 6)],
    passivePresets: [passive('enemy_dark_affinity', 5)],
    skillPriorities: [
      { skillId: 'boss_decay_aura', baseScore: 11 },
      { skillId: 'monster_plague_cloud', baseScore: 8 },
    ],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Аура упадка, чума — гибридный антипод паладина.',
  },
  boss_high_inquisitor: {
    id: 'boss_high_inquisitor',
    label: 'Верховный инквизитор',
    emoji: '⚖️',
    raceId: 'human',
    classId: 'paladin',
    threatTags: ['boss', 'holy', 'anti-dark'],
    counterClass: 'warlock',
    baseStats: { ...BOSS_STATS, health: 25, attack: 5, healPower: 3, mana: 10 },
    baseAttack: 'strike',
    skillPresets: [skill('boss_holy_judgment', 7), skill('boss_silence_dark', 6)],
    passivePresets: [passive('enemy_holy_ward', 5)],
    skillPriorities: [
      { skillId: 'boss_holy_judgment', baseScore: 12 },
      { skillId: 'boss_silence_dark', baseScore: 9 },
    ],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Святой суд, тишина тьмы — гибридный антипод колдуна.',
  },
  boss_mirror_fiend: {
    id: 'boss_mirror_fiend',
    label: 'Зеркальный демон',
    emoji: '🪞',
    raceId: 'demon',
    classId: 'berserker',
    threatTags: ['boss', 'melee', 'reflect'],
    counterClass: 'berserker',
    baseStats: { ...BOSS_STATS, health: 24, attack: 6, speed: 3, critChance: 8 },
    baseAttack: 'strike',
    skillPresets: [skill('boss_mirror_rage', 7), skill('whirlwind', 6)],
    passivePresets: [passive('boss_reflect_rage', 5)],
    skillPriorities: [
      { skillId: 'boss_mirror_rage', baseScore: 11 },
      { skillId: 'whirlwind', baseScore: 8 },
    ],
    isBoss: true,
    spawnWeight: 0,
    descriptionRu: 'Зеркальная ярость, вихрь — гибридный антипод берсерка.',
  },

  // --- §8 Хаотичные мутанты ---
  enemy_chaos_aberration: {
    id: 'enemy_chaos_aberration',
    label: 'Аберрация хаоса',
    emoji: '🌀',
    raceId: 'demon',
    threatTags: ['swamp', 'chaotic'],
    counterClass: 'warrior',
    baseStats: { ...REGULAR_STATS, health: 11, attack: 3, magicPower: 3, speed: 3, initiative: 8 },
    baseAttack: 'strike',
    skillPresets: [skill('frenzy', 2), skill('shadow_bolt', 2)],
    passivePresets: [],
    skillPriorities: [
      { skillId: 'frenzy', baseScore: 6 },
      { skillId: 'shadow_bolt', baseScore: 5 },
    ],
    isChaotic: true,
    spawnWeight: 3,
    descriptionRu: 'Случайный класс и умения; per-stat variance.',
  },
  enemy_mutant_wanderer: {
    id: 'enemy_mutant_wanderer',
    label: 'Мутант-скиталец',
    emoji: '🧬',
    raceId: 'beast',
    threatTags: ['swamp', 'chaotic'],
    counterClass: 'ranger',
    baseStats: { ...REGULAR_STATS, health: 12, attack: 4, speed: 3, critChance: 5 },
    baseAttack: 'strike',
    skillPresets: [skill('monster_bite', 2), skill('cleave', 2), skill('poison_blade', 2)],
    passivePresets: [passive('enemy_thorns', 1)],
    skillPriorities: [
      { skillId: 'monster_bite', baseScore: 6 },
      { skillId: 'cleave', baseScore: 5 },
      { skillId: 'poison_blade', baseScore: 4 },
    ],
    isChaotic: true,
    spawnWeight: 3,
    descriptionRu: 'Случайная раса и умения; 0–1 случайный пассив.',
  },
  enemy_shifting_shaman: {
    id: 'enemy_shifting_shaman',
    label: 'Шаман перемен',
    emoji: '🔮',
    raceId: 'elf',
    classId: 'mage',
    threatTags: ['swamp', 'chaotic', 'magic'],
    counterClass: 'mage',
    baseStats: { ...REGULAR_STATS, health: 11, magicPower: 4, mana: 10, initiative: 8 },
    baseAttack: 'magic_bolt',
    skillPresets: [skill('frost_nova', 2), skill('arcane_bolt', 2), skill('fireball', 2)],
    passivePresets: [passive('mage_frost_ward', 2)],
    skillPriorities: [
      { skillId: 'frost_nova', baseScore: 7 },
      { skillId: 'fireball', baseScore: 6 },
      { skillId: 'arcane_bolt', baseScore: 5 },
    ],
    isChaotic: true,
    spawnWeight: 3,
    descriptionRu: 'Ротация резиста fire/ice/poison каждые 3 хода.',
  },
}

const LEGACY_ARCHETYPE_IDS = new Set(['grunt', 'boss'])

export const ENEMY_ARCHETYPE_IDS: readonly string[] = Object.keys(ENEMY_ARCHETYPES).filter(
  (id) => !LEGACY_ARCHETYPE_IDS.has(id),
)

export function getEnemyArchetype(id: string): EnemyArchetype | undefined {
  return ENEMY_ARCHETYPES[id]
}
