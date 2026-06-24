import { Button, Modal, Space, Typography } from 'antd'

export type OnboardingCoachModalProps = {
  open: boolean
  title: string
  text: string
  onNext: () => void
  onSkipAll: () => void
}

export function OnboardingCoachModal({
  open,
  title,
  text,
  onNext,
  onSkipAll,
}: OnboardingCoachModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onSkipAll}
      footer={
        <Space>
          <Button type="primary" onClick={onNext}>
            Далее
          </Button>
          <Button type="text" onClick={onSkipAll}>
            Пропустить обучение
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph style={{ marginBottom: 0 }}>{text}</Typography.Paragraph>
    </Modal>
  )
}
