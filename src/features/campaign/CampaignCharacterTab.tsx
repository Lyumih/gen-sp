import { useEffect, useState } from 'react'
import { Modal, Space } from 'antd'
import { getActiveCharacter, getCharacter } from '../../game/character/selectors'
import type { CampaignState, EquipmentSlot } from '../../game/types'
import { CharacterRosterView } from '../character/CharacterRosterView'
import { SquadSlotRow } from '../character/SquadSlotRow'
import { GamePanel } from '../layout/GamePanel'
import { HeroAppearanceEditor } from '../profile/HeroAppearanceEditor'
import { HeroProfileContent } from '../profile/HeroProfileContent'
import { CardsInventoryView } from '../inventory/CardsInventoryView'
import { ChestInventoryView } from '../inventory/ChestInventoryView'
import { EquipmentInventoryView } from '../inventory/EquipmentInventoryView'
import '../inventory/inventory.css'

type CampaignCharacterTabProps = {
  campaign: CampaignState
  inBattle: boolean
  expeditionActive: boolean
  onEquip: (characterId: string, itemId: string, slot: EquipmentSlot) => void
  onUnequip: (characterId: string, slot: EquipmentSlot) => void
  onReorderStash: (characterId: string, itemIds: string[]) => void
  onReorderCards: (characterId: string, cardIds: string[]) => void
  onSetBattleLoadout: (characterId: string, slotIndex: 0 | 1 | 2 | 3, cardId: string | null) => void
  onSetPassiveEquip: (
    characterId: string,
    slotIndex: 0 | 1 | 2 | 3 | 4,
    passiveId: string | null,
  ) => void
  onTransferItem: (itemId: string, fromCharacterId: string, toCharacterId: string) => void
  onSellChestItem: (itemId: string) => void
  onSellChestCard: (cardId: string) => void
  onSellItem: (characterId: string, itemId: string) => void
  onSellCard: (characterId: string, cardId: string) => void
  onBindChestCard: (cardId: string, characterId: string) => void
  onBindChestPassive: (passiveId: string, characterId: string) => void
  onSellChestPassive: (passiveId: string) => void
  onMoveChestItemToCharacter: (itemId: string, characterId: string) => void
  onMoveCharacterItemToChest: (itemId: string, characterId: string) => void
  onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
  onSwapSquadSlots: (from: number, to: number) => void
  onAssignToSquad: (characterId: string) => void
  onRemoveFromSquad: (characterId: string) => void
  onReleaseCharacter: (characterId: string) => void
  onPickModOffer: (
    characterId: string,
    carrierKind: 'card' | 'item' | 'passive',
    carrierId: string,
    slotIndex: number,
    modTemplateId: string,
  ) => void
  onRemoveMod: (
    characterId: string,
    carrierKind: 'card' | 'item' | 'passive',
    carrierId: string,
    slotIndex: number,
  ) => void
  onInvalidSlot: () => void
}

