import { Tooltip, Typography } from 'antd'
import { BASE_STAT_IDS } from '../../game/config/baseStats'
import { BASE_STAT_META } from '../../game/config/baseStats'
import { formatBaseStatRatingPercent } from '../../game/stats/computeRating'
import { UI_RATING } from '../../game/ui/labels'
import type { BaseStats } from '../../game/types'
import { ratingTooltipLines, statTooltipLines } from './statTooltipText'

export type StatStripProps = {
  baseStats: BaseStats
  effectiveStats?: BaseStats
  baseStatRating?: number
  showRating?: boolean
  className?: string
}

export function StatStrip({
  baseStats,
  effectiveStats,
  baseStatRating,
  showRating = false,
  className,
}: StatStripProps) {
  const ratingPercent =
    baseStatRating !== undefined ? formatBaseStatRatingPercent(baseStatRating) : null

  return (
    <Typography.Text
      type="secondary"
      className={className}
      style={{ fontSize: 12, display: 'inline-block', lineHeight: 1.6 }}
    >
      {BASE_STAT_IDS.map((id) => {
        const meta = BASE_STAT_META[id]
        const baseValue = baseStats[id]
        const effectiveValue = effectiveStats?.[id]
        return (
          <Tooltip
            key={id}
            title={statTooltipLines(id, baseValue, effectiveValue).join('\n')}
            mouseEnterDelay={0.3}
          >
            <span style={{ marginRight: 6, cursor: 'default' }}>
              {meta.emoji}
              {baseValue}
            </span>
          </Tooltip>
        )
      })}
      {showRating && ratingPercent !== null && baseStatRating !== undefined ? (
        <>
          <span> · </span>
          <Tooltip
            title={ratingTooltipLines(baseStatRating, ratingPercent).join('\n')}
            mouseEnterDelay={0.3}
          >
            <span style={{ cursor: 'default' }}>
              {UI_RATING}
              {ratingPercent}
            </span>
          </Tooltip>
        </>
      ) : null}
    </Typography.Text>
  )
}
