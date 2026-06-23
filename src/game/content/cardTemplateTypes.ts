import type { StatId } from '../config/baseStats'

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
  label: string
  kind: CardKind
  maxRange: number
  aoeSize?: number
  statSource: StatId
  skillFlat: number
  scaleToken: string
  cooldownTurns?: number
  tags: readonly string[]
  semanticEmojiId: string
  enabled?: boolean
  emoji?: string
}