export function CampaignCharacterTab({
  campaign,
  inBattle,
  expeditionActive,
  onEquip,
  onUnequip,
  onReorderStash,
  onReorderCards,
  onSetBattleLoadout,
  onSetPassiveEquip,
  onTransferItem,
  onSellChestItem,
  onSellChestCard,
  onSellItem,
  onSellCard,
  onBindChestCard,
  onBindChestPassive,
  onSellChestPassive,
  onMoveChestItemToCharacter,
  onMoveCharacterItemToChest,
  onSetSquadSlot,
  onSwapSquadSlots,
  onAssignToSquad,
  onRemoveFromSquad,
  onReleaseCharacter,
  onPickModOffer,
  onRemoveMod,
  onInvalidSlot,
}: CampaignCharacterTabProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    () => getActiveCharacter(campaign).id,
  )
  const [appearanceCharacterId, setAppearanceCharacterId] = useState<string | null>(null)

  useEffect(() => {
    if (!getCharacter(campaign, selectedCharacterId)) {
      setSelectedCharacterId(getActiveCharacter(campaign).id)
    }
  }, [campaign, selectedCharacterId])

  const squadLocked = expeditionActive
  const modsDisabled = inBattle || expeditionActive
  const modsDisabledTooltip = expeditionActive
    ? 'Недоступно во время экспедиции'
    : inBattle
      ? 'Доступно после боя'
      : undefined
  const transferDisabled = inBattle || squadLocked
  const canReleaseCharacter =
    !inBattle && !squadLocked && campaign.characters.length > 1
  const selectedCharacter = getCharacter(campaign, selectedCharacterId) ?? getActiveCharacter(campaign)
  const appearanceCharacter =
    appearanceCharacterId !== null
      ? getCharacter(campaign, appearanceCharacterId)
      : null

  return (
    <Space orientation="vertical" size="small" style={{ width: '100%' }} role="tabpanel">
      <EquipmentInventoryView
        campaign={campaign}
        characterId={selectedCharacterId}
        inBattle={inBattle}
        modsDisabled={modsDisabled}
        modsDisabledTooltip={modsDisabledTooltip}
        squadLocked={squadLocked}
        panelTitle="Экипировка"
        dndBeforeContent={(activeDragId) => (
          <Space orientation="vertical" size="small" style={{ width: '100%', marginBottom: 8 }}>
            <GamePanel title="Отряд">
              <SquadSlotRow
                campaign={campaign}
                selectedCharacterId={selectedCharacterId}
                squadLocked={squadLocked || inBattle}
                activeDragId={activeDragId}
                onSelectCharacter={setSelectedCharacterId}
                onRemoveFromSquad={onRemoveFromSquad}
              />
            </GamePanel>
            <GamePanel title={`Состав (${campaign.characters.length})`}>
              <CharacterRosterView
                campaign={campaign}
                selectedCharacterId={selectedCharacterId}
                inventoryCharacterId={selectedCharacterId}
                transferDisabled={transferDisabled}
                squadLocked={squadLocked || inBattle}
                activeDragId={activeDragId}
                onSelectCharacter={setSelectedCharacterId}
                onAssignToSquad={onAssignToSquad}
                onRemoveFromSquad={onRemoveFromSquad}
                onReleaseCharacter={onReleaseCharacter}
                canReleaseCharacter={canReleaseCharacter}
                onEditAppearance={setAppearanceCharacterId}
              />
            </GamePanel>
            <HeroProfileContent
              mode="hub"
              campaign={campaign}
              battle={null}
              characterId={selectedCharacterId}
              includeResourceStats={false}
              includeEquipmentReadout={false}
              includeCardsCollapse={false}
            />
          </Space>
        )}
        onEquip={(itemId, slot) => onEquip(selectedCharacterId, itemId, slot)}
        onUnequip={(slot) => onUnequip(selectedCharacterId, slot)}
        onReorderStash={(itemIds) => onReorderStash(selectedCharacterId, itemIds)}
        onSellItem={(itemId) => onSellItem(selectedCharacterId, itemId)}
        onInvalidSlot={onInvalidSlot}
        onTransferItem={(itemId, toCharacterId) =>
          onTransferItem(itemId, selectedCharacterId, toCharacterId)
        }
        onMoveChestItemToCharacter={onMoveChestItemToCharacter}
        onMoveCharacterItemToChest={(itemId) =>
          onMoveCharacterItemToChest(itemId, selectedCharacterId)
        }
        onSetSquadSlot={onSetSquadSlot}
        onSwapSquadSlots={onSwapSquadSlots}
        onPickModOffer={(_kind, carrierId, slotIndex, modTemplateId) =>
          onPickModOffer(
            selectedCharacterId,
            'item',
            carrierId,
            slotIndex,
            modTemplateId,
          )
        }
        onRemoveMod={(_kind, carrierId, slotIndex) =>
          onRemoveMod(selectedCharacterId, 'item', carrierId, slotIndex)
        }
        sideContent={
          <GamePanel title="Умения и навыки">
            <CardsInventoryView
              campaign={campaign}
              characterId={selectedCharacterId}
              inBattle={inBattle}
              inventoryLocked={expeditionActive}
              modsDisabled={modsDisabled}
              modsDisabledTooltip={modsDisabledTooltip}
              onReorderCards={(cardIds) => onReorderCards(selectedCharacterId, cardIds)}
              onSetBattleLoadout={(slotIndex, cardId) =>
                onSetBattleLoadout(selectedCharacterId, slotIndex, cardId)
              }
              onSetPassiveEquip={(slotIndex, passiveId) =>
                onSetPassiveEquip(selectedCharacterId, slotIndex, passiveId)
              }
              onPickModOffer={(carrierKind, carrierId, slotIndex, modTemplateId) =>
                onPickModOffer(
                  selectedCharacterId,
                  carrierKind,
                  carrierId,
                  slotIndex,
                  modTemplateId,
                )
              }
              onRemoveMod={(carrierKind, carrierId, slotIndex) =>
                onRemoveMod(selectedCharacterId, carrierKind, carrierId, slotIndex)
              }
              onSellCard={(cardId) => onSellCard(selectedCharacterId, cardId)}
            />
          </GamePanel>
        }
        dndAfterContent={(activeDragId) => (
          <GamePanel title="Сундук">
            <ChestInventoryView
              campaign={campaign}
              inBattle={inBattle}
              inventoryLocked={expeditionActive}
              bindCharacterId={selectedCharacterId}
              onSellChestItem={onSellChestItem}
              onSellChestCard={onSellChestCard}
              onSellChestPassive={onSellChestPassive}
              bindCharacterName={selectedCharacter.name}
              onBindCard={(cardId) => onBindChestCard(cardId, selectedCharacterId)}
              onBindPassive={(passiveId) =>
                onBindChestPassive(passiveId, selectedCharacterId)
              }
              onAssignItemToCharacter={(itemId) =>
                onMoveChestItemToCharacter(itemId, selectedCharacterId)
              }
              dndEnabled
              activeDragId={activeDragId}
            />
          </GamePanel>
        )}
      />

      <Modal
        title={`Облик — ${appearanceCharacter?.name ?? ''}`}
        open={appearanceCharacter !== null}
        onCancel={() => setAppearanceCharacterId(null)}
        footer={null}
        destroyOnHidden
      >
        {appearanceCharacter ? (
          <HeroAppearanceEditor
            hero={appearanceCharacter}
            expeditionLocked={expeditionActive}
          />
        ) : null}
      </Modal>
    </Space>
  )
}
