import { Select, Space, Typography } from 'antd'
import { getCharacter } from '../../game/character/selectors'
import { getCharacterClass } from '../../game/content/characterClasses'
import type { CampaignState } from '../../game/types'

type SquadPickerProps = {
  campaign: CampaignState
  slotCount: number
  requiredCount: number
  selectedIds: readonly (string | null)[]
  disabled?: boolean
  onChange: (selectedIds: (string | null)[]) => void
}

export function SquadPicker({
  campaign,
  slotCount,
  requiredCount,
  selectedIds,
  disabled = false,
  onChange,
}: SquadPickerProps) {
  const rosterTooSmall = campaign.characters.length < requiredCount
  const pickedSet = new Set(selectedIds.filter((id): id is string => id !== null))

  const setSlot = (slotIndex: number, characterId: string | null) => {
    const next = [...selectedIds]
    while (next.length < slotCount) next.push(null)
    next[slotIndex] = characterId
    onChange(next.slice(0, slotCount))
  }

  return (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <Typography.Text strong>Отряд expedition ({requiredCount} бойцов)</Typography.Text>

      {rosterTooSmall ? (
        <Typography.Text type="danger">
          Недостаточно персонажей в roster: нужно минимум {requiredCount}, сейчас{' '}
          {campaign.characters.length}
        </Typography.Text>
      ) : null}

      <Space wrap style={{ width: '100%' }}>
        {Array.from({ length: slotCount }, (_, slotIndex) => {
          const value = selectedIds[slotIndex] ?? null
          const usedElsewhere = new Set(
            selectedIds.filter((id, i): id is string => i !== slotIndex && id !== null),
          )

          return (
            <Select
              key={slotIndex}
              aria-label={`Слот отряда ${slotIndex + 1}`}
              style={{ minWidth: 180 }}
              disabled={disabled || rosterTooSmall}
              placeholder={`Слот ${slotIndex + 1}`}
              allowClear
              value={value}
              onChange={(next) => setSlot(slotIndex, next ?? null)}
              options={campaign.characters
                .filter((c) => !usedElsewhere.has(c.id) || c.id === value)
                .map((c) => {
                  const cls = getCharacterClass(c.classId)
                  return {
                    value: c.id,
                    label: `${c.name} (${cls?.label ?? c.classId})`,
                  }
                })}
            />
          )
        })}
      </Space>

      {!rosterTooSmall && pickedSet.size < requiredCount ? (
        <Typography.Text type="secondary">
          Выберите {requiredCount} персонаж{requiredCount === 1 ? 'а' : 'ей'} для старта
        </Typography.Text>
      ) : null}

      {selectedIds.some((id) => id !== null && !getCharacter(campaign, id)) ? (
        <Typography.Text type="warning">Один из выбранных персонажей недоступен</Typography.Text>
      ) : null}
    </Space>
  )
}
