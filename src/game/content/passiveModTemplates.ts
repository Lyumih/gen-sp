import type { ModTemplate } from './modTemplates'

export const PASSIVE_MOD_SPEC_IDS = [
  'pmod-flat-up',
  'pmod-pct-up',
  'pmod-proc-up',
  'pmod-move-range',
  'pmod-heal-splash-up',
  'pmod-counter-up',
  'pmod-regen-up',
  'pmod-reflect-up',
  'pmod-lifesteal-up',
  'pmod-range-up',
  'pmod-thorns',
  'pmod-initiative',
] as const

export type PassiveModId = (typeof PASSIVE_MOD_SPEC_IDS)[number]

const PASSIVE_MOD_ENTRIES: Record<PassiveModId, ModTemplate> = {
  'pmod-flat-up': {
    id: 'pmod-flat-up',
    label: 'Усиление flat-бонуса',
    emoji: '📈',
    group: 'utility',
    tags: ['passive', 'stat_flat'],
    requires: ['stat_flat'],
    descriptionLines: ['+10% к flat-бонусу пассива. Сила растёт с Lm.'],
    ops: [{ kind: 'damage_mult', base: 0.1, scaleMode: 'percent' }],
  },
  'pmod-pct-up': {
    id: 'pmod-pct-up',
    label: 'Усиление pct-бонуса',
    emoji: '📊',
    group: 'utility',
    tags: ['passive', 'stat_pct'],
    requires: ['stat_pct'],
    descriptionLines: ['+10% к pct-бонусу пассива. Сила растёт с Lm.'],
    ops: [{ kind: 'heal_mult', base: 0.1, scaleMode: 'percent' }],
  },
  'pmod-proc-up': {
    id: 'pmod-proc-up',
    label: 'Надёжный proc',
    emoji: '🎲',
    group: 'utility',
    tags: ['passive', 'proc'],
    requires: ['proc'],
    descriptionLines: ['+5% к шансу proc. Сила растёт с Lm.'],
    ops: [{ kind: 'crit_chance_add', base: 0.05, scaleMode: 'percent' }],
  },
  'pmod-move-range': {
    id: 'pmod-move-range',
    label: 'Дальний шаг',
    emoji: '👟',
    group: 'utility',
    tags: ['passive', 'on_move'],
    requires: ['on_move'],
    descriptionLines: ['+1 к дальности хода. Сила растёт с Lm.'],
    ops: [{ kind: 'range_add', base: 1, scaleMode: 'flat' }],
  },
  'pmod-heal-splash-up': {
    id: 'pmod-heal-splash-up',
    label: 'Широкий перелив',
    emoji: '💚',
    group: 'survival',
    tags: ['passive', 'heal_proc'],
    requires: ['heal_proc'],
    descriptionLines: ['+10% к splash heal. Сила растёт с Lm.'],
    ops: [{ kind: 'heal_splash', splashRatio: 0.1, scaleMode: 'percent' }],
  },
  'pmod-counter-up': {
    id: 'pmod-counter-up',
    label: 'Жёсткий ответ',
    emoji: '⚔️',
    group: 'damage',
    tags: ['passive', 'counter_proc'],
    requires: ['counter_proc'],
    descriptionLines: ['+15% урона контрудара. Сила растёт с Lm.'],
    ops: [{ kind: 'damage_mult', base: 0.15, scaleMode: 'percent' }],
  },
  'pmod-regen-up': {
    id: 'pmod-regen-up',
    label: 'Сильная регенерация',
    emoji: '💙',
    group: 'survival',
    tags: ['passive', 'on_regen_tick'],
    requires: ['on_regen_tick'],
    descriptionLines: ['+1 к величине regen tick. Сила растёт с Lm.'],
    ops: [{ kind: 'heal_mult', base: 1, scaleMode: 'percent' }],
  },
  'pmod-reflect-up': {
    id: 'pmod-reflect-up',
    label: 'Зеркальный щит',
    emoji: '🪞',
    group: 'defense',
    tags: ['passive', 'reflect'],
    requires: ['reflect'],
    descriptionLines: ['+5% отражения урона. Сила растёт с Lm.'],
    ops: [{ kind: 'reflect_on_hit', base: 0.05, scaleMode: 'percent' }],
  },
  'pmod-lifesteal-up': {
    id: 'pmod-lifesteal-up',
    label: 'Кровавый поток',
    emoji: '🧛',
    group: 'survival',
    tags: ['passive', 'lifesteal'],
    requires: ['lifesteal'],
    descriptionLines: ['+3% вампиризма. Сила растёт с Lm.'],
    ops: [{ kind: 'lifesteal_pct', base: 0.03, scaleMode: 'percent' }],
  },
  'pmod-range-up': {
    id: 'pmod-range-up',
    label: 'Дальний прицел',
    emoji: '🎯',
    group: 'utility',
    tags: ['passive', 'range_passive'],
    requires: ['range_passive'],
    descriptionLines: ['+1 к дальности пассива. Сила растёт с Lm.'],
    ops: [{ kind: 'range_add', base: 1, scaleMode: 'flat' }],
  },
  'pmod-thorns': {
    id: 'pmod-thorns',
    label: 'Шипы',
    emoji: '🌵',
    group: 'defense',
    tags: ['passive', 'on_damaged'],
    requires: ['on_damaged'],
    descriptionLines: ['5% урона атакующему при получении удара. Сила растёт с Lm.'],
    ops: [{ kind: 'reflect_on_hit', base: 0.05, scaleMode: 'percent' }],
  },
  'pmod-initiative': {
    id: 'pmod-initiative',
    label: 'Рывок',
    emoji: '⚡',
    group: 'utility',
    tags: ['passive'],
    requires: ['passive'],
    descriptionLines: ['+2 к инициативе. Сила растёт с Lm.'],
    ops: [{ kind: 'initiative_add', base: 2, scaleMode: 'flat' }],
  },
}

export const PASSIVE_MOD_TEMPLATES: readonly ModTemplate[] = PASSIVE_MOD_SPEC_IDS.map(
  (id) => PASSIVE_MOD_ENTRIES[id],
)

export const PASSIVE_MOD_OFFER_POOL: readonly ModTemplate[] = PASSIVE_MOD_TEMPLATES.filter(
  (mod) => mod.enabled !== false,
)

export function getPassiveModTemplate(id: string): ModTemplate | undefined {
  return PASSIVE_MOD_ENTRIES[id as PassiveModId]
}
