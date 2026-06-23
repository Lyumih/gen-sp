import { useEffect, useReducer, useState, type ReactNode } from 'react'
import { Modal, Tabs } from 'antd'
import { getActiveCharacter, getCharacter } from '../../../game/character/selectors'
import type { CampaignState, EquipmentSlot } from '../../../game/types'
import { EquipmentInventoryView } from '../../inventory/EquipmentInventoryView'
import { CardsInventoryView } from '../../inventory/CardsInventoryView'
import { ChestInventoryView } from '../../inventory/ChestInventoryView'
import { HeroAppearanceEditor } from '../../profile/HeroAppearanceEditor'
import { CharacterRail } from './CharacterRail'
import { CharacterBuildPanel } from './CharacterBuildPanel'
import type { StashTabKey } from './types'
import { loadoutFocusReducer } from './loadoutFocusReducer'
import { resolveItemClickEquip } from './clickEquip'
import '../../inventory/inventory.css'

export type CharacterHubLayoutProps = {
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

export function CharacterHubLayout({
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
  onReleaseCharacter,
  onPickModOffer,
  onRemoveMod,
  onInvalidSlot,
}: CharacterHubLayoutProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    () => getActiveCharacter(campaign).id,
  )
  const [appearanceCharacterId, setAppearanceCharacterId] = useState<string | null>(null)
  const [stashTab, setStashTab] = useState<StashTabKey>('items')
  const [focus, dispatchFocus] = useReducer(loadoutFocusReducer, null)
  const [previewItemId, setPreviewItemId] = useState<string | null>(null)

  useEffect(() => {
    dispatchFocus({ type: 'clear' })
    setPreviewItemId(null)
  }, [selectedCharacterId])

  useEffect(() => {
    if (!getCharacter(campaign, selectedCharacterId)) {
      setSelectedCharacterId(getActiveCharacter(campaign).id)
    }
  }, [campaign, selectedCharacterId])

  const handleStashItemClick = (itemId: string) => {
    if (inBattle) return
    const result = resolveItemClickEquip(campaign, selectedCharacterId, itemId, focus)
    if (result.type === 'equip') {
      onEquip(selectedCharacterId, result.itemId, result.slot)
      dispatchFocus({ type: 'clear' })
      setPreviewItemId(null)
    } else if (result.type === 'invalid' && result.reason === 'wrong_slot') {
      onInvalidSlot()
    }
  }

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
    appearanceCharacterId !== null ? getCharacter(campaign, appearanceCharacterId) : null

  const chestCount =
    campaign.chest.items.length +
    campaign.chest.unboundCards.length +
    campaign.chest.unboundPassives.length

  const cardHandlers = {
    onSetBattleLoadout: (slotIndex: 0 | 1 | 2 | 3, cardId: string | null) =>
      onSetBattleLoadout(selectedCharacterId, slotIndex, cardId),
    onSetPassiveEquip: (slotIndex: 0 | 1 | 2 | 3 | 4, passiveId: string | null) =>
      onSetPassiveEquip(selectedCharacterId, slotIndex, passiveId),
    onReorderCards: (cardIds: string[]) => onReorderCards(selectedCharacterId, cardIds),
  }

  const renderStashTabs = (itemsPanel: ReactNode) => (
    <Tabs
      size="small"
      activeKey={stashTab}
      onChange={(key) => setStashTab(key as StashTabKey)}
      items={[
        { key: 'items', label: 'Предметы', children: itemsPanel },
        {
          key: 'cards',
          label: 'Умения',
          children: (
            <CardsInventoryView
              campaign={campaign}
              characterId={selectedCharacterId}
              inBattle={inBattle}
              inventoryLocked={expeditionActive}
              modsDisabled={modsDisabled}
              modsDisabledTooltip={modsDisabledTooltip}
              embedded
              hubSection="cards"
              onReorderCards={cardHandlers.onReorderCards}
              onSetBattleLoadout={cardHandlers.onSetBattleLoadout}
              onSetPassiveEquip={cardHandlers.onSetPassiveEquip}
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
          ),
        },
        {
          key: 'passives',
          label: 'Навыки',
          children: (
            <CardsInventoryView
              campaign={campaign}
              characterId={selectedCharacterId}
              inBattle={inBattle}
              inventoryLocked={expeditionActive}
              modsDisabled={modsDisabled}
              modsDisabledTooltip={modsDisabledTooltip}
              embedded
              hubSection="passives"
              onReorderCards={cardHandlers.onReorderCards}
              onSetBattleLoadout={cardHandlers.onSetBattleLoadout}
              onSetPassiveEquip={cardHandlers.onSetPassiveEquip}
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
            />
          ),
        },
        {
          key: 'chest',
          label: `Сундук (${chestCount})`,
          children: (
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
              onBindPassive={(passiveId) => onBindChestPassive(passiveId, selectedCharacterId)}
              onAssignItemToCharacter={(itemId) =>
                onMoveChestItemToCharacter(itemId, selectedCharacterId)
              }
              showIntro={false}
              dndEnabled
            />
          ),
        },
      ]}
    />
  )

  return (
    <>
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
        onSellItem={(itemId) => onSellItem(selectedCharacterId, itemId)}
        onInvalidSlot={onInvalidSlot}
        onTransferItem={(itemId, toCharacterId) =>
          onTransferItem(itemId, selectedCharacterId, toCharacterId)
        }
        onMoveChestItemToCharacter={onMoveChestItemToCharacter}
        onMoveCharacterItemToChest={(itemId) =>
          onMoveCharacterItemToChest(itemId, selectedCharacterId)
        }
        onPickModOffer={(_kind, carrierId, slotIndex, modTemplateId) =>
          onPickModOffer(selectedCharacterId, 'item', carrierId, slotIndex, modTemplateId)
        }
        onRemoveMod={(_kind, carrierId, slotIndex) =>
          onRemoveMod(selectedCharacterId, 'item', carrierId, slotIndex)
        }
        onSetBattleLoadout={cardHandlers.onSetBattleLoadout}
        onSetPassiveEquip={cardHandlers.onSetPassiveEquip}
        onReorderCards={cardHandlers.onReorderCards}
        loadoutFocus={focus}
        onToggleEquipFocus={(slot) => dispatchFocus({ type: 'toggleEquip', slot })}
        onStashItemClick={handleStashItemClick}
        onStashItemHover={setPreviewItemId}
        characterHub={{
          rail: (
            <CharacterRail
              campaign={campaign}
              selectedCharacterId={selectedCharacterId}
              transferDisabled={transferDisabled}
              onSelectCharacter={setSelectedCharacterId}
              onEditAppearance={setAppearanceCharacterId}
              onReleaseCharacter={onReleaseCharacter}
              canReleaseCharacter={canReleaseCharacter}
            />
          ),
          buildColumn: (
            <>
              <CharacterBuildPanel
                campaign={campaign}
                characterId={selectedCharacterId}
                focus={focus}
                previewItemId={previewItemId}
              />
              <CardsInventoryView
                campaign={campaign}
                characterId={selectedCharacterId}
                inBattle={inBattle}
                inventoryLocked={expeditionActive}
                modsDisabled={modsDisabled}
                modsDisabledTooltip={modsDisabledTooltip}
                embedded
                hubSection="loadout"
                onReorderCards={cardHandlers.onReorderCards}
                onSetBattleLoadout={cardHandlers.onSetBattleLoadout}
                onSetPassiveEquip={cardHandlers.onSetPassiveEquip}
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
              />
            </>
          ),
          renderStashTabs,
        }}
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
    </>
  )
}
