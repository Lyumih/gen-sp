export type CardAttackTemplate = {
  /** Отображаемое имя умения для UI. */
  label: string
  kind: 'melee' | 'ranged' | 'aoe' | 'heal'
  /** Для дальнего боя / лечения — лимит манхэттена; для ближнего в бою не используется. */
  maxRange: number
  /** Только для kind === 'aoe': размер квадрата области (3 → 3×3). */
  aoeSize?: number
  damageToken?: string
  fallbackDamage?: number
  healToken?: string
  fallbackHeal?: number
  cooldownTurns?: number
  emoji?: string
}

export const CARD_ATTACK_TEMPLATES: Readonly<Record<string, CardAttackTemplate>> = {
  /** Action channel only: no card L/modSlots; damage from equipped weapon (or virtual fists). */
  strike: {
    label: 'Удар',
    kind: 'melee',
    maxRange: 1,
    damageToken: '40%%',
    fallbackDamage: 5,
    emoji: '🃏',
  },
  fireball: {
    label: 'Огненный шар',
    kind: 'aoe',
    maxRange: 3,
    aoeSize: 3,
    damageToken: '50%%',
    fallbackDamage: 8,
    cooldownTurns: 3,
    emoji: '🔥',
  },
  heal: {
    label: 'Исцеление',
    kind: 'heal',
    maxRange: 2,
    healToken: '25%%',
    fallbackHeal: 6,
    cooldownTurns: 4,
    emoji: '💚',
  },
}

export function getCardAttackTemplate(templateId: string): CardAttackTemplate | undefined {
  return CARD_ATTACK_TEMPLATES[templateId]
}

export function getTemplateCooldownTurns(templateId: string): number {
  return getCardAttackTemplate(templateId)?.cooldownTurns ?? 0
}
