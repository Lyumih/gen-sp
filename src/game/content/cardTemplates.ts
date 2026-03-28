export type CardAttackTemplate = {
  kind: 'melee' | 'ranged'
  /** Для дальнего боя — лимит манхэттена; для ближнего в бою не используется. */
  maxRange: number
  damageToken?: string
  fallbackDamage: number
}

export const CARD_ATTACK_TEMPLATES: Readonly<Record<string, CardAttackTemplate>> = {
  strike: {
    kind: 'melee',
    maxRange: 1,
    damageToken: '40%%',
    fallbackDamage: 5,
  },
}

export function getCardAttackTemplate(templateId: string): CardAttackTemplate | undefined {
  return CARD_ATTACK_TEMPLATES[templateId]
}
