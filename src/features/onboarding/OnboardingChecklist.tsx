import { Alert, List, Typography } from 'antd'
import { hasCompletedStep } from '../../game/onboarding/onboardingState'
import { ONBOARDING_STEPS } from '../../game/onboarding/steps'
import { isOnboardingActive } from '../../game/onboarding/selectors'
import type { CampaignState } from '../../game/types'

export type OnboardingChecklistProps = {
  campaign: CampaignState
}

export function OnboardingChecklist({ campaign }: OnboardingChecklistProps) {
  const onboarding = campaign.onboarding
  if (!isOnboardingActive(onboarding)) return null

  const firstOpenIndex = ONBOARDING_STEPS.findIndex(
    (step) => !hasCompletedStep(onboarding, step.id),
  )

  return (
    <Alert
      type="info"
      showIcon
      title="Цели"
      description={
        <List
          size="small"
          dataSource={[...ONBOARDING_STEPS]}
          renderItem={(step, index) => {
            const done = hasCompletedStep(onboarding, step.id)
            const active = !done && index === firstOpenIndex
            return (
              <List.Item style={{ padding: '2px 0', border: 'none' }}>
                <Typography.Text
                  delete={done}
                  strong={active}
                  type={done ? 'secondary' : undefined}
                >
                  {done ? '✓ ' : active ? '→ ' : '○ '}
                  {step.label}
                </Typography.Text>
              </List.Item>
            )
          }}
        />
      }
    />
  )
}
