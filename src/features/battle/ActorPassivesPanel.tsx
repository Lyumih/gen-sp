import { Typography } from 'antd'
import { describePassiveStats } from '../../game/descriptions/passiveText'
import { getPassiveTemplate } from '../../game/content/passiveTemplates'
import { resolvePassiveEmoji } from '../inventory/inventoryEmoji'
import { InventoryCell } from '../inventory/InventoryCell'
import type { CampaignState, Character, PassiveInstance } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'

export function ActorPassivesPanel(props: {
  passives: readonly PassiveInstance[]
  character: Character | undefined
  campaign: CampaignState
}) {
  const { passives, character, campaign } = props
  if (!character || passives.length === 0) return null
  return (
    <div>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
        Пассивные навыки
      </Typography.Text>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {passives.map((p) => {
          const stats = describePassiveStats(p, character, campaign)
          const tmpl = getPassiveTemplate(p.templateId)
          const popover = (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {stats.lines.map((line, i) => (
                <li key={i}>
                  <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
                </li>
              ))}
            </ul>
          )
          return (
            <InventoryCell
              key={p.id}
              emoji={resolvePassiveEmoji(tmpl)}
              levelBadge={`${UI_LEVEL}${p.global_level}`}
              state="filled"
              popoverTitle={stats.displayLabel}
              popoverContent={popover}
              popoverTrigger={['hover', 'click']}
              ariaLabel={`${stats.displayLabel}, ${UI_LEVEL}${p.global_level}`}
            />
          )
        })}
      </div>
    </div>
  )
}
