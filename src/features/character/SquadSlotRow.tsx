import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Button, Tag, Typography } from 'antd'
import { getCharacter } from '../../game/character/selectors'
import { getCharacterDisplay } from '../../game/character/display'
import { getCharacterClass } from '../../game/content/characterClasses'
import type { CampaignState } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { parseDragId, rosterCharacterDragId, squadSlotDragId } from '../inventory/inventoryDnD'
import { InventoryCell, type InventoryCellState } from '../inventory/InventoryCell'
import '../inventory/inventory.css'

type SquadSlotRowProps = {
  campaign: CampaignState
  selectedCharacterId: string
  squadLocked: boolean
  activeDragId: string | null
  onSelectCharacter: (characterId: string) => void
  onRemoveFromSquad: (characterId: string) => void
}

function SquadSlotCell({
  slotIndex,
  characterId,
  campaign,
  selectedCharacterId,
  squadLocked,
  activeDragId,
  onSelectCharacter,
  onRemoveFromSquad,
}: {
  slotIndex: number
  characterId: string | null
  campaign: CampaignState
  selectedCharacterId: string
  squadLocked: boolean
  activeDragId: string | null
  onSelectCharacter: (characterId: string) => void
  onRemoveFromSquad: (characterId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: squadSlotDragId(slotIndex),
    disabled: squadLocked,
  })

  const character = characterId !== null ? getCharacter(campaign, characterId) : undefined
  const cls = character ? getCharacterClass(character.classId) : undefined
  const display = character ? getCharacterDisplay(character) : undefined

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id:
      characterId !== null
        ? rosterCharacterDragId(characterId)
        : `squad-empty-drag:${slotIndex}`,
    disabled: squadLocked || characterId === null,
    data: { characterId },
  })

  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const dragOver = isOver && activeParsed?.kind === 'roster-drag'

  let state: InventoryCellState = 'empty'
  if (squadLocked) state = 'disabled'
  else if (dragOver) state = 'dragOver'
  else if (character) state = 'filled'

  const selected = characterId !== null && characterId === selectedCharacterId

  return (
    <div className="inv-slot-wrap">
      <Typography.Text className="inv-slot-label">Слот {slotIndex + 1}</Typography.Text>
      <div
        ref={(node) => {
          setNodeRef(node)
          setDragRef(node)
        }}
        {...(character && !squadLocked ? { ...attributes, ...listeners } : {})}
        style={{
          outline: selected ? '2px solid #1677ff' : undefined,
          borderRadius: 4,
          opacity: isDragging ? 0.4 : undefined,
        }}
      >
        <InventoryCell
          emoji={display?.emoji ?? (character ? '🧙' : '➕')}
          levelBadge={character ? `${UI_LEVEL}${character.unitLevel}` : undefined}
          state={state}
          ariaLabel={
            character
              ? `${character.name}, ${cls?.label ?? character.classId}`
              : `Пустой слот отряда ${slotIndex + 1}`
          }
          hintText={character ? undefined : 'перетащи'}
          onClick={() => {
            if (characterId !== null) onSelectCharacter(characterId)
          }}
        />
      </div>
      {character ? (
        <>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 2 }}
            ellipsis
          >
            {character.name}
          </Typography.Text>
          {!squadLocked ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11, height: 'auto' }}
              onClick={(e) => {
                e.stopPropagation()
                onRemoveFromSquad(character.id)
              }}
            >
              Снять
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function SquadSlotRow({
  campaign,
  selectedCharacterId,
  squadLocked,
  activeDragId,
  onSelectCharacter,
  onRemoveFromSquad,
}: SquadSlotRowProps) {
  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        Отряд{' '}
        {squadLocked ? (
          <Tag color="orange" style={{ marginInlineStart: 4 }}>
            заморожен
          </Tag>
        ) : null}
      </Typography.Text>
      <div className="inv-slot-row">
        {campaign.squad.map((characterId, slotIndex) => (
          <SquadSlotCell
            key={slotIndex}
            slotIndex={slotIndex}
            characterId={characterId}
            campaign={campaign}
            selectedCharacterId={selectedCharacterId}
            squadLocked={squadLocked}
            activeDragId={activeDragId}
            onSelectCharacter={onSelectCharacter}
            onRemoveFromSquad={onRemoveFromSquad}
          />
        ))}
      </div>
    </div>
  )
}
