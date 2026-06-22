export const DEFAULT_MOD_KILL_TEMPLATE_ID = 'kill_reward'

export type ModScaleMode = 'percent' | 'flat'

export type ModOp =
  | { kind: 'damage_mult'; base: number; scaleMode: 'percent' }
  | { kind: 'heal_mult'; base: number; scaleMode: 'percent' }
  | { kind: 'range_add'; base: number; scaleMode: 'flat' }
  | { kind: 'cooldown_add'; base: number; scaleMode: 'flat' }
  | { kind: 'aoe_size_add'; base: number; scaleMode: 'flat' }
  | { kind: 'crit_chance_add'; base: number; scaleMode: 'percent' }
  | { kind: 'carrier_hp_add'; base: number; scaleMode: 'flat' }
  | { kind: 'defense_add'; base: number; scaleMode: 'flat' }
  | { kind: 'initiative_add'; base: number; scaleMode: 'flat' }
  | { kind: 'self_heal_on_use'; base: number; scaleMode: 'percent' }
  | { kind: 'lifesteal_pct'; base: number; scaleMode: 'percent' }
  | { kind: 'proc_extra_hit'; baseChance: number; hits: number }
  | { kind: 'reflect_on_hit'; base: number; scaleMode: 'percent' }
  | { kind: 'self_heal_on_damaged'; base: number; scaleMode: 'percent' }
  | { kind: 'aoe_center_damage_mult'; base: number; scaleMode: 'percent' }
  | { kind: 'heal_splash'; splashRatio: number; scaleMode: 'percent' }
  | { kind: 'mana_cost_mult'; base: number; scaleMode: 'percent' }

export type ModGroup = 'damage' | 'survival' | 'utility' | 'defense'

export type ModTemplate = {
  id: string
  label: string
  emoji?: string
  group: ModGroup
  tags: readonly string[]
  requires: readonly string[]
  excludes?: readonly string[]
  descriptionLines: readonly string[]
  ops: readonly ModOp[]
  /** When false, mod stays in catalog but is excluded from offer pool (phase 2). */
  enabled?: boolean
}

/** All spec §4.3 mod ids (including phase-2 entries). */
export const SPEC_MOD_IDS = [
  'mod-damage-up',
  'mod-heal-up',
  'mod-range-up',
  'mod-aoe-range-up',
  'mod-melee-reach',
  'mod-cooldown-down',
  'mod-aoe-size',
  'mod-crit-chance',
  'mod-hp-bonus-armor',
  'mod-hp-bonus-accessory',
  'mod-armor-bonus',
  'mod-weapon-damage',
  'mod-mana-save',
  'mod-initiative',
  'mod-self-heal-on-use',
  'mod-self-heal-on-attack',
  'mod-lifesteal',
  'mod-double-strike',
  'mod-triple-strike',
  'mod-thorns',
  'mod-heal-on-hit-taken',
  'mod-accessory-regen',
  'mod-aoe-center-bonus',
  'mod-ally-heal-splash',
] as const

export type SpecModId = (typeof SPEC_MOD_IDS)[number]

