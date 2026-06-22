import type { CampaignState, Character, IconAccentId, IconSkinToneId, Unit } from '../types'
import { getCharacter } from '../campaign/selectors'
import { renderEmojiWithSkinTone } from './iconCatalog'

export type UnitDisplay = {
  name: string
  emoji: string
  accent: IconAccentId
  skinTone?: IconSkinToneId
}

export function getCharacterDisplay(character: Character): UnitDisplay {
  return {
    name: character.name,
    emoji: renderEmojiWithSkinTone(character.iconEmoji, character.iconSkinTone),
    accent: character.iconAccent,
    skinTone: character.iconSkinTone,
  }
}

export function getUnitDisplay(unit: Unit, campaign: CampaignState | null): UnitDisplay {
  if (unit.side === 'player') {
    const character = campaign ? getCharacter(campaign, unit.id) : undefined
    if (character) return getCharacterDisplay(character)
    return { name: unit.id, emoji: '🛡️', accent: 'default', skinTone: 'default' }
  }
  return {
    name: unit.displayName ?? unit.id,
    emoji: unit.iconEmoji ?? '👾',
    accent: unit.iconAccent ?? 'default',
  }
}
