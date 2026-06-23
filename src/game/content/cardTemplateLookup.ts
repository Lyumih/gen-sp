import type { CardAttackTemplate } from './cardTemplateTypes'
import { CARD_ATTACK_TEMPLATES } from './cardTemplates'
import { getMonsterSkillTemplate } from './monsterSkillTemplates'

export function getCardAttackTemplate(templateId: string): CardAttackTemplate | undefined {
  return CARD_ATTACK_TEMPLATES[templateId] ?? getMonsterSkillTemplate(templateId)
}

export function getTemplateCooldownTurns(templateId: string): number {
  return getCardAttackTemplate(templateId)?.cooldownTurns ?? 0
}

export function isCardTemplateEnabled(templateId: string): boolean {
  const t = getCardAttackTemplate(templateId)
  if (!t) return false
  return t.enabled !== false
}
