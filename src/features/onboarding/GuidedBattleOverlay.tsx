import { Alert, Button, Typography } from 'antd'
import { GUIDED_TUTORIAL_STEPS } from '../../game/onboarding/guidedTutorial'

export type GuidedBattleOverlayProps = {
  stepIndex: number
  onAck?: () => void
}

export function GuidedBattleOverlay({ stepIndex, onAck }: GuidedBattleOverlayProps) {
  const step = GUIDED_TUTORIAL_STEPS[stepIndex]
  if (!step) return null

  return (
    <Alert
      type="info"
      showIcon
      title="Обучение"
      description={
        <>
          {step.hint}
          <Typography.Text
            type="secondary"
            style={{ display: 'block', fontSize: 12, marginTop: 4 }}
          >
            Автобой отключён на время обучения.
          </Typography.Text>
        </>
      }
      action={
        step.requiresAck && onAck ? (
          <Button size="small" type="primary" onClick={onAck}>
            Понятно
          </Button>
        ) : undefined
      }
      style={{ marginBottom: 8 }}
    />
  )
}

export function isGuidedModeAllowed(
  stepIndex: number,
  mode: 'move' | 'melee' | 'ranged' | 'card',
): boolean {
  const step = GUIDED_TUTORIAL_STEPS[stepIndex]
  if (!step) return true
  if (mode === 'ranged') return false
  if (step.allowedModes.length === 0) return false
  if (mode === 'card') return step.allowedModes.includes('card')
  return step.allowedModes.includes(mode)
}
