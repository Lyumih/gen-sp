import { getPassiveTemplate } from '../content/passiveTemplates'
import type { PassiveEquipLoadout, PassiveInstance } from '../types'

export function getEquippedPassives(
  passives: readonly PassiveInstance[],
  passiveEquip: PassiveEquipLoadout,
): PassiveInstance[] {
  return passiveEquip
    .filter((id): id is string => id !== null)
    .map((id) => passives.find((p) => p.id === id))
    .filter((p): p is PassiveInstance => p !== undefined)
}

export function canEquipPassive(
  passives: readonly PassiveInstance[],
  passiveEquip: PassiveEquipLoadout,
  passiveId: string,
  slotIndex: 0 | 1 | 2 | 3 | 4,
): { ok: true } | { ok: false; reason: string } {
  const passive = passives.find((p) => p.id === passiveId)
  if (!passive) return { ok: false, reason: 'not_owned' }

  const template = getPassiveTemplate(passive.templateId)
  if (!template) return { ok: false, reason: 'unknown_template' }

  const nextEquip: PassiveEquipLoadout = [...passiveEquip]
  nextEquip[slotIndex] = passiveId
  for (let i = 0; i < 5; i++) {
    if (i !== slotIndex && nextEquip[i] === passiveId) nextEquip[i] = null
  }

  const equipped = getEquippedPassives(passives, nextEquip)

  if (template.effectKind === 'stat_flat' || template.effectKind === 'stat_pct') {
    const statId = template.statId
    if (statId) {
      for (const other of equipped) {
        if (other.id === passiveId) continue
        const otherTemplate = getPassiveTemplate(other.templateId)
        if (!otherTemplate) continue
        if (
          otherTemplate.effectKind === template.effectKind &&
          otherTemplate.statId === statId
        ) {
          return { ok: false, reason: 'stat_stack_conflict' }
        }
      }
    }
  }

  return { ok: true }
}
