import { Typography } from 'antd'
import { getCharacter } from '../../game/character/selectors'
import { getCharacterDisplay } from '../../game/character/display'
import { getCharacterClass } from '../../game/content/characterClasses'
import type { CampaignState } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { InventoryCell, type InventoryCellState } from '../inventory/InventoryCell'
import '../inventory/inventory.css'

const HINT_TEXT =
  'Не отмечено — идут все занятые слоты. Отмечено больше лимита — первые N по порядку слотов.'

export type ExpeditionSquadStripProps = {
  campaign: CampaignState
  markedIds: readonly string[]
  disabled?: boolean
  onToggleMark: (characterId: string) => void
}

function ExpeditionSquadCell({
  slotIndex,
  characterId,
  campaign,
  marked,
  disabled,
  onToggleMark,
}: {
  slotIndex: number
  characterId: string | null
  campaign: CampaignState
  marked: boolean
  disabled: boolean
  onToggleMark: (characterId: string) => void
}) {
  const character = characterId !== null ? getCharacter(campaign, characterId) : undefined
  const cls = character ? getCharacterClass(character.classId) : undefined
  const display = character ? getCharacterDisplay(character) : undefined

  let state: InventoryCellState = 'empty'
  if (disabled && character) state = 'disabled'
  else if (character) state = 'filled'

  return (
    <div className="inv-slot-wrap">
      <Typography.Text className="inv-slot-label">Слот {slotIndex + 1}</Typography.Text>
      <InventoryCell
        emoji={display?.emoji ?? (character ? '🧙' : '➕')}
        levelBadge={character ? `${UI_LEVEL}${character.unitLevel}` : undefined}
        state={state}
        className={marked ? 'inv-cell--selected' : undefined}
        ariaLabel={
          character
            ? `${character.name}, ${cls?.label ?? character.classId}${marked ? ', участвует' : ''}`
            : `Пустой слот отряда ${slotIndex + 1}`
        }
        onClick={
          character && !disabled
            ? () => onToggleMark(character.id)
            : undefined
        }
      />
      {character ? (
        <Typography.Text
          type="secondary"
          style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 2 }}
          ellipsis
        >
          {character.name}
        </Typography.Text>
      ) : null}
    </div>
  )
}

export function ExpeditionSquadStrip({
  campaign,
  markedIds,
  disabled = false,
  onToggleMark,
}: ExpeditionSquadStripProps) {
  const markedSet = new Set(markedIds)

  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        Отряд
      </Typography.Text>
      <div className="inv-slot-row">
        {campaign.squad.map((characterId, slotIndex) => (
          <ExpeditionSquadCell
            key={slotIndex}
            slotIndex={slotIndex}
            characterId={characterId}
            campaign={campaign}
            marked={characterId !== null && markedSet.has(characterId)}
            disabled={disabled}
            onToggleMark={onToggleMark}
          />
        ))}
      </div>
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        {HINT_TEXT}
      </Typography.Text>
    </div>
  )
}
