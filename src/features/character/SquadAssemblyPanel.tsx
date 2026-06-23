import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Typography } from 'antd'
import {
  findFirstEmptySquadSlotIndex,
  getCharacter,
  getReserveCharacters,
} from '../../game/character/selectors'
import { getCharacterDisplay } from '../../game/character/display'
import { getCharacterClass } from '../../game/content/characterClasses'
import type { CampaignState } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { parseDragId, rosterCharacterDragId, squadSlotDragId } from '../inventory/inventoryDnD'
import { InventoryCell, type InventoryCellState } from '../inventory/InventoryCell'
import { SectionHelp } from '../layout/SectionHelp'
import { SQUAD_SECTION_HELP } from '../campaign/sectionTooltips'
import '../inventory/inventory.css'

export type SquadAssemblyPanelProps = {
  campaign: CampaignState
  disabled?: boolean
  onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
  onSwapSquadSlots: (from: number, to: number) => void
  markedIds?: readonly string[]
  onToggleMark?: (characterId: string) => void
  activeDragId?: string | null
}

function SquadAssemblySlot({
  slotIndex,
  characterId,
  campaign,
  disabled,
  marked,
  onToggleMark,
  onSetSquadSlot,
  activeDragId,
}: {
  slotIndex: number
  characterId: string | null
  campaign: CampaignState
  disabled: boolean
  marked: boolean
  onToggleMark?: (characterId: string) => void
  onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
  activeDragId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: squadSlotDragId(slotIndex),
    disabled,
  })

  const character = characterId !== null ? getCharacter(campaign, characterId) : undefined
  const display = character ? getCharacterDisplay(character) : undefined
  const cls = character ? getCharacterClass(character.classId) : undefined

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id:
      characterId !== null
        ? rosterCharacterDragId(characterId)
        : `squad-empty-drag:${slotIndex}`,
    disabled: disabled || characterId === null,
    data: { characterId },
  })

  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const dragOver = isOver && activeParsed?.kind === 'roster-drag'

  let state: InventoryCellState = 'empty'
  if (disabled) state = 'disabled'
  else if (dragOver) state = 'dragOver'
  else if (character) state = 'filled'

  return (
    <div className="inv-slot-wrap">
      <Typography.Text className="inv-slot-label">Слот {slotIndex + 1}</Typography.Text>
      <div
        ref={(node) => {
          setNodeRef(node)
          setDragRef(node)
        }}
        {...(character && !disabled ? { ...attributes, ...listeners } : {})}
        style={{ opacity: isDragging ? 0.4 : undefined }}
      >
        <InventoryCell
          emoji={display?.emoji ?? (character ? '🧙' : '➕')}
          levelBadge={character ? `${UI_LEVEL}${character.unitLevel}` : undefined}
          state={state}
          className={marked ? 'inv-cell--selected' : undefined}
          ariaLabel={
            character
              ? `${character.name}, ${cls?.label ?? character.classId}`
              : `Пустой слот ${slotIndex + 1}`
          }
          hintText={character ? undefined : 'перетащи'}
          onClick={() => {
            if (disabled) return
            if (characterId !== null) {
              onSetSquadSlot(slotIndex, null)
            }
            if (character && onToggleMark) {
              onToggleMark(character.id)
            }
          }}
        />
      </div>
    </div>
  )
}

function ReserveCell({
  characterId,
  campaign,
  disabled,
  onSetSquadSlot,
}: {
  characterId: string
  campaign: CampaignState
  disabled: boolean
  onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
}) {
  const character = getCharacter(campaign, characterId)
  if (!character) return null
  const display = getCharacterDisplay(character)
  const cls = getCharacterClass(character.classId)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: rosterCharacterDragId(characterId),
    disabled,
    data: { characterId },
  })

  return (
    <div className="inv-slot-wrap">
      <div
        ref={setNodeRef}
        {...(!disabled ? { ...attributes, ...listeners } : {})}
        style={{ opacity: isDragging ? 0.4 : undefined }}
      >
        <InventoryCell
          emoji={display.emoji}
          levelBadge={`${UI_LEVEL}${character.unitLevel}`}
          state={disabled ? 'disabled' : 'filled'}
          ariaLabel={`${character.name}, ${cls?.label ?? character.classId}`}
          onClick={() => {
            if (disabled) return
            const slot = findFirstEmptySquadSlotIndex(campaign.squad)
            if (slot !== null) onSetSquadSlot(slot, characterId)
          }}
        />
      </div>
    </div>
  )
}

export function SquadAssemblyPanel({
  campaign,
  disabled = false,
  onSetSquadSlot,
  markedIds = [],
  onToggleMark,
  activeDragId = null,
}: SquadAssemblyPanelProps) {
  const reserve = getReserveCharacters(campaign)
  const markedSet = new Set(markedIds)

  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        Отряд <SectionHelp content={SQUAD_SECTION_HELP} />
      </Typography.Text>
      <div className="inv-slot-row">
        {campaign.squad.map((characterId, slotIndex) => (
          <SquadAssemblySlot
            key={slotIndex}
            slotIndex={slotIndex}
            characterId={characterId}
            campaign={campaign}
            disabled={disabled}
            marked={characterId !== null && markedSet.has(characterId)}
            onToggleMark={onToggleMark}
            onSetSquadSlot={onSetSquadSlot}
            activeDragId={activeDragId}
          />
        ))}
      </div>
      {reserve.length > 0 ? (
        <>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            Резерв
          </Typography.Text>
          <div className="inv-slot-row" style={{ marginTop: 4 }}>
            {reserve.map((c) => (
              <ReserveCell
                key={c.id}
                characterId={c.id}
                campaign={campaign}
                disabled={disabled}
                onSetSquadSlot={onSetSquadSlot}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
