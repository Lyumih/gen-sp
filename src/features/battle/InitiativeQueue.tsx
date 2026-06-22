import { Typography } from 'antd'
import { getUnitDisplay } from '../../game/character/display'
import type { CampaignState, Unit } from '../../game/types'
import { UnitToken } from './UnitToken'

type InitiativeQueueProps = {
  turnOrder: readonly string[]
  currentActorId: string | undefined
  units: readonly Unit[]
  campaign: CampaignState
  highlightedUnitId?: string | null
  onHighlight?: (unitId: string | null) => void
}

export function InitiativeQueue({
  turnOrder,
  currentActorId,
  units,
  campaign,
  highlightedUnitId,
  onHighlight,
}: InitiativeQueueProps) {
  if (turnOrder.length === 0) {
    return <Typography.Text type="secondary">Очередь пуста</Typography.Text>
  }

  return (
    <div
      role="list"
      aria-label="Очередь инициативы"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
      }}
    >
      {turnOrder.map((unitId, index) => {
        const unit = units.find((u) => u.id === unitId)
        const isCurrent = unitId === currentActorId
        const isDead = unit !== undefined && unit.hp <= 0
        const display = unit
          ? getUnitDisplay(unit, campaign)
          : { name: unitId, emoji: '❓', accent: 'default' as const }

        return (
          <span key={`${unitId}-${index}`} role="listitem">
            <UnitToken
              display={display}
              variant="initiative"
              isCurrentActor={isCurrent}
              isDead={isDead}
              highlighted={highlightedUnitId === unitId}
              onMouseEnter={() => onHighlight?.(unitId)}
              onMouseLeave={() => onHighlight?.(null)}
            />
            {index < turnOrder.length - 1 ? (
              <Typography.Text type="secondary" style={{ margin: '0 2px', fontSize: 11 }}>
                →
              </Typography.Text>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}