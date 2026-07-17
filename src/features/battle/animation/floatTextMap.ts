import type { UnitStatusKind } from '../../../game/battle/unitStatus'
import {
  UI_ATTACK,
  UI_DAMAGE,
  UI_DEBUFF,
  UI_DEFENSE,
  UI_DOT,
  UI_HEAL,
  UI_HEART,
  UI_MAGIC,
  UI_ROOTED,
} from '../../../game/ui/labels'

export type FloatVariant = 'damage' | 'heal' | 'absorb' | 'buff' | 'debuff'

export type FloatLine = {
  text: string
  variant: FloatVariant
  delayMs?: number
}

export const FLOAT_ABSORB_STAGGER_MS = 100

const STATUS_EMOJI: Partial<Record<UnitStatusKind, string>> = {
  attack_up: UI_ATTACK,
  defense_up: UI_DEFENSE,
  defense_down: UI_DEFENSE,
  card_damage_up: UI_DAMAGE,
  regen: UI_HEAL,
  elemental_resist: UI_MAGIC,
  dot: UI_DOT,
  rooted: UI_ROOTED,
  damage_reduction: UI_DEFENSE,
}

export function statusKindEmoji(statusKind: string, polarity: 'buff' | 'debuff'): string {
  const mapped = STATUS_EMOJI[statusKind as UnitStatusKind]
  if (mapped) return mapped
  return polarity === 'buff' ? UI_MAGIC : UI_DEBUFF
}

export function formatDamageFloat(damage: number, absorbedDamage?: number): FloatLine[] {
  const lines: FloatLine[] = [
    { text: `-${damage} ${UI_DAMAGE}`, variant: 'damage' },
  ]
  if (absorbedDamage !== undefined && absorbedDamage > 0) {
    lines.push({
      text: `(${absorbedDamage} ${UI_DEFENSE})`,
      variant: 'absorb',
      delayMs: FLOAT_ABSORB_STAGGER_MS,
    })
  }
  return lines
}

export function formatHealFloat(amount: number): FloatLine[] {
  return [{ text: `+${amount} ${UI_HEART}`, variant: 'heal' }]
}

export function formatStatusFloat(statusKind: string, polarity: 'buff' | 'debuff'): FloatLine[] {
  return [{
    text: statusKindEmoji(statusKind, polarity),
    variant: polarity === 'buff' ? 'buff' : 'debuff',
  }]
}
