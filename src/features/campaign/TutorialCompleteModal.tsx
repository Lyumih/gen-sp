import { Button, Modal, Space, Typography } from 'antd'
import { TUTORIAL_COMPLETE_COPY } from '../../game/onboarding/copy'

export type TutorialCompleteModalProps = {
  open: boolean
  onClose: () => void
  onGoTrials?: () => void
}

export function TutorialCompleteModal({
  open,
  onClose,
  onGoTrials,
}: TutorialCompleteModalProps) {
  return (
    <Modal
      open={open}
      title={TUTORIAL_COMPLETE_COPY.title}
      onCancel={onClose}
      footer={
        <Space>
          <Button
            type="primary"
            onClick={() => {
              onGoTrials?.()
              onClose()
            }}
          >
            {TUTORIAL_COMPLETE_COPY.trialsCta}
          </Button>
          <Button onClick={onClose}>{TUTORIAL_COMPLETE_COPY.laterCta}</Button>
        </Space>
      }
    >
      {TUTORIAL_COMPLETE_COPY.bullets.map((line) => (
        <Typography.Paragraph key={line} style={{ marginBottom: 8 }}>
          {line}
        </Typography.Paragraph>
      ))}
    </Modal>
  )
}
