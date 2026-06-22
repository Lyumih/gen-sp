import { getCardAttackTemplate } from '../content/cardTemplates'
import { getItemTemplate } from '../content/itemTemplates'

/** Carrier taxonomy tags for mod offer filtering. Strike has no mod slots. */
export function resolveCarrierTags(
  kind: 'card' | 'item',
  templateId: string,
): readonly string[] {
  if (kind === 'card') {
    if (templateId === 'strike') return []
    const tmpl = getCardAttackTemplate(templateId)
    if (!tmpl) return []

    const tags: string[] = ['skill']
    if (tmpl.kind === 'heal') {
      tags.push('heal')
      return tags
    }

    if (tmpl.kind === 'ranged' || tmpl.kind === 'aoe') tags.push('ranged')
    if (tmpl.kind === 'aoe') tags.push('aoe')
    tags.push('attack')
    if (tmpl.kind === 'melee') tags.push('melee')
    return tags
  }

  const item = getItemTemplate(templateId)
  if (!item) return []

  const tags: string[] = [item.slot]
  if (item.slot === 'weapon') {
    tags.push('attack', 'melee')
  }
  return tags
}
