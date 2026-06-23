import { getCardAttackTemplate } from '../content/cardTemplates'
import { getItemTemplate } from '../content/itemTemplates'
import { getPassiveTemplate, type PassiveTemplate } from '../content/passiveTemplates'

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
  'passive',
  'stat_flat',
  'stat_pct',
  'proc',
  'on_move',
  'on_damaged',
  'on_regen_tick',
  'heal_proc',
  'counter_proc',
  'reflect',
  'lifesteal',
  'range_passive',
])

function derivePassiveCarrierTags(template: PassiveTemplate): readonly string[] {
  const tags = new Set<string>(['passive'])

  if (template.effectKind === 'stat_flat') tags.add('stat_flat')
  if (template.effectKind === 'stat_pct') tags.add('stat_pct')
  if (template.effectKind === 'proc') tags.add('proc')

  tags.add(template.levelTrigger)

  for (const op of template.ops) {
    if (op.kind === 'heal_splash') tags.add('heal_proc')
    if (op.kind === 'proc_extra_hit' && template.levelTrigger === 'on_damaged') {
      tags.add('counter_proc')
    }
    if (op.kind === 'reflect_on_hit' && op.base < 50) tags.add('reflect')
    if (op.kind === 'lifesteal_pct') tags.add('lifesteal')
    if (op.kind === 'range_add') tags.add('range_passive')
  }

  if (template.effectKind === 'conditional') {
    tags.add('proc')
    for (const op of template.ops) {
      if (op.kind === 'reflect_on_hit' && op.base < 50) tags.add('reflect')
      if (op.kind === 'lifesteal_pct') tags.add('lifesteal')
      if (op.kind === 'range_add') tags.add('range_passive')
    }
  }

  return [...tags]
}

function explicitCarrierTags(tags: readonly string[]): readonly string[] | null {
  if (tags.length === 0) return null
  const carrier = tags.filter((t) => CARRIER_TAG_IDS.has(t))
  if (carrier.length === 0) return null
  return [...new Set(carrier)]
}

/** Carrier taxonomy tags for mod offer filtering. Strike has no mod slots. */
export function resolveCarrierTags(
  kind: 'card' | 'item' | 'passive',
  templateId: string,
): readonly string[] {
  if (kind === 'passive') {
    const tmpl = getPassiveTemplate(templateId)
    if (!tmpl) return []
    return derivePassiveCarrierTags(tmpl)
  }

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
