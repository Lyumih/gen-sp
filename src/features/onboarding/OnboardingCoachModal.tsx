import { Button, Modal, Space, Typography } from 'antd'
import type { CoachMarkVariant } from '../../game/onboarding/coachMarks'

export type OnboardingCoachModalProps = {
  open: boolean
  title: string
  text: string
  variant?: CoachMarkVariant
  onNext: () => void
  onSkipAll: () => void
}

export function OnboardingCoachModal({
  open,
  title,
  text,
  variant = 'onboarding',
  onNext,
  onSkipAll,
}: OnboardingCoachModalProps) {
  const isHint = variant === 'hint'

  return (
    <Modal
      open={open}
      title={title}
      onCancel={isHint ? onNext : onSkipAll}
      footer={
        isHint ? (
          <Button type="primary" onClick={onNext}>
            Понятно
          </Button>
        ) : (
          <Space>
            <Button type="primary" onClick={onNext}>
              Далее
            </Button>
            <Button type="text" onClick={onSkipAll}>
              Пропустить обучение
            </Button>
          </Space>
        )
      }
    >
      <Typography.Paragraph style={{ marginBottom: 0 }}>{text}</Typography.Paragraph>
    </Modal>
  )
}
