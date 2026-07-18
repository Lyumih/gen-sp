import { App, Button, Checkbox, Modal, Space, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { getCharacterDisplay } from '../../game/character/display'
import { getCharacter } from '../../game/character/selectors'
import { getCharacterClass } from '../../game/content/characterClasses'
import type { ExpeditionChainConfig } from '../../game/expedition/config'
import { getOccupiedSquadCharacterIds } from '../../game/expedition/resolveExpeditionParty'
import type { CampaignState } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { getSemanticEmoji } from '../../game/ui/semanticEmoji'

export type ExpeditionPartyPickModalProps = {
  open: boolean
  chain: ExpeditionChainConfig
  campaign: CampaignState
  maxParty: number
  onCancel: () => void
  onConfirm: (selectedCharacterIds: string[]) => void
}

function sortSelectedBySquadOrder(
  squad: readonly (string | null)[],
  selected: readonly string[],
): string[] {
  const selectedSet = new Set(selected)
  const ordered: string[] = []
  for (const id of squad) {
    if (id !== null && selectedSet.has(id)) {
      ordered.push(id)
    }
  }
  return ordered
}

export function ExpeditionPartyPickModal({
  open,
  chain,
  campaign,
  maxParty,
  onCancel,
  onConfirm,
}: ExpeditionPartyPickModalProps) {
  const { message } = App.useApp()
  const occupiedIds = useMemo(
    () => getOccupiedSquadCharacterIds(campaign.squad),
    [campaign.squad],
  )
  const defaultSelected = useMemo(
    () => occupiedIds.slice(0, maxParty),
    [occupiedIds, maxParty],
  )
  const [selected, setSelected] = useState<string[]>(defaultSelected)

  useEffect(() => {
    if (open) {
      setSelected(defaultSelected)
    }
  }, [open, defaultSelected])

  const handleToggle = (characterId: string, checked: boolean) => {
    if (checked) {
      if (selected.length >= maxParty) {
        message.warning(`Можно выбрать не более ${maxParty} бойцов`)
        return
      }
      setSelected((prev) => [...prev, characterId])
    } else {
      setSelected((prev) => prev.filter((id) => id !== characterId))
    }
  }

  const handleConfirm = () => {
    onConfirm(sortSelectedBySquadOrder(campaign.squad, selected))
  }

  return (
    <Modal
      title={`${chain.label} — выберите до ${maxParty} бойцов`}
      open={open}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>Отмена</Button>
          <Button type="primary" disabled={selected.length < 1} onClick={handleConfirm}>
            Начать
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        {occupiedIds.map((characterId) => {
          const character = getCharacter(campaign, characterId)
          if (!character) return null

          const cls = getCharacterClass(character.classId)
          const display = getCharacterDisplay(character)
          const classEmoji = cls
            ? (getSemanticEmoji(cls.semanticEmojiId)?.base ?? '🧙')
            : '🧙'

          return (
            <Checkbox
              key={characterId}
              checked={selected.includes(characterId)}
              onChange={(e) => handleToggle(characterId, e.target.checked)}
            >
              <Typography.Text>
                {classEmoji} {display.name} {UI_LEVEL}
                {character.unitLevel}
              </Typography.Text>
            </Checkbox>
          )
        })}
      </Space>
    </Modal>
  )
}
