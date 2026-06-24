import { Button, Modal, Space, Typography } from 'antd'
import { WELCOME_COPY } from '../../game/onboarding/copy'

export type WelcomeModalProps = {
  open: boolean
  onStart: () => void
  onSkip: () => void
}

export function WelcomeModal({ open, onStart, onSkip }: WelcomeModalProps) {
  return (
    <Modal
      open={open}
      title={WELCOME_COPY.title}
      footer={null}
      closable={false}
      maskClosable={false}
    >
      {WELCOME_COPY.paragraphs.map((paragraph) => (
        <Typography.Paragraph key={paragraph}>{paragraph}</Typography.Paragraph>
      ))}
      <Space>
        <Button type="primary" onClick={onStart}>
          {WELCOME_COPY.primaryCta}
        </Button>
        <Button type="text" onClick={onSkip}>
          {WELCOME_COPY.skipCta}
        </Button>
      </Space>
    </Modal>
  )
}
