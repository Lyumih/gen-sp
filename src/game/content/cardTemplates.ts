export type CardKind =
  | 'melee'
  | 'ranged'
  | 'aoe'
  | 'heal'
  | 'regen'
  | 'resurrect'
  | 'buff'
  | 'debuff'
  | 'dot'
  | 'lifesteal_spell'
  | 'utility'

export type CardAttackTemplate = {
  /** Отображаемое имя умения для UI. */
  label: string
  kind: CardKind
  /** Для дальнего боя / лечения — лимит манхэттена; для ближнего в бою не используется. */
  maxRange: number
  /** Только для kind === 'aoe': размер квадрата области (3 → 3×3). */
  aoeSize?: number
  damageToken?: string
  fallbackDamage?: number
  healToken?: string
  fallbackHeal?: number
  cooldownTurns?: number
  tags: readonly string[]
  semanticEmojiId: string
  /** When false, skill stays in catalog but is excluded from combat (phase 2). */
  enabled?: boolean
  /** @deprecated use semanticEmojiId */
  emoji?: string
}

export const CARD_ATTACK_TEMPLATES: Readonly<Record<string, CardAttackTemplate>> = {
  /** Action channel only: no card L/modSlots; damage from equipped weapon (or virtual fists). */
  strike: {
    label: 'Сильный удар',
    kind: 'melee',
    maxRange: 1,
    damageToken: '40%%',
    fallbackDamage: 5,
    tags: ['skill', 'attack', 'melee'],
    semanticEmojiId: 'sword-red',
    emoji: '🃏',
  },
  shield_bash: {
    label: 'Удар щитом',
    kind: 'melee',
    maxRange: 1,
    damageToken: '45%%',
    fallbackDamage: 6,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'melee'],
    semanticEmojiId: 'shield-gray',
  },
  cleave: {
    label: 'Рассекающий удар',
    kind: 'aoe',
    maxRange: 1,
    aoeSize: 3,
    damageToken: '50%%',
    fallbackDamage: 8,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'ranged', 'aoe'],
    semanticEmojiId: 'sword-red',
  },
  battle_cry: {
    label: 'Боевой клич',
    kind: 'buff',
    maxRange: 2,
    cooldownTurns: 4,
    tags: ['skill'],
    semanticEmojiId: 'horn-gold',
    enabled: false,
  },
  fireball: {
    label: 'Огненный шар',
    kind: 'aoe',
    maxRange: 3,
    aoeSize: 3,
    damageToken: '50%%',
    fallbackDamage: 8,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'ranged', 'aoe'],
    semanticEmojiId: 'fire-red',
    emoji: '🔥',
  },
  frost_nova: {
    label: 'Ледяная волна',
    kind: 'aoe',
    maxRange: 3,
    aoeSize: 3,
    damageToken: '45%%',
    fallbackDamage: 7,
    cooldownTurns: 4,
    tags: ['skill', 'attack', 'ranged', 'aoe'],
    semanticEmojiId: 'frost-blue',
    enabled: false,
  },
  arcane_bolt: {
    label: 'Чародейский луч',
    kind: 'ranged',
    maxRange: 4,
    damageToken: '55%%',
    fallbackDamage: 9,
    cooldownTurns: 2,
    tags: ['skill', 'attack', 'ranged'],
    semanticEmojiId: 'spark-purple',
  },
  power_shot: {
    label: 'Силовой выстрел',
    kind: 'ranged',
    maxRange: 5,
    damageToken: '60%%',
    fallbackDamage: 10,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'ranged'],
    semanticEmojiId: 'bow-default',
  },
  multishot: {
    label: 'Залп',
    kind: 'aoe',
    maxRange: 4,
    aoeSize: 3,
    damageToken: '45%%',
    fallbackDamage: 7,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'ranged', 'aoe'],
    semanticEmojiId: 'bow-teal',
  },
  snare_trap: {
    label: 'Капкан',
    kind: 'utility',
    maxRange: 4,
    cooldownTurns: 4,
    tags: ['skill'],
    semanticEmojiId: 'trap-gray',
    enabled: false,
  },
  heal: {
    label: 'Исцеление',
    kind: 'heal',
    maxRange: 2,
    healToken: '25%%',
    fallbackHeal: 6,
    cooldownTurns: 4,
    tags: ['skill', 'heal'],
    semanticEmojiId: 'heart-heal',
    emoji: '💚',
  },
  regeneration: {
    label: 'Регенерация',
    kind: 'regen',
    maxRange: 2,
    healToken: '20%%',
    fallbackHeal: 5,
    cooldownTurns: 4,
    tags: ['skill', 'heal'],
    semanticEmojiId: 'heart-blue',
    enabled: false,
  },
  resurrection: {
    label: 'Воскрешение',
    kind: 'resurrect',
    maxRange: 2,
    cooldownTurns: 8,
    tags: ['skill', 'heal'],
    semanticEmojiId: 'spark-gold',
    enabled: false,
  },
  backstab: {
    label: 'Удар в спину',
    kind: 'melee',
    maxRange: 1,
    damageToken: '55%%',
    fallbackDamage: 9,
    cooldownTurns: 2,
    tags: ['skill', 'attack', 'melee'],
    semanticEmojiId: 'dagger-purple',
  },
  poison_blade: {
    label: 'Отравленный клинок',
    kind: 'dot',
    maxRange: 1,
    damageToken: '40%%',
    fallbackDamage: 6,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'ranged'],
    semanticEmojiId: 'drop-green',
    enabled: false,
  },
  smoke_bomb: {
    label: 'Дымовая шашка',
    kind: 'utility',
    maxRange: 3,
    aoeSize: 3,
    cooldownTurns: 4,
    tags: ['skill'],
    semanticEmojiId: 'smoke-gray',
    enabled: false,
  },
  holy_strike: {
    label: 'Святой удар',
    kind: 'melee',
    maxRange: 1,
    damageToken: '50%%',
    fallbackDamage: 8,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'melee'],
    semanticEmojiId: 'spark-gold',
  },
  lay_on_hands: {
    label: 'Возложение рук',
    kind: 'heal',
    maxRange: 2,
    healToken: '40%%',
    fallbackHeal: 10,
    cooldownTurns: 5,
    tags: ['skill', 'heal'],
    semanticEmojiId: 'heart-gold',
  },
  divine_shield: {
    label: 'Божественный щит',
    kind: 'buff',
    maxRange: 1,
    cooldownTurns: 5,
    tags: ['skill'],
    semanticEmojiId: 'shield-gold',
    enabled: false,
  },
  shadow_bolt: {
    label: 'Теневой болт',
    kind: 'ranged',
    maxRange: 4,
    damageToken: '55%%',
    fallbackDamage: 9,
    cooldownTurns: 2,
    tags: ['skill', 'attack', 'ranged'],
    semanticEmojiId: 'orb-purple',
  },
  corruption: {
    label: 'Порча',
    kind: 'dot',
    maxRange: 4,
    damageToken: '40%%',
    fallbackDamage: 6,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'ranged'],
    semanticEmojiId: 'skull-green',
    enabled: false,
  },
  life_drain: {
    label: 'Высасывание жизни',
    kind: 'lifesteal_spell',
    maxRange: 4,
    damageToken: '50%%',
    fallbackDamage: 8,
    cooldownTurns: 3,
    tags: ['skill', 'attack', 'ranged'],
    semanticEmojiId: 'vampire-purple',
    enabled: false,
  },
  frenzy: {
    label: 'Бешенство',
    kind: 'buff',
    maxRange: 1,
    cooldownTurns: 4,
    tags: ['skill'],
    semanticEmojiId: 'axe-red',
    enabled: false,
  },
  blood_rage: {
    label: 'Кровавая ярость',
    kind: 'buff',
    maxRange: 1,
    cooldownTurns: 4,
    tags: ['skill'],
    semanticEmojiId: 'blood-red',
    enabled: false,
  },
  whirlwind: {
    label: 'Вихрь',
    kind: 'aoe',
    maxRange: 1,
    aoeSize: 3,
    damageToken: '50%%',
    fallbackDamage: 8,
    cooldownTurns: 4,
    tags: ['skill', 'attack', 'ranged', 'aoe'],
    semanticEmojiId: 'axe-red',
  },
}

export function getCardAttackTemplate(templateId: string): CardAttackTemplate | undefined {
  return CARD_ATTACK_TEMPLATES[templateId]
}

export function getTemplateCooldownTurns(templateId: string): number {
  return getCardAttackTemplate(templateId)?.cooldownTurns ?? 0
}
