import { useDraggable, useDroppable } from '@dnd-kit/core'
import { List, Tag, Typography } from 'antd'
import { getCharacter, getReserveCharacters } from '../../game/character/selectors'
import { getCharacterClass } from '../../game/content/characterClasses'
import type { CampaignState, Character } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { parseDragId, rosterCharacterDragId, rosterCharacterDropId } from '../inventory/inventoryDnD'

type CharacterRosterViewProps = {
  campaign: CampaignState
  selectedCharacterId: string
  inventoryCharacterId: string
  transferDisabled: boolean
  squadLocked: boolean
  activeDragId: string | null
  onSelectCharacter: (characterId: string) => void
}

function RosterRow({
  character,
  campaign,
  selectedCharacterId,
  inventoryCharacterId,
  transferDisabled,
  squadLocked,
  activeDragId,
  onSelectCharacter,
}: {
  character: Character
  campaign: CampaignState
  selectedCharacterId: string
  inventoryCharacterId: string
  transferDisabled: boolean
  squadLocked: boolean
  activeDragId: string | null
  onSelectCharacter: (characterId: string) => void
}) {
  const inSquad = campaign.squad.includes(character.id)
  const isSelected = character.id === selectedCharacterId
  const canReceiveItem =
    !transferDisabled &&
    character.id !== inventoryCharacterId &&
    activeDragId?.startsWith('stash:') === true

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: rosterCharacterDropId(character.id),
    disabled: transferDisabled || character.id === inventoryCharacterId,
  })

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: rosterCharacterDragId(character.id),
    disabled: squadLocked || inSquad,
    data: { characterId: character.id },
  })

  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const itemDragOver = isOver && activeParsed?.kind === 'stash'
  const cls = getCharacterClass(character.classId)
  const stashCount = character.items.length

  return (
    <List.Item
      ref={(node) => {
        setDropRef(node)
        if (!inSquad) setDragRef(node)
      }}
      {...(!inSquad && !squadLocked ? { ...attributes, ...listeners } : {})}
      style={{
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: 6,
        background: isSelected ? '#e6f4ff' : itemDragOver ? '#f6ffed' : undefined,
        outline: itemDragOver ? '2px dashed #52c41a' : undefined,
        opacity: isDragging ? 0.5 : undefined,
      }}
      onClick={() => onSelectCharacter(character.id)}
    >
      <List.Item.Meta
        title={
          <span>
            {character.name}{' '}
            {inSquad ? (
              <Tag color="blue" style={{ marginInlineStart: 4 }}>
                отряд
              </Tag>
            ) : (
              <Tag style={{ marginInlineStart: 4 }}>резерв</Tag>
            )}
            {canReceiveItem ? (
              <Typography.Text type="secondary" style={{ fontSize: 11, marginInlineStart: 8 }}>
                ← перетащи предмет
              </Typography.Text>
            ) : null}
          </span>
        }
        description={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {cls?.label ?? character.classId} · {UI_LEVEL}
            {character.unitLevel} · предметов: {stashCount}
          </Typography.Text>
        }
      />
    </List.Item>
  )
}

export function CharacterRosterView({
  campaign,
  selectedCharacterId,
  inventoryCharacterId,
  transferDisabled,
  squadLocked,
  activeDragId,
  onSelectCharacter,
}: CharacterRosterViewProps) {
  const reserve = getReserveCharacters(campaign)
  const squadIds = campaign.squad.filter((id): id is string => id !== null)
  const squadChars = squadIds
    .map((id) => getCharacter(campaign, id))
    .filter((c): c is Character => c !== undefined)
  const roster = [...squadChars, ...reserve.filter((c) => !squadIds.includes(c.id))]

  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        Roster ({roster.length})
      </Typography.Text>
      {roster.length === 0 ? (
        <Typography.Text type="secondary">Нет персонажей</Typography.Text>
      ) : (
        <List
          size="small"
          bordered
          dataSource={roster}
          renderItem={(character) => (
            <RosterRow
              key={character.id}
              character={character}
              campaign={campaign}
              selectedCharacterId={selectedCharacterId}
              inventoryCharacterId={inventoryCharacterId}
              transferDisabled={transferDisabled}
              squadLocked={squadLocked}
              activeDragId={activeDragId}
              onSelectCharacter={onSelectCharacter}
            />
          )}
        />
      )}
    </div>
  )
}