const MVP_MODS: Record<SpecModId, ModTemplate> = {
  'mod-damage-up': {
    id: 'mod-damage-up',
    label: 'Усиление урона',
    emoji: '💥',
    group: 'damage',
    tags: ['attack'],
    requires: ['attack'],
    descriptionLines: ['+50% к урону умения или атаки. Сила растёт с Lm.'],
    ops: [{ kind: 'damage_mult', base: 0.5, scaleMode: 'percent' }],
  },
  'mod-heal-up': {
    id: 'mod-heal-up',
    label: 'Усиление лечения',
    emoji: '💚',
    group: 'survival',
    tags: ['heal'],
    requires: ['heal'],
    descriptionLines: ['+50% к исцелению. Сила растёт с Lm.'],
    ops: [{ kind: 'heal_mult', base: 0.5, scaleMode: 'percent' }],
  },
  'mod-range-up': {
    id: 'mod-range-up',
    label: 'Дальнобойность',
    emoji: '🎯',
    group: 'utility',
    tags: ['ranged'],
    requires: ['ranged'],
    descriptionLines: ['+1 клетка к дальности. Сила растёт с Lm.'],
    ops: [{ kind: 'range_add', base: 1, scaleMode: 'flat' }],
  },
  'mod-aoe-range-up': {
    id: 'mod-aoe-range-up',
    label: 'Дальняя волна',
    emoji: '🌊',
    group: 'utility',
    tags: ['aoe'],
    requires: ['aoe'],
    descriptionLines: ['+1 клетка к дальности AoE-умения. Сила растёт с Lm.'],
    ops: [{ kind: 'range_add', base: 1, scaleMode: 'flat' }],
  },
  'mod-melee-reach': {
    id: 'mod-melee-reach',
    label: 'Длинная рука',
    emoji: '🤜',
    group: 'utility',
    tags: ['melee'],
    requires: ['melee'],
    descriptionLines: ['+1 клетка к дальности ближней атаки. Сила растёт с Lm.'],
    ops: [{ kind: 'range_add', base: 1, scaleMode: 'flat' }],
  },
  'mod-cooldown-down': {
    id: 'mod-cooldown-down',
    label: 'Быстрая перезарядка',
    emoji: '⏱️',
    group: 'utility',
    tags: ['skill'],
    requires: ['skill'],
    descriptionLines: ['−1 к перезарядке (минимум 0). Сила растёт с Lm.'],
    ops: [{ kind: 'cooldown_add', base: -1, scaleMode: 'flat' }],
  },
  'mod-aoe-size': {
    id: 'mod-aoe-size',
    label: 'Широкий охват',
    emoji: '💫',
    group: 'utility',
    tags: ['aoe'],
    requires: ['aoe'],
    descriptionLines: ['+1 к размеру области. Сила растёт с Lm.'],
    ops: [{ kind: 'aoe_size_add', base: 1, scaleMode: 'flat' }],
  },
  'mod-crit-chance': {
    id: 'mod-crit-chance',
    label: 'Критический удар',
    emoji: '🎯',
    group: 'damage',
    tags: ['attack'],
    requires: ['attack'],
    descriptionLines: ['+15% шанс критического удара. Сила растёт с Lm.'],
    ops: [{ kind: 'crit_chance_add', base: 0.15, scaleMode: 'percent' }],
  },
  'mod-hp-bonus-armor': {
    id: 'mod-hp-bonus-armor',
    label: 'Запас прочности',
    emoji: '❤️',
    group: 'defense',
    tags: ['armor'],
    requires: ['armor'],
    descriptionLines: ['+3 maxHp носителю. Сила растёт с Lm.'],
    ops: [{ kind: 'carrier_hp_add', base: 3, scaleMode: 'flat' }],
  },
  'mod-hp-bonus-accessory': {
    id: 'mod-hp-bonus-accessory',
    label: 'Живучесть',
    emoji: '💪',
    group: 'defense',
    tags: ['accessory'],
    requires: ['accessory'],
    descriptionLines: ['+3 maxHp носителю. Сила растёт с Lm.'],
    ops: [{ kind: 'carrier_hp_add', base: 3, scaleMode: 'flat' }],
  },
  'mod-armor-bonus': {
    id: 'mod-armor-bonus',
    label: 'Укрепление',
    emoji: '🛡',
    group: 'defense',
    tags: ['armor'],
    requires: ['armor'],
    descriptionLines: ['+1 к защите. Сила растёт с Lm.'],
    ops: [{ kind: 'defense_add', base: 1, scaleMode: 'flat' }],
  },
  'mod-weapon-damage': {
    id: 'mod-weapon-damage',
    label: 'Острая сталь',
    emoji: '⚔️',
    group: 'damage',
    tags: ['weapon', 'attack'],
    requires: ['weapon'],
    descriptionLines: ['+40% к урону оружия. Сила растёт с Lm.'],
    ops: [{ kind: 'damage_mult', base: 0.4, scaleMode: 'percent' }],
  },
  'mod-mana-save': {
    id: 'mod-mana-save',
    label: 'Экономия маны',
    emoji: '🔮',
    group: 'utility',
    tags: ['skill'],
    requires: ['skill'],
    enabled: false,
    descriptionLines: ['−20% к стоимости маны (фаза 2, когда мана в бою).'],
    ops: [{ kind: 'mana_cost_mult', base: -0.2, scaleMode: 'percent' }],
  },
  'mod-initiative': {
    id: 'mod-initiative',
    label: 'Рывок',
    emoji: '⚡',
    group: 'utility',
    tags: ['accessory'],
    requires: ['accessory'],
    descriptionLines: ['+2 к инициативе. Сила растёт с Lm.'],
    ops: [{ kind: 'initiative_add', base: 2, scaleMode: 'flat' }],
  },
  'mod-self-heal-on-use': {
    id: 'mod-self-heal-on-use',
    label: 'Жизненная сила',
    emoji: '💖',
    group: 'survival',
    tags: ['skill'],
    requires: ['skill'],
    descriptionLines: [
      'После применения умения: исцелить носителя на round(5 × (1 + Lm/100)) HP.',
    ],
    ops: [{ kind: 'self_heal_on_use', base: 5, scaleMode: 'percent' }],
  },
  'mod-self-heal-on-attack': {
    id: 'mod-self-heal-on-attack',
    label: 'Кровожадность',
    emoji: '🩸',
    group: 'survival',
    tags: ['attack'],
    requires: ['attack'],
    descriptionLines: [
      'После базовой атаки: исцелить носителя на round(5 × (1 + Lm/100)) HP.',
    ],
    ops: [{ kind: 'self_heal_on_use', base: 5, scaleMode: 'percent' }],
  },
  'mod-lifesteal': {
    id: 'mod-lifesteal',
    label: 'Вампиризм',
    emoji: '🧛',
    group: 'survival',
    tags: ['attack'],
    requires: ['attack'],
    descriptionLines: ['20% нанесённого урона возвращается как HP. Сила растёт с Lm.'],
    ops: [{ kind: 'lifesteal_pct', base: 0.2, scaleMode: 'percent' }],
  },
  'mod-double-strike': {
    id: 'mod-double-strike',
    label: 'Двойной удар',
    emoji: '⚡',
    group: 'damage',
    tags: ['attack'],
    requires: ['attack'],
    descriptionLines: ['25% шанс второго удара; независимо от тройного.'],
    ops: [{ kind: 'proc_extra_hit', baseChance: 0.25, hits: 1 }],
  },
  'mod-triple-strike': {
    id: 'mod-triple-strike',
    label: 'Тройной удар',
    emoji: '✨',
    group: 'damage',
    tags: ['attack'],
    requires: ['attack'],
    descriptionLines: ['10% шанс дополнительных ударов; независимо от двойного.'],
    ops: [{ kind: 'proc_extra_hit', baseChance: 0.1, hits: 2 }],
  },
  'mod-thorns': {
    id: 'mod-thorns',
    label: 'Шипы',
    emoji: '🌵',
    group: 'defense',
    tags: ['armor'],
    requires: ['armor'],
    descriptionLines: [
      'При получении удара: round(3 × (1 + Lm/100)) урона атакующему.',
    ],
    ops: [{ kind: 'reflect_on_hit', base: 3, scaleMode: 'percent' }],
  },
  'mod-heal-on-hit-taken': {
    id: 'mod-heal-on-hit-taken',
    label: 'Регенерация',
    emoji: '🔄',
    group: 'survival',
    tags: ['armor'],
    requires: ['armor'],
    descriptionLines: [
      'При получении урона: +round(3 × (1 + Lm/100)) HP.',
    ],
    ops: [{ kind: 'self_heal_on_damaged', base: 3, scaleMode: 'percent' }],
  },
  'mod-accessory-regen': {
    id: 'mod-accessory-regen',
    label: 'Ободок стойкости',
    emoji: '💍',
    group: 'survival',
    tags: ['accessory'],
    requires: ['accessory'],
    descriptionLines: [
      'При получении урона: +round(3 × (1 + Lm/100)) HP.',
    ],
    ops: [{ kind: 'self_heal_on_damaged', base: 3, scaleMode: 'percent' }],
  },
  'mod-aoe-center-bonus': {
    id: 'mod-aoe-center-bonus',
    label: 'Центр взрыва',
    emoji: '💢',
    group: 'damage',
    tags: ['aoe'],
    requires: ['aoe'],
    descriptionLines: ['+100% урона по центральной клетке. Сила растёт с Lm.'],
    ops: [{ kind: 'aoe_center_damage_mult', base: 1, scaleMode: 'percent' }],
  },
  'mod-ally-heal-splash': {
    id: 'mod-ally-heal-splash',
    label: 'Окружение светом',
    emoji: '✨',
    group: 'survival',
    tags: ['heal'],
    requires: ['heal'],
    descriptionLines: ['50% лечения переходит соседу в радиусе 1. Сила растёт с Lm.'],
    ops: [{ kind: 'heal_splash', splashRatio: 0.5, scaleMode: 'percent' }],
  },
}

export const MOD_TEMPLATES: Readonly<Record<string, ModTemplate>> = {
  ...MVP_MODS,
  kill_reward: {
    id: 'kill_reward',
    label: 'Очки за убийство',
    emoji: '⚔️',
    group: 'utility',
    tags: [],
    requires: [],
    descriptionLines: [
      'Начисляет очки первой модификации карты за каждого побеждённого врага.',
    ],
    ops: [],
    enabled: false,
  },
}

/** Enabled MVP mods for offer generation (excludes legacy kill_reward and phase-2 entries). */
export const MOD_OFFER_POOL: readonly ModTemplate[] = Object.values(MVP_MODS).filter(
  (mod) => mod.enabled !== false,
)

export function getModTemplate(id: string): ModTemplate | undefined {
  return MOD_TEMPLATES[id]
}
