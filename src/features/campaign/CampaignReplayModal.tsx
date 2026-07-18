import { Button, Modal, Select, Space } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'

export type CampaignReplayModalProps = {
  open: boolean
  replaySlot: number
  onReplaySlotChange: (slot: number) => void
  onCancel: () => void
  onConfirm: () => void
}

export function CampaignReplayModal({
  open,
  replaySlot,
  onReplaySlotChange,
  onCancel,
  onConfirm,
}: CampaignReplayModalProps) {
  return (
    <Modal
      title="Повтор сценария"
      open={open}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>Отмена</Button>
          <Button type="primary" onClick={onConfirm}>
            Играть
          </Button>
        </Space>
      }
    >
      <Select
        aria-label="Сценарий для повтора"
        style={{ width: '100%' }}
        value={replaySlot}
        onChange={onReplaySlotChange}
        options={SCENARIOS.map((s, i) => ({ value: i, label: s.id }))}
      />
    </Modal>
  )
}
