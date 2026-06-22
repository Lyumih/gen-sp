import { Modal } from 'antd'
import { getActiveCharacter } from '../../game/character/selectors'
import { HeroProfileContent } from './HeroProfileContent'
import type { HeroProfileModalProps } from './HeroProfileModal.types'

export type { HeroProfileModalProps } from './HeroProfileModal.types'

export function HeroProfileModal({
  open,
  onClose,
  mode,
  campaign,
  battle,
}: HeroProfileModalProps) {
  return (
    <Modal
      title="Профиль героя"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <HeroProfileContent
        mode={mode}
        campaign={campaign}
        battle={battle}
        characterId={getActiveCharacter(campaign).id}
      />
    </Modal>
  )
}
