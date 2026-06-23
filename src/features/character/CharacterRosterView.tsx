import { useDraggable, useDroppable } from '@dnd-kit/core'
import { EditOutlined } from '@ant-design/icons'
import { Button, List, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'
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
  onReleaseCharacter?: (characterId: string) => void
  canReleaseCharacter?: boolean
  onEditAppearance?: (characterId: string) => void
  showSquadActions?: boolean
  variant?: 'full' | 'compact'
  showHeading?: boolean
}

function editAppearanceButton(
  characterId: string,
  onEditAppearance?: (characterId: string) => void,
): ReactNode[] {
  if (!onEditAppearance) return []
  return [
    <Button
      key="edit"
      size="small"
      icon={<EditOutlined />}
      aria-label="Редактировать облик"
      onClick={(e) => {
        e.stopPropagation()
        onEditAppearance(characterId)
      }}
    />,
  ]
}

function releaseCharacterButton(
  characterId: string,
  canReleaseCharacter: boolean,
  onReleaseCharacter?: (characterId: string) => void,
): ReactNode[] {
  if (!canReleaseCharacter || !onReleaseCharacter) return []
  return [
    <Button
      key="release"
      size="small"
      danger
      onClick={(e) => {
        e.stopPropagation()
        onReleaseCharacter(characterId)
      }}
    >
      Отпустить
    </Button>,
  ]
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
  onReleaseCharacter,
  canReleaseCharacter,
  onEditAppearance,
  showSquadActions,
  squadHasEmptySlot,
  variant,
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
  onReleaseCharacter?: (characterId: string) => void
  canReleaseCharacter: boolean
  onEditAppearance?: (characterId: string) => void
  showSquadActions: boolean
  squadHasEmptySlot: boolean
  variant: 'full' | 'compact'
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
  const isCompact = variant === 'compact'

  const releaseBtn = releaseCharacterButton(
    character.id,
    canReleaseCharacter,
    onReleaseCharacter,
  )
  const editBtn = editAppearanceButton(character.id, onEditAppearance)

  let rowActions: ReactNode[] | undefined
  if (showSquadActions && !squadLocked) {
    rowActions = inSquad
      ? [
          ...editBtn,
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
          ...releaseBtn,
        ]
      : [
          ...editBtn,
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
          ...releaseBtn,
        ]
  } else {
    const fallback = [...editBtn, ...releaseBtn]
    rowActions = fallback.length > 0 ? fallback : undefined
  }

  return (
    <List.Item
      ref={(node) => {
        setDropRef(node)
        if (!inSquad) setDragRef(node)
      }}
      {...(!inSquad && !squadLocked ? { ...attributes, ...listeners } : {})}
      actions={rowActions}
      style={{
        cursor: 'pointer',
        padding: isCompact ? '4px 8px' : '8px 12px',
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
            {display.emoji} {character.name}
            {isCompact ? (
              <>
                {' '}
                · {cls?.label ?? character.classId} {UI_LEVEL}
                {character.unitLevel}
              </>
            ) : null}{' '}
            {inSquad ? (
              <Tag color="blue" style={{ marginInlineStart: 4 }}>
                отряд
              </Tag>
            ) : (
              <Tag style={{ marginInlineStart: 4 }}>резерв</Tag>
            )}
            {!isCompact && canReceiveItem ? (
              <Typography.Text type="secondary" style={{ fontSize: 11, marginInlineStart: 8 }}>
                ← перетащи предмет
              </Typography.Text>
            ) : null}
          </span>
        }
        description={
          isCompact ? undefined : (
            <>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {cls?.label ?? character.classId} · {UI_LEVEL}
                {character.unitLevel} · предметов: {character.items.length}
              </Typography.Text>
              <SpecializationLine campaign={campaign} character={character} />
              <StatStrip
                baseStats={character.baseStats}
                baseStatRating={character.baseStatRating}
                showRating
              />
            </>
          )
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
  onReleaseCharacter,
  canReleaseCharacter = false,
  onEditAppearance,
  showSquadActions = true,
  variant = 'full',
  showHeading = true,
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
      {showHeading ? (
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Состав ({roster.length})
        </Typography.Text>
      ) : null}
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
              onReleaseCharacter={onReleaseCharacter}
              canReleaseCharacter={canReleaseCharacter}
              onEditAppearance={onEditAppearance}
              showSquadActions={showSquadActions}
              squadHasEmptySlot={squadHasEmptySlot}
              variant={variant}
            />
          )}
        />
      )}
    </div>
  )
}
