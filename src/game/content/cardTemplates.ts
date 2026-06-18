export type CardAttackTemplate = {
  /** Отображаемое имя умения для UI. */
  label: string
  kind: 'melee' | 'ranged'
  /** Для дальнего боя — лимит манхэттена; для ближнего в бою не используется. */
  maxRange: number
  damageToken?: string
  fallbackDamage: number
  emoji?: string
}

export const CARD_ATTACK_TEMPLATES: Readonly<Record<string, CardAttackTemplate>> = {
  strike: {
    label: 'Удар',
    kind: 'melee',
    maxRange: 1,
    damageToken: '40%%',
    fallbackDamage: 5,
    emoji: '🃏',
  },
}

export function getCardAttackTemplate(templateId: string): CardAttackTemplate | undefined {
  return CARD_ATTACK_TEMPLATES[templateId]
}
