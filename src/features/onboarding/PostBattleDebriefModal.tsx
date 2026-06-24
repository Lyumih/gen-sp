import { Button, Modal, Space, Typography } from 'antd'
import {
  FIRST_DEFEAT_DEBRIEF,
  FIRST_VICTORY_DEBRIEF,
} from '../../game/onboarding/copy'

export type PostBattleDebriefModalProps = {
  kind: 'first_victory' | 'first_defeat'
  open: boolean
  onClose: () => void
  onGoShop?: () => void
}

export function PostBattleDebriefModal({
  kind,
  open,
  onClose,
  onGoShop,
}: PostBattleDebriefModalProps) {
  const copy = kind === 'first_victory' ? FIRST_VICTORY_DEBRIEF : FIRST_DEFEAT_DEBRIEF

  return (
    <Modal
      open={open}
      title={copy.title}
      onCancel={onClose}
      footer={
        kind === 'first_victory' ? (
          <Space>
            <Button
              type="primary"
              onClick={() => {
                onGoShop?.()
                onClose()
              }}
            >
              {FIRST_VICTORY_DEBRIEF.shopCta}
            </Button>
            <Button onClick={onClose}>{FIRST_VICTORY_DEBRIEF.okCta}</Button>
          </Space>
        ) : (
          <Button type="primary" onClick={onClose}>
            {FIRST_DEFEAT_DEBRIEF.okCta}
          </Button>
        )
      }
    >
      {copy.bullets.map((line) => (
        <Typography.Paragraph key={line} style={{ marginBottom: 8 }}>
          {line}
        </Typography.Paragraph>
      ))}
    </Modal>
  )
}
