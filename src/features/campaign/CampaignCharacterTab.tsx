import { useEffect, useState } from 'react'
import { Divider, Space, Typography } from 'antd'
import { getActiveCharacter, getCharacter } from '../../game/character/selectors'
import { aggregateGearCardLevelBonus } from '../../game/equipment/aggregates'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, EquipmentSlot } from '../../game/types'
import { CharacterRosterView } from '../character/CharacterRosterView'
import { SquadSlotRow } from '../character/SquadSlotRow'
import { HeroProfileContent } from '../profile/HeroProfileContent'
import { CardsInventoryView } from '../inventory/CardsInventoryView'
import { EquipmentInventoryView } from '../inventory/EquipmentInventoryView'
import '../inventory/inventory.css'

type CampaignCharacterTabProps = {
  campaign: CampaignState
  inBattle: boolean
  onEquip: (characterId: string, itemId: string, slot: EquipmentSlot) => void
  onUnequip: (characterId: string, slot: EquipmentSlot) => void
  onReorderStash: (characterId: string, itemIds: string[]) => void
  onReorderCards: (characterId: string, cardIds: string[]) => void
  onSetModKillTarget: (cardId: string) => void
  onSetBattleLoadout: (characterId: string, slotIndex: 0 | 1, cardId: string | null) => void
  onTransferItem: (itemId: string, fromCharacterId: string, toCharacterId: string) => void
  onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
  onSwapSquadSlots: (from: number, to: number) => void
  onInvalidSlot: () => void
}

export function CampaignCharacterTab({
  campaign,
  inBattle,
  onEquip,
  onUnequip,
  onReorderStash,
  onReorderCards,
  onSetModKillTarget,
  onSetBattleLoadout,
  onTransferItem,
  onSetSquadSlot,
  onSwapSquadSlots,
  onInvalidSlot,
}: CampaignCharacterTabProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    () => getActiveCharacter(campaign).id,
  )

  useEffect(() => {
    if (!getCharacter(campaign, selectedCharacterId)) {
      setSelectedCharacterId(getActiveCharacter(campaign).id)
    }
  }, [campaign, selectedCharacterId])

  const squadLocked = campaign.expedition !== null
  const transferDisabled = inBattle || squadLocked
  const selectedCharacter = getCharacter(campaign, selectedCharacterId) ?? getActiveCharacter(campaign)
  const gearCardPreview = aggregateGearCardLevelBonus(
    selectedCharacter.items,
    selectedCharacter.equipment,
    getItemTemplate,
  )

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      <EquipmentInventoryView
        campaign={campaign}
        characterId={selectedCharacterId}
        inBattle={inBattle}
        squadLocked={squadLocked}
        onEquip={(itemId, slot) => onEquip(selectedCharacterId, itemId, slot)}
        onUnequip={(slot) => onUnequip(selectedCharacterId, slot)}
        onReorderStash={(itemIds) => onReorderStash(selectedCharacterId, itemIds)}
        onInvalidSlot={onInvalidSlot}
        onTransferItem={(itemId, toCharacterId) =>
          onTransferItem(itemId, selectedCharacterId, toCharacterId)
        }
        onSetSquadSlot={onSetSquadSlot}
        onSwapSquadSlots={onSwapSquadSlots}
        dndBeforeContent={(activeDragId) => (
          <Space orientation="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
            <SquadSlotRow
              campaign={campaign}
              selectedCharacterId={selectedCharacterId}
              squadLocked={squadLocked || inBattle}
              activeDragId={activeDragId}
              onSelectCharacter={setSelectedCharacterId}
            />
            <CharacterRosterView
              campaign={campaign}
              selectedCharacterId={selectedCharacterId}
              inventoryCharacterId={selectedCharacterId}
              transferDisabled={transferDisabled}
              squadLocked={squadLocked || inBattle}
              activeDragId={activeDragId}
              onSelectCharacter={setSelectedCharacterId}
            />
            <HeroProfileContent
              mode="hub"
              campaign={campaign}
              battle={null}
              characterId={selectedCharacterId}
              includeResourceStats={false}
              includeEquipmentReadout={false}
              includeCardsCollapse={false}
            />
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
              Инвентарь и экипировка — {selectedCharacter.name}
            </Typography.Title>
            <Divider style={{ margin: '8px 0 0' }} />
          </Space>
        )}
      />

      <div>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
            🃏
          </span>{' '}
          Карточки — {selectedCharacter.name}
        </Typography.Text>
        <CardsInventoryView
          campaign={campaign}
          characterId={selectedCharacterId}
          inBattle={inBattle}
          gearCardLevelBonus={gearCardPreview}
          onReorderCards={(cardIds) => onReorderCards(selectedCharacterId, cardIds)}
          onSetModKillTarget={onSetModKillTarget}
          onSetBattleLoadout={(slotIndex, cardId) =>
            onSetBattleLoadout(selectedCharacterId, slotIndex, cardId)
          }
        />
      </div>
    </Space>
  )
}
