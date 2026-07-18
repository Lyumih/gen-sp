import { Alert, List, Typography } from 'antd'
import { MILESTONE_DEFINITIONS } from '../../game/milestones/definitions'
import type { CampaignState } from '../../game/types'

export type MilestoneChecklistProps = {
  campaign: CampaignState
}

export function MilestoneChecklist({ campaign }: MilestoneChecklistProps) {
  const onboarding = campaign.onboarding
  if (!onboarding.graduated && !onboarding.skipMode) return null

  const completed = new Set(campaign.completedMilestones)
  const firstOpenIndex = MILESTONE_DEFINITIONS.findIndex((m) => !completed.has(m.id))

  return (
    <Alert
      type="info"
      showIcon
      title="Цели"
      description={
        <List
          size="small"
          dataSource={[...MILESTONE_DEFINITIONS]}
          renderItem={(milestone, index) => {
            const done = completed.has(milestone.id)
            const active = !done && index === firstOpenIndex
            return (
              <List.Item style={{ padding: '2px 0', border: 'none' }}>
                <Typography.Text
                  delete={done}
                  strong={active}
                  type={done ? 'secondary' : undefined}
                >
                  {done ? '✓ ' : active ? '→ ' : '○ '}
                  {milestone.label}
                </Typography.Text>
              </List.Item>
            )
          }}
        />
      }
    />
  )
}
