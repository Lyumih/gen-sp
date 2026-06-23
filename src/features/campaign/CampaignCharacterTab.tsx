import { useEffect, useState } from 'react'
import { Divider, Modal, Space, Typography } from 'antd'
import { getActiveCharacter, getCharacter } from '../../game/character/selectors'
import { aggregateGearCardLevelBonus } from '../../game/equipment/aggregates'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, EquipmentSlot } from '../../game/types'
import { CharacterRosterView } from '../character/CharacterRosterView'
import { SquadSlotRow } from '../character/SquadSlotRow'
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
  onSetBattleLoadout: (characterId: string, slotIndex: 0 | 1, cardId: string | null) => void
  onTransferItem: (itemId: string, fromCharacterId: string, toCharacterId: string) => void
  onSellChestItem: (itemId: string) => void
  onBindChestCard: (cardId: string, characterId: string) => void
  onMoveChestItemToCharacter: (itemId: string, characterId: string) => void
  onMoveCharacterItemToChest: (itemId: string, characterId: string) => void
  onSetSquadSlot: (slotIndex: number, characterId: string | null) => void
  onSwapSquadSlots: (from: number, to: number) => void
  onAssignToSquad: (characterId: string) => void
  onRemoveFromSquad: (characterId: string) => void
  onPickModOffer: (
    characterId: string,
    carrierKind: 'card' | 'item',
    carrierId: string,
    slotIndex: number,
    modTemplateId: string,
  ) => void
  onRemoveMod: (
    characterId: string,
    carrierKind: 'card' | 'item',
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
  onTransferItem,
  onSellChestItem,
  onBindChestCard,
  onMoveChestItemToCharacter,
  onMoveCharacterItemToChest,
  onSetSquadSlot,
  onSwapSquadSlots,
  onAssignToSquad,
  onRemoveFromSquad,
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
    ? 'Недоступно во время expedition'
    : inBattle
      ? 'Доступно после боя'
      : undefined
  const transferDisabled = inBattle || squadLocked
  const selectedCharacter = getCharacter(campaign, selectedCharacterId) ?? getActiveCharacter(campaign)
  const appearanceCharacter =
    appearanceCharacterId !== null
      ? getCharacter(campaign, appearanceCharacterId)
      : null
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
        modsDisabled={modsDisabled}
        modsDisabledTooltip={modsDisabledTooltip}
        squadLocked={squadLocked}
        onEquip={(itemId, slot) => onEquip(selectedCharacterId, itemId, slot)}
        onUnequip={(slot) => onUnequip(selectedCharacterId, slot)}
        onReorderStash={(itemIds) => onReorderStash(selectedCharacterId, itemIds)}
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
        dndBeforeContent={(activeDragId) => (
          <Space orientation="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
            <SquadSlotRow
              campaign={campaign}
              selectedCharacterId={selectedCharacterId}
              squadLocked={squadLocked || inBattle}
              activeDragId={activeDragId}
              onSelectCharacter={setSelectedCharacterId}
              onRemoveFromSquad={onRemoveFromSquad}
            />
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
              onEditAppearance={setAppearanceCharacterId}
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
        dndAfterContent={(activeDragId) => (
          <>
            <div style={{ marginTop: 16 }}>
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
                modsDisabled={modsDisabled}
                modsDisabledTooltip={modsDisabledTooltip}
                gearCardLevelBonus={gearCardPreview}
                onReorderCards={(cardIds) => onReorderCards(selectedCharacterId, cardIds)}
                onSetBattleLoadout={(slotIndex, cardId) =>
                  onSetBattleLoadout(selectedCharacterId, slotIndex, cardId)
                }
                onPickModOffer={(_kind, carrierId, slotIndex, modTemplateId) =>
                  onPickModOffer(
                    selectedCharacterId,
                    'card',
                    carrierId,
                    slotIndex,
                    modTemplateId,
                  )
                }
                onRemoveMod={(_kind, carrierId, slotIndex) =>
                  onRemoveMod(selectedCharacterId, 'card', carrierId, slotIndex)
                }
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                Сундук
              </Typography.Title>
              <ChestInventoryView
                campaign={campaign}
                inBattle={inBattle}
                onSellChestItem={onSellChestItem}
                bindCharacterName={selectedCharacter.name}
                onBindCard={(cardId) => onBindChestCard(cardId, selectedCharacterId)}
                onAssignItemToCharacter={(itemId) =>
                  onMoveChestItemToCharacter(itemId, selectedCharacterId)
                }
                dndEnabled
                activeDragId={activeDragId}
              />
            </div>
          </>
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
