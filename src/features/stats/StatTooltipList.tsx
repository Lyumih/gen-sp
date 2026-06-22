import { Typography } from 'antd'
import { BASE_STAT_IDS } from '../../game/config/baseStats'
import type { BaseStats } from '../../game/types'
import { statTooltipLines } from './statTooltipText'

type StatTooltipListProps = {
  baseStats: BaseStats
  effectiveStats?: BaseStats
}

export function StatTooltipList({ baseStats, effectiveStats }: StatTooltipListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {BASE_STAT_IDS.map((statId) => {
        const lines = statTooltipLines(
          statId,
          baseStats[statId],
          effectiveStats?.[statId],
        )
        return (
          <div key={statId}>
            {lines.map((line, i) => (
              <Typography.Text
                key={i}
                type={i === 0 ? undefined : 'secondary'}
                style={{ display: 'block', fontSize: i === 0 ? 13 : 12 }}
              >
                {line}
              </Typography.Text>
            ))}
          </div>
        )
      })}
    </div>
  )
}
