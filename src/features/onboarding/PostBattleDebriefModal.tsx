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
  onGoHelp?: () => void
}

export function PostBattleDebriefModal({
  kind,
  open,
  onClose,
  onGoShop,
  onGoHelp,
}: PostBattleDebriefModalProps) {
  const copy = kind === 'first_victory' ? FIRST_VICTORY_DEBRIEF : FIRST_DEFEAT_DEBRIEF
  const helpLinkLabel =
    kind === 'first_victory'
      ? FIRST_VICTORY_DEBRIEF.helpLinkLabel
      : FIRST_DEFEAT_DEBRIEF.helpLinkLabel

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
      {onGoHelp ? (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={onGoHelp}>
          {helpLinkLabel}
        </Button>
      ) : null}
    </Modal>
  )
}
