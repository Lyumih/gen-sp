import { useDroppable } from '@dnd-kit/core'
import { EditOutlined, MoreOutlined } from '@ant-design/icons'
import { Button, Dropdown, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { getCharacterClass } from '../../../game/content/characterClasses'
import { getCharacterDisplay } from '../../../game/character/display'
import type { CampaignState } from '../../../game/types'
import { UI_LEVEL } from '../../../game/ui/labels'
import { rosterCharacterDropId } from '../../inventory/inventoryDnD'
import { InventoryCell } from '../../inventory/InventoryCell'
import { orderCharactersForRail } from './orderCharactersForRail'
import '../../inventory/inventory.css'

export type CharacterRailProps = {
  campaign: CampaignState
  selectedCharacterId: string
  transferDisabled: boolean
  onSelectCharacter: (characterId: string) => void
  onEditAppearance?: (characterId: string) => void
  onReleaseCharacter?: (characterId: string) => void
  canReleaseCharacter?: boolean
}

function RailCell({
  characterId,
  campaign,
  selectedCharacterId,
  transferDisabled,
  inSquad,
  onSelectCharacter,
}: {
  characterId: string
  campaign: CampaignState
  selectedCharacterId: string
  transferDisabled: boolean
  inSquad: boolean
  onSelectCharacter: (characterId: string) => void
}) {
  const character = campaign.characters.find((c) => c.id === characterId)
  if (!character) return null
  const cls = getCharacterClass(character.classId)
  const display = getCharacterDisplay(character)
  const selected = characterId === selectedCharacterId

  const { setNodeRef, isOver } = useDroppable({
    id: rosterCharacterDropId(characterId),
    disabled: transferDisabled,
  })

  return (
    <Tooltip
      title={`${character.name} · ${cls?.label ?? character.classId}`}
      mouseEnterDelay={0.3}
    >
      <div ref={setNodeRef} style={{ width: 56 }}>
        <InventoryCell
          emoji={display.emoji}
          levelBadge={`${UI_LEVEL}${character.unitLevel}`}
          state={isOver ? 'dragOver' : inSquad ? 'equipped' : 'filled'}
          className={selected ? 'inv-cell--selected' : undefined}
          ariaLabel={character.name}
          onClick={() => onSelectCharacter(characterId)}
        />
      </div>
    </Tooltip>
  )
}

export function CharacterRail({
  campaign,
  selectedCharacterId,
  transferDisabled,
  onSelectCharacter,
  onEditAppearance,
  onReleaseCharacter,
  canReleaseCharacter = false,
}: CharacterRailProps) {
  const roster = orderCharactersForRail(campaign)
  const squadSet = new Set(campaign.squad.filter((id): id is string => id !== null))

  const menuItems: MenuProps['items'] =
    canReleaseCharacter && onReleaseCharacter
      ? [
          {
            key: 'release',
            label: 'Отпустить',
            danger: true,
            onClick: () => onReleaseCharacter(selectedCharacterId),
          },
        ]
      : []

  return (
    <div className="inv-rail-stack">
      {roster.map((character) => (
        <RailCell
          key={character.id}
          characterId={character.id}
          campaign={campaign}
          selectedCharacterId={selectedCharacterId}
          transferDisabled={transferDisabled}
          inSquad={squadSet.has(character.id)}
          onSelectCharacter={onSelectCharacter}
        />
      ))}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {onEditAppearance ? (
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label="Редактировать облик"
            onClick={() => onEditAppearance(selectedCharacterId)}
          />
        ) : null}
        {menuItems.length > 0 ? (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} aria-label="Действия" />
          </Dropdown>
        ) : null}
      </div>
    </div>
  )
}
