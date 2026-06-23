import { useDraggable, useDroppable } from '@dnd-kit/core'
import { EditOutlined } from '@ant-design/icons'
import { Button, List, Tag, Typography } from 'antd'
import {
  getCharacter,
  getReserveCharacters,
  hasEmptySquadSlot,
} from '../../game/character/selectors'
import { getCharacterClass } from '../../game/content/characterClasses'
import { getCharacterDisplay } from '../../game/character/display'
import type { CampaignState, Character } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { SpecializationLine } from '../specialization/SpecializationLine'
import { StatStrip } from '../stats/StatStrip'
import { parseDragId, rosterCharacterDragId, rosterCharacterDropId } from '../inventory/inventoryDnD'

type CharacterRosterViewProps = {
  campaign: CampaignState
  selectedCharacterId: string
  inventoryCharacterId: string
  transferDisabled: boolean
  squadLocked: boolean
  activeDragId: string | null
  onSelectCharacter: (characterId: string) => void
  onAssignToSquad: (characterId: string) => void
  onRemoveFromSquad: (characterId: string) => void
  onEditAppearance?: (characterId: string) => void
  showSquadActions?: boolean
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
  onAssignToSquad,
  onRemoveFromSquad,
  onEditAppearance,
  showSquadActions,
  squadHasEmptySlot,
}: {
  character: Character
  campaign: CampaignState
  selectedCharacterId: string
  inventoryCharacterId: string
  transferDisabled: boolean
  squadLocked: boolean
  activeDragId: string | null
  onSelectCharacter: (characterId: string) => void
  onAssignToSquad: (characterId: string) => void
  onRemoveFromSquad: (characterId: string) => void
  onEditAppearance?: (characterId: string) => void
  showSquadActions: boolean
  squadHasEmptySlot: boolean
}) {
  const inSquad = campaign.squad.includes(character.id)
  const isSelected = character.id === selectedCharacterId
  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const isStashDrag = activeParsed?.kind === 'stash'
  const isChestItemDrag = activeParsed?.kind === 'chest-item'
  const canReceiveItem =
    !transferDisabled &&
    (isChestItemDrag || (isStashDrag && character.id !== inventoryCharacterId))

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: rosterCharacterDropId(character.id),
    disabled:
      transferDisabled || (isStashDrag && character.id === inventoryCharacterId),
  })

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: rosterCharacterDragId(character.id),
    disabled: squadLocked || inSquad,
    data: { characterId: character.id },
  })

  const itemDragOver =
    isOver &&
    (activeParsed?.kind === 'stash' || activeParsed?.kind === 'chest-item')
  const cls = getCharacterClass(character.classId)
  const display = getCharacterDisplay(character)
  const stashCount = character.items.length

  const squadActions =
    showSquadActions && !squadLocked
      ? inSquad
        ? [
            ...(onEditAppearance
              ? [
                  <Button
                    key="edit"
                    size="small"
                    icon={<EditOutlined />}
                    aria-label="Редактировать облик"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditAppearance(character.id)
                    }}
                  />,
                ]
              : []),
            <Button
              key="remove"
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveFromSquad(character.id)
              }}
            >
              Снять
            </Button>,
          ]
        : [
            ...(onEditAppearance
              ? [
                  <Button
                    key="edit"
                    size="small"
                    icon={<EditOutlined />}
                    aria-label="Редактировать облик"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditAppearance(character.id)
                    }}
                  />,
                ]
              : []),
            <Button
              key="assign"
              size="small"
              type="primary"
              disabled={!squadHasEmptySlot}
              onClick={(e) => {
                e.stopPropagation()
                onAssignToSquad(character.id)
              }}
            >
              Назначить
            </Button>,
          ]
      : onEditAppearance
        ? [
            <Button
              key="edit"
              size="small"
              icon={<EditOutlined />}
              aria-label="Редактировать облик"
              onClick={(e) => {
                e.stopPropagation()
                onEditAppearance(character.id)
              }}
            />,
          ]
        : undefined

  return (
    <List.Item
      ref={(node) => {
        setDropRef(node)
        if (!inSquad) setDragRef(node)
      }}
      {...(!inSquad && !squadLocked ? { ...attributes, ...listeners } : {})}
      actions={squadActions}
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
            {display.emoji} {character.name}{' '}
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
          <>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {cls?.label ?? character.classId} · {UI_LEVEL}
              {character.unitLevel} · предметов: {stashCount}
            </Typography.Text>
            <SpecializationLine campaign={campaign} character={character} />
            <StatStrip
              baseStats={character.baseStats}
              baseStatRating={character.baseStatRating}
              showRating
            />
          </>
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
  onAssignToSquad,
  onRemoveFromSquad,
  onEditAppearance,
  showSquadActions = true,
}: CharacterRosterViewProps) {
  const reserve = getReserveCharacters(campaign)
  const squadIds = campaign.squad.filter((id): id is string => id !== null)
  const squadChars = squadIds
    .map((id) => getCharacter(campaign, id))
    .filter((c): c is Character => c !== undefined)
  const roster = [...squadChars, ...reserve.filter((c) => !squadIds.includes(c.id))]
  const squadHasEmptySlot = hasEmptySquadSlot(campaign.squad)

  return (
    <div>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        Состав ({roster.length})
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
              onAssignToSquad={onAssignToSquad}
              onRemoveFromSquad={onRemoveFromSquad}
              onEditAppearance={onEditAppearance}
              showSquadActions={showSquadActions}
              squadHasEmptySlot={squadHasEmptySlot}
            />
          )}
        />
      )}
    </div>
  )
}
