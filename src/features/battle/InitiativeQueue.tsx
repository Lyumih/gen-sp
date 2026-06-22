import { Typography } from 'antd'
import type { Unit } from '../../game/types'

type InitiativeQueueProps = {
  turnOrder: readonly string[]
  currentActorId: string | undefined
  units: readonly Unit[]
  unitLabel?: (unitId: string) => string
}

function defaultLabel(units: readonly Unit[], unitId: string): string {
  const unit = units.find((u) => u.id === unitId)
  if (!unit) return unitId
  if (unit.side === 'player') return '🛡️'
  return '👾'
}

export function InitiativeQueue({
  turnOrder,
  currentActorId,
  units,
  unitLabel,
}: InitiativeQueueProps) {
  const labelFor = unitLabel ?? ((id) => defaultLabel(units, id))

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
        const glyph = labelFor(unitId)

        return (
          <span key={`${unitId}-${index}`} role="listitem">
            <Typography.Text
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12,
                border: isCurrent ? '2px solid #1677ff' : '1px solid #d9d9d9',
                background: isCurrent ? '#e6f4ff' : isDead ? '#f5f5f5' : '#fff',
                opacity: isDead ? 0.45 : 1,
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              {glyph}
              <span>{unitId}</span>
            </Typography.Text>
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
