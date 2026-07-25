import type { RefObject } from 'react'
import { Typography } from 'antd'
import type { BattleLogEntry, Side } from '../../game/types'
import type { BattleLogUnitLookup } from '../../game/battle/battleLog'
import { BattleLogLine } from './BattleLogLine'

export function BattleLogPanel(props: {
  entries: readonly BattleLogEntry[]
  unitSideLookup: (unitId: string) => Side | undefined
  unitLogLookup?: BattleLogUnitLookup
  logEndRef: RefObject<HTMLDivElement | null>
}) {
  const { entries, unitSideLookup, unitLogLookup, logEndRef } = props
  return (
    <div className="game-battle-log game-panel">
      <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        Журнал боя
      </Typography.Text>
      <div
        style={{
          maxHeight: 280,
          overflowY: 'auto',
          padding: 8,
          background: '#fafafa',
          border: '1px solid #eee',
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        {entries.length === 0 ? (
          <Typography.Text type="secondary">Пока пусто</Typography.Text>
        ) : (
          entries.map((entry, i) => (
            <BattleLogLine
              key={i}
              entry={entry}
              unitSideLookup={unitSideLookup}
              unitLogLookup={unitLogLookup}
            />
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}
