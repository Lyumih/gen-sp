import { getCardAttackTemplate } from '../content/cardTemplates'
import { getItemTemplate } from '../content/itemTemplates'

const CARRIER_TAG_IDS = new Set([
  'skill',
  'attack',
  'melee',
  'ranged',
  'aoe',
  'heal',
  'weapon',
  'armor',
  'accessory',
  'regen',
  'resurrect',
  'dot',
  'buff',
  'debuff',
])

function explicitCarrierTags(tags: readonly string[]): readonly string[] | null {
  if (tags.length === 0) return null
  const carrier = tags.filter((t) => CARRIER_TAG_IDS.has(t))
  if (carrier.length === 0) return null
  return [...new Set(carrier)]
}

/** Carrier taxonomy tags for mod offer filtering. Strike has no mod slots. */
export function resolveCarrierTags(
  kind: 'card' | 'item',
  templateId: string,
): readonly string[] {
  if (kind === 'card') {
    if (templateId === 'strike') return []
    const tmpl = getCardAttackTemplate(templateId)
    if (!tmpl) return []

    const fromTags = explicitCarrierTags(tmpl.tags)
    if (fromTags) {
      const result = [...fromTags]
      if (!result.includes('skill')) result.unshift('skill')
      return result
    }

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

  const fromTags = item.tags ? explicitCarrierTags(item.tags) : null
  if (fromTags) return fromTags

  const tags: string[] = [item.slot]
  if (item.slot === 'weapon') {
    tags.push('attack', 'melee')
  }
  return tags
}
