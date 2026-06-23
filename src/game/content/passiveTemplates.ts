import type { ClassId, StatId } from '../config/baseStats'
import { ENEMY_PASSIVE_TEMPLATES } from './enemyPassiveTemplates'
import type { ModOp } from './modTemplates'

export type PassiveTrigger =
  | 'on_strike'
  | 'on_card_attack'
  | 'on_card_heal'
  | 'on_regen_tick'
  | 'on_damaged'
  | 'on_move'
  | 'on_turn_start'
  | 'on_kill'

export type PassiveEffectKind = 'stat_flat' | 'stat_pct' | 'proc' | 'conditional'

export type PassiveTemplate = {
  id: string
  label: string
  semanticEmojiId: string
  classFlavor: ClassId
  effectKind: PassiveEffectKind
  levelTrigger: PassiveTrigger
  statId?: StatId
  baseFlat?: 1 | 2 | 3
  basePct?: number
  procChance?: number
  ops: readonly ModOp[]
  synergies: readonly string[]
  descriptionRu: string
  enabled?: boolean
}

const PASSIVE_ENTRIES: Record<string, PassiveTemplate> = {
  // §9.1 Warrior
  warrior_fortitude: {
    id: 'warrior_fortitude',
    label: 'Стойкость',
    semanticEmojiId: 'shield-gray',
    classFlavor: 'warrior',
    effectKind: 'stat_flat',
    levelTrigger: 'on_damaged',
    statId: 'defense',
    baseFlat: 2,
    ops: [],
    synergies: ['shield_bash'],
    descriptionRu: '+2 к защите при получении урона. Прокачка при каждом полученном уроне.',
  },
  warrior_vigor: {
    id: 'warrior_vigor',
    label: 'Выносливость',
    semanticEmojiId: 'heart-heal',
    classFlavor: 'warrior',
    effectKind: 'stat_pct',
    levelTrigger: 'on_damaged',
    statId: 'health',
    basePct: 15,
    ops: [],
    synergies: ['cleave'],
    descriptionRu: '+15% к максимуму HP при получении урона. Прокачка при каждом полученном уроне.',
  },
  warrior_riposte: {
    id: 'warrior_riposte',
    label: 'Ответный удар',
    semanticEmojiId: 'sword-red',
    classFlavor: 'warrior',
    effectKind: 'proc',
    levelTrigger: 'on_damaged',
    procChance: 0.2,
    ops: [{ kind: 'proc_extra_hit', baseChance: 0.2, hits: 1 }],
    synergies: ['shield_bash'],
    descriptionRu: '20% шанс контрудара в ближнем бою при получении урона.',
  },
  warrior_battle_line: {
    id: 'warrior_battle_line',
    label: 'Боевой строй',
    semanticEmojiId: 'horn-gold',
    classFlavor: 'warrior',
    effectKind: 'proc',
    levelTrigger: 'on_turn_start',
    ops: [{ kind: 'defense_add', base: 1, scaleMode: 'flat' }],
    synergies: ['battle_cry'],
    descriptionRu: 'В начале хода: +1 к защите за каждого союзника в соседней клетке.',
  },

  // §9.2 Mage
  mage_arcane_focus: {
    id: 'mage_arcane_focus',
    label: 'Арканный фокус',
    semanticEmojiId: 'spark-purple',
    classFlavor: 'mage',
    effectKind: 'stat_flat',
    levelTrigger: 'on_card_attack',
    statId: 'magicPower',
    baseFlat: 2,
    ops: [],
    synergies: ['fireball'],
    descriptionRu: '+2 к силе магии при атаке умением. Прокачка при каждой атаке картой.',
  },
  mage_mana_well: {
    id: 'mage_mana_well',
    label: 'Колодец маны',
    semanticEmojiId: 'orb-blue',
    classFlavor: 'mage',
    effectKind: 'stat_pct',
    levelTrigger: 'on_card_attack',
    statId: 'mana',
    basePct: 20,
    ops: [],
    synergies: ['arcane_bolt'],
    descriptionRu: '+20% к мане при атаке умением. Прокачка при каждой атаке картой.',
  },
  mage_ignite: {
    id: 'mage_ignite',
    label: 'Воспламенение',
    semanticEmojiId: 'fire-red',
    classFlavor: 'mage',
    effectKind: 'proc',
    levelTrigger: 'on_card_attack',
    procChance: 0.25,
    ops: [{ kind: 'aoe_size_add', base: 1, scaleMode: 'flat' }],
    synergies: ['fireball'],
    descriptionRu: '25% шанс задеть соседнюю клетку при атаке умением.',
  },
  mage_frost_ward: {
    id: 'mage_frost_ward',
    label: 'Морозный барьер',
    semanticEmojiId: 'frost-blue',
    classFlavor: 'mage',
    effectKind: 'proc',
    levelTrigger: 'on_damaged',
    procChance: 0.15,
    ops: [{ kind: 'initiative_add', base: -1, scaleMode: 'flat' }],
    synergies: ['frost_nova'],
    descriptionRu: '15% шанс замедлить атакующего при получении урона.',
  },

  // §9.3 Ranger
  ranger_keen_eye: {
    id: 'ranger_keen_eye',
    label: 'Меткий глаз',
    semanticEmojiId: 'target-teal',
    classFlavor: 'ranger',
    effectKind: 'stat_flat',
    levelTrigger: 'on_strike',
    statId: 'critChance',
    baseFlat: 2,
    ops: [],
    synergies: ['power_shot'],
    descriptionRu: '+2 к шансу крита при базовой атаке. Прокачка при каждом ударе.',
  },
  ranger_swiftness: {
    id: 'ranger_swiftness',
    label: 'Стремительность',
    semanticEmojiId: 'bow-teal',
    classFlavor: 'ranger',
    effectKind: 'stat_pct',
    levelTrigger: 'on_move',
    statId: 'speed',
    basePct: 15,
    ops: [],
    synergies: ['snare_trap'],
    descriptionRu: '+15% к скорости при перемещении. Прокачка при каждом ходе ≥1 клетки.',
  },
  ranger_double_tap: {
    id: 'ranger_double_tap',
    label: 'Двойной выстрел',
    semanticEmojiId: 'bow-default',
    classFlavor: 'ranger',
    effectKind: 'proc',
    levelTrigger: 'on_strike',
    procChance: 0.2,
    ops: [{ kind: 'proc_extra_hit', baseChance: 0.2, hits: 1 }],
    synergies: ['multishot'],
    descriptionRu: '20% шанс дополнительного удара при базовой атаке.',
  },
  ranger_far_sight: {
    id: 'ranger_far_sight',
    label: 'Дальний прицел',
    semanticEmojiId: 'target-teal',
    classFlavor: 'ranger',
    effectKind: 'conditional',
    levelTrigger: 'on_move',
    ops: [{ kind: 'range_add', base: 1, scaleMode: 'flat' }],
    synergies: ['power_shot'],
    descriptionRu: '+1 к дальности атаки, если рядом нет врага. Прокачка при перемещении.',
  },

  // §9.4 Healer
  healer_gentle_hands: {
    id: 'healer_gentle_hands',
    label: 'Нежные руки',
    semanticEmojiId: 'heal-red',
    classFlavor: 'healer',
    effectKind: 'stat_flat',
    levelTrigger: 'on_card_heal',
    statId: 'healPower',
    baseFlat: 2,
    ops: [],
    synergies: ['heal'],
    descriptionRu: '+2 к силе исцеления при лечении умением. Прокачка при каждом исцелении.',
  },
  healer_vitality: {
    id: 'healer_vitality',
    label: 'Жизненная сила',
    semanticEmojiId: 'heart-blue',
    classFlavor: 'healer',
    effectKind: 'stat_pct',
    levelTrigger: 'on_regen_tick',
    statId: 'health',
    basePct: 15,
    ops: [],
    synergies: ['regeneration'],
    descriptionRu: '+15% к максимуму HP при тике регенерации. Прокачка при каждом тике.',
  },
  healer_splash_heal: {
    id: 'healer_splash_heal',
    label: 'Перелив',
    semanticEmojiId: 'spark-gold',
    classFlavor: 'healer',
    effectKind: 'proc',
    levelTrigger: 'on_card_heal',
    procChance: 0.2,
    ops: [{ kind: 'heal_splash', splashRatio: 0.5, scaleMode: 'percent' }],
    synergies: ['heal'],
    descriptionRu: '20% шанс исцелить вторую цель на 50% силы при лечении умением.',
  },
  healer_renewal: {
    id: 'healer_renewal',
    label: 'Обновление',
    semanticEmojiId: 'heart-blue',
    classFlavor: 'healer',
    effectKind: 'proc',
    levelTrigger: 'on_regen_tick',
    ops: [{ kind: 'heal_mult', base: 1, scaleMode: 'percent' }],
    synergies: ['regeneration'],
    descriptionRu: 'При тике регенерации: +1 к величине восстановления HP.',
  },

  // §9.5 Rogue
  rogue_precision: {
    id: 'rogue_precision',
    label: 'Точность',
    semanticEmojiId: 'dagger-purple',
    classFlavor: 'rogue',
    effectKind: 'stat_flat',
    levelTrigger: 'on_strike',
    statId: 'critChance',
    baseFlat: 2,
    ops: [],
    synergies: ['backstab'],
    descriptionRu: '+2 к шансу крита при базовой атаке. Прокачка при каждом ударе.',
  },
  rogue_agility: {
    id: 'rogue_agility',
    label: 'Ловкость',
    semanticEmojiId: 'mask-gray',
    classFlavor: 'rogue',
    effectKind: 'stat_pct',
    levelTrigger: 'on_move',
    statId: 'speed',
    basePct: 15,
    ops: [],
    synergies: ['smoke_bomb'],
    descriptionRu: '+15% к скорости при перемещении. Прокачка при каждом ходе ≥1 клетки.',
  },
  rogue_venom: {
    id: 'rogue_venom',
    label: 'Яд на клинке',
    semanticEmojiId: 'drop-green',
    classFlavor: 'rogue',
    effectKind: 'proc',
    levelTrigger: 'on_strike',
    procChance: 0.25,
    ops: [{ kind: 'damage_mult', base: 0.25, scaleMode: 'percent' }],
    synergies: ['poison_blade'],
    descriptionRu: '25% шанс наложить яд при базовой атаке.',
  },
  rogue_smoke_veil: {
    id: 'rogue_smoke_veil',
    label: 'Дымовая завеса',
    semanticEmojiId: 'smoke-gray',
    classFlavor: 'rogue',
    effectKind: 'proc',
    levelTrigger: 'on_damaged',
    procChance: 0.15,
    ops: [{ kind: 'reflect_on_hit', base: 100, scaleMode: 'percent' }],
    synergies: ['smoke_bomb'],
    descriptionRu: '15% шанс полностью уклониться от урона при получении удара.',
  },

  // §9.6 Paladin
  paladin_aegis: {
    id: 'paladin_aegis',
    label: 'Эгида',
    semanticEmojiId: 'shield-gold',
    classFlavor: 'paladin',
    effectKind: 'stat_flat',
    levelTrigger: 'on_damaged',
    statId: 'defense',
    baseFlat: 2,
    ops: [],
    synergies: ['divine_shield'],
    descriptionRu: '+2 к защите при получении урона. Прокачка при каждом полученном уроне.',
  },
  paladin_faith: {
    id: 'paladin_faith',
    label: 'Вера',
    semanticEmojiId: 'heart-gold',
    classFlavor: 'paladin',
    effectKind: 'stat_pct',
    levelTrigger: 'on_card_heal',
    statId: 'healPower',
    basePct: 15,
    ops: [],
    synergies: ['lay_on_hands'],
    descriptionRu: '+15% к силе исцеления при лечении умением. Прокачка при каждом исцелении.',
  },
  paladin_holy_reflect: {
    id: 'paladin_holy_reflect',
    label: 'Святой отпор',
    semanticEmojiId: 'spark-gold',
    classFlavor: 'paladin',
    effectKind: 'conditional',
    levelTrigger: 'on_damaged',
    ops: [{ kind: 'reflect_on_hit', base: 10, scaleMode: 'percent' }],
    synergies: ['holy_strike'],
    descriptionRu: 'Отражает 10% полученного урона атакующему.',
  },
  paladin_intercession: {
    id: 'paladin_intercession',
    label: 'Заступничество',
    semanticEmojiId: 'heart-gold',
    classFlavor: 'paladin',
    effectKind: 'proc',
    levelTrigger: 'on_turn_start',
    procChance: 0.2,
    ops: [
      { kind: 'heal_mult', base: 0.5, scaleMode: 'percent' },
      { kind: 'range_add', base: 2, scaleMode: 'flat' },
    ],
    synergies: ['lay_on_hands'],
    descriptionRu: '20% шанс в начале хода исцелить союзника с HP <50% в радиусе 2.',
  },

  // §9.7 Warlock
  warlock_dark_power: {
    id: 'warlock_dark_power',
    label: 'Тёмная мощь',
    semanticEmojiId: 'orb-purple',
    classFlavor: 'warlock',
    effectKind: 'stat_flat',
    levelTrigger: 'on_card_attack',
    statId: 'magicPower',
    baseFlat: 2,
    ops: [],
    synergies: ['shadow_bolt'],
    descriptionRu: '+2 к силе магии при атаке умением. Прокачка при каждой атаке картой.',
  },
  warlock_soul_harvest: {
    id: 'warlock_soul_harvest',
    label: 'Сбор душ',
    semanticEmojiId: 'skull-purple',
    classFlavor: 'warlock',
    effectKind: 'stat_pct',
    levelTrigger: 'on_kill',
    statId: 'health',
    basePct: 15,
    ops: [],
    synergies: ['corruption'],
    descriptionRu: '+15% к максимуму HP при убийстве врага. Прокачка при каждом убийстве.',
  },
  warlock_spread_plague: {
    id: 'warlock_spread_plague',
    label: 'Чума',
    semanticEmojiId: 'skull-green',
    classFlavor: 'warlock',
    effectKind: 'proc',
    levelTrigger: 'on_kill',
    procChance: 0.2,
    ops: [{ kind: 'aoe_size_add', base: 1, scaleMode: 'flat' }],
    synergies: ['corruption'],
    descriptionRu: '20% шанс распространить DoT на соседних врагов при убийстве.',
  },
  warlock_life_tap: {
    id: 'warlock_life_tap',
    label: 'Кровавый канал',
    semanticEmojiId: 'vampire-purple',
    classFlavor: 'warlock',
    effectKind: 'conditional',
    levelTrigger: 'on_card_attack',
    ops: [{ kind: 'lifesteal_pct', base: 0.08, scaleMode: 'percent' }],
    synergies: ['life_drain'],
    descriptionRu: '8% вампиризма от урона умений. Прокачка при каждой атаке картой.',
  },

  // §9.8 Berserker
  berserker_rage: {
    id: 'berserker_rage',
    label: 'Ярость',
    semanticEmojiId: 'axe-red',
    classFlavor: 'berserker',
    effectKind: 'stat_flat',
    levelTrigger: 'on_strike',
    statId: 'attack',
    baseFlat: 2,
    ops: [],
    synergies: ['frenzy'],
    descriptionRu: '+2 к атаке при базовой атаке. Прокачка при каждом ударе.',
  },
  berserker_bloodlust: {
    id: 'berserker_bloodlust',
    label: 'Кровожадность',
    semanticEmojiId: 'blood-red',
    classFlavor: 'berserker',
    effectKind: 'stat_pct',
    levelTrigger: 'on_damaged',
    statId: 'health',
    basePct: 15,
    ops: [],
    synergies: ['blood_rage'],
    descriptionRu: '+15% к максимуму HP при получении урона. Прокачка при каждом полученном уроне.',
  },
  berserker_twin_cleave: {
    id: 'berserker_twin_cleave',
    label: 'Двойной рассек',
    semanticEmojiId: 'axe-red',
    classFlavor: 'berserker',
    effectKind: 'proc',
    levelTrigger: 'on_strike',
    procChance: 0.2,
    ops: [{ kind: 'proc_extra_hit', baseChance: 0.2, hits: 1 }],
    synergies: ['whirlwind'],
    descriptionRu: '20% шанс дополнительного удара при базовой атаке.',
  },
  berserker_desperation: {
    id: 'berserker_desperation',
    label: 'Отчаяние',
    semanticEmojiId: 'blood-red',
    classFlavor: 'berserker',
    effectKind: 'conditional',
    levelTrigger: 'on_strike',
    ops: [{ kind: 'damage_mult', base: 0.25, scaleMode: 'percent' }],
    synergies: ['blood_rage'],
    descriptionRu: '+25% к урону базовой атаки при HP ниже 50%. Прокачка при каждом ударе.',
  },
}

export const PASSIVE_TEMPLATES: Readonly<Record<string, PassiveTemplate>> = PASSIVE_ENTRIES

export const PASSIVE_TEMPLATE_IDS: readonly string[] = Object.keys(PASSIVE_ENTRIES)

export function getPassiveTemplate(id: string): PassiveTemplate | undefined {
  return PASSIVE_TEMPLATES[id] ?? ENEMY_PASSIVE_TEMPLATES[id]
}
