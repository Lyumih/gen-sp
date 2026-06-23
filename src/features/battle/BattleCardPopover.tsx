import type { ReactNode } from 'react'
import { Popover, Typography } from 'antd'
import { describeCardCombatStats, getCardDisplayLabel } from '../../game/descriptions/cardText'
import { describeCardModSummary } from '../../game/descriptions/modText'
import type { BattlePlayerCard, CampaignState, Character, Unit } from '../../game/types'

type BattleCardPopoverProps = {
  card: BattlePlayerCard
  character: Character
  campaign: CampaignState
  actor?: Unit
  children: ReactNode
}

function cardDetailLines(
  card: BattlePlayerCard,
  character: Character,
  campaign: CampaignState,
  actor?: Unit,
): string[] {
  const desc = describeCardCombatStats(card, character, campaign, actor)
  const modSummary = describeCardModSummary(card.modSlots)
  if (!modSummary) return desc.lines
  return [...desc.lines, `Моды: ${modSummary}`]
}

export function BattleCardPopover({
  card,
  character,
  campaign,
  actor,
  children,
}: BattleCardPopoverProps) {
  const lines = cardDetailLines(card, character, campaign, actor)

  const content = (
    <div style={{ maxWidth: 320 }}>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {getCardDisplayLabel(card.templateId)}
      </Typography.Text>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {lines.map((line, index) => (
          <li key={index}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <Popover trigger="hover" mouseEnterDelay={0.3} destroyOnHidden content={content}>
      {children}
    </Popover>
  )
}
