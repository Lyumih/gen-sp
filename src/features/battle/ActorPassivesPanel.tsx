import { List, Popover, Typography } from 'antd'
import { describePassiveStats, getPassiveDisplayLabel } from '../../game/descriptions/passiveText'
import { getPassiveTemplate } from '../../game/content/passiveTemplates'
import { resolvePassiveEmoji } from '../inventory/inventoryEmoji'
import type { CampaignState, Character, PassiveInstance } from '../../game/types'

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
      <List
        size="small"
        dataSource={[...passives]}
        renderItem={(p) => {
          const stats = describePassiveStats(p, character, campaign)
          const tmpl = getPassiveTemplate(p.templateId)
          const summary = stats.lines[0] ?? ''
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
            <List.Item style={{ padding: '4px 0' }}>
              <Popover content={popover} trigger="hover" mouseEnterDelay={0.3}>
                <span style={{ fontSize: 12, cursor: 'default' }}>
                  {resolvePassiveEmoji(tmpl)} {getPassiveDisplayLabel(p.templateId)} — {summary}
                </span>
              </Popover>
            </List.Item>
          )
        }}
      />
    </div>
  )
}
