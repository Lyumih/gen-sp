import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { describeCardCombatStats, getCardDisplayLabel } from '../../game/descriptions/cardText'
import { resolveCarrierTags } from '../../game/mods/carrierTags'
import { applyCooldownMods, applyManaCostMods } from '../../game/mods/modPipeline'
import type { BattlePlayerCard, CampaignState, Character, Unit } from '../../game/types'
import { UI_COOLDOWN, UI_DAMAGE, UI_HEART, UI_LEVEL, UI_MANA } from '../../game/ui/labels'
import { InventoryCell } from '../inventory/InventoryCell'
import { resolveCardEmoji } from '../inventory/inventoryEmoji'
import { BattleCardPopover } from './BattleCardPopover'

export type BattleSkillCellProps = {
  card: BattlePlayerCard
  character: Character
  campaign: CampaignState
  actor?: Unit
  selected: boolean
  disabled: boolean
  onSelect: () => void
}

export function BattleSkillCell({
  card,
  character,
  campaign,
  actor,
  selected,
  disabled,
  onSelect,
}: BattleSkillCellProps) {
  const tmpl = getCardAttackTemplate(card.templateId)
  const stats = describeCardCombatStats(card, character, campaign, actor)
  const effectUi = tmpl?.kind === 'heal' ? UI_HEART : UI_DAMAGE
  const onCd = card.cooldownRemaining > 0
  const label = getCardDisplayLabel(card.templateId)
  const effectPart =
    stats.expectedDamage !== null ? `${effectUi}${stats.expectedDamage}` : ''
  const modCtx = {
    carrierTags: resolveCarrierTags('card', card.templateId),
    modSlots: card.modSlots,
    rng: () => 50,
  }
  const effectiveManaCost = tmpl ? applyManaCostMods(tmpl.manaCost, modCtx) : null
  const effectiveCd = tmpl ? applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx) : 0
  const cdDisplay = card.cooldownRemaining > 0 ? card.cooldownRemaining : effectiveCd
  const badge = [
    effectPart,
    effectiveManaCost !== null ? `${UI_MANA}${effectiveManaCost}` : '',
    tmpl ? `${UI_COOLDOWN}${cdDisplay}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const ariaLabel = `${label}, ${UI_LEVEL}${card.global_level}${badge ? `, ${badge}` : ''}`

  return (
    <BattleCardPopover card={card} character={character} campaign={campaign} actor={actor}>
      <InventoryCell
        emoji={resolveCardEmoji(tmpl)}
        levelBadge={`${UI_LEVEL}${card.global_level}`}
        contextBadge={badge || undefined}
        state={disabled || onCd ? 'disabled' : 'filled'}
        className={selected ? 'inv-cell--selected' : undefined}
        ariaLabel={ariaLabel}
        onClick={() => {
          if (disabled || onCd) return
          onSelect()
        }}
      />
    </BattleCardPopover>
  )
}
