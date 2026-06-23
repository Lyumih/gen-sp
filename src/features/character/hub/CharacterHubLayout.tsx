import { useReducer, useState, type ReactNode } from 'react'
import { Modal, Tabs } from 'antd'
import { getActiveCharacter, getCharacter } from '../../../game/character/selectors'
import { stashItemsFromCampaign } from '../../../game/equipment/stashOrder'
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
import { useNarrowViewport } from '../../layout/useNarrowViewport'
import { stashTabAriaLabel, stashTabLabel } from '../../layout/tabLabels'
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

  const selectedCharacter = getCharacter(campaign, selectedCharacterId) ?? getActiveCharacter(campaign)
  const activeCharacterId = selectedCharacter.id

  const handleSelectCharacter = (characterId: string) => {
    setSelectedCharacterId(characterId)
    dispatchFocus({ type: 'clear' })
    setPreviewItemId(null)
  }

  const handleStashItemClick = (itemId: string) => {
    if (inBattle) return
    const result = resolveItemClickEquip(campaign, activeCharacterId, itemId, focus)
    if (result.type === 'equip') {
      onEquip(activeCharacterId, result.itemId, result.slot)
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
  const appearanceCharacter =
    appearanceCharacterId !== null ? getCharacter(campaign, appearanceCharacterId) : null

  const chestCount =
    campaign.chest.items.length +
    campaign.chest.unboundCards.length +
    campaign.chest.unboundPassives.length
  const itemCount = stashItemsFromCampaign(
    selectedCharacter.items,
    selectedCharacter.equipment,
  ).length
  const cardCount = selectedCharacter.cards.length
  const passiveCount = selectedCharacter.passives.length

  const narrow = useNarrowViewport()

  const stashTabLabelNode = (tab: 'items' | 'cards' | 'passives' | 'chest', count: number) => (
    <span aria-label={stashTabAriaLabel(tab, count)}>
      {stashTabLabel(tab, count, narrow)}
    </span>
  )

  const cardHandlers = {
    onSetBattleLoadout: (slotIndex: 0 | 1 | 2 | 3, cardId: string | null) =>
      onSetBattleLoadout(activeCharacterId, slotIndex, cardId),
    onSetPassiveEquip: (slotIndex: 0 | 1 | 2 | 3 | 4, passiveId: string | null) =>
      onSetPassiveEquip(activeCharacterId, slotIndex, passiveId),
    onReorderCards: (cardIds: string[]) => onReorderCards(activeCharacterId, cardIds),
  }

  const renderStashTabs = (itemsPanel: ReactNode) => (
    <Tabs
      className="game-tabs--scroll"
      size="small"
      tabBarGutter={8}
      activeKey={stashTab}
      onChange={(key) => setStashTab(key as StashTabKey)}
      items={[
        { key: 'items', label: stashTabLabelNode('items', itemCount), children: itemsPanel },
        {
          key: 'cards',
          label: stashTabLabelNode('cards', cardCount),
          children: (
            <CardsInventoryView
              campaign={campaign}
              characterId={activeCharacterId}
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
                  activeCharacterId,
                  carrierKind,
                  carrierId,
                  slotIndex,
                  modTemplateId,
                )
              }
              onRemoveMod={(carrierKind, carrierId, slotIndex) =>
                onRemoveMod(activeCharacterId, carrierKind, carrierId, slotIndex)
              }
              onSellCard={(cardId) => onSellCard(activeCharacterId, cardId)}
            />
          ),
        },
        {
          key: 'passives',
          label: stashTabLabelNode('passives', passiveCount),
          children: (
            <CardsInventoryView
              campaign={campaign}
              characterId={activeCharacterId}
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
                  activeCharacterId,
                  carrierKind,
                  carrierId,
                  slotIndex,
                  modTemplateId,
                )
              }
              onRemoveMod={(carrierKind, carrierId, slotIndex) =>
                onRemoveMod(activeCharacterId, carrierKind, carrierId, slotIndex)
              }
            />
          ),
        },
        {
          key: 'chest',
          label: stashTabLabelNode('chest', chestCount),
          children: (
            <ChestInventoryView
              campaign={campaign}
              inBattle={inBattle}
              inventoryLocked={expeditionActive}
              bindCharacterId={activeCharacterId}
              onSellChestItem={onSellChestItem}
              onSellChestCard={onSellChestCard}
              onSellChestPassive={onSellChestPassive}
              bindCharacterName={selectedCharacter.name}
              onBindCard={(cardId) => onBindChestCard(cardId, activeCharacterId)}
              onBindPassive={(passiveId) => onBindChestPassive(passiveId, activeCharacterId)}
              onAssignItemToCharacter={(itemId) =>
                onMoveChestItemToCharacter(itemId, activeCharacterId)
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
        characterId={activeCharacterId}
        inBattle={inBattle}
        modsDisabled={modsDisabled}
        modsDisabledTooltip={modsDisabledTooltip}
        squadLocked={squadLocked}
        onEquip={(itemId, slot) => onEquip(activeCharacterId, itemId, slot)}
        onUnequip={(slot) => onUnequip(activeCharacterId, slot)}
        onReorderStash={(itemIds) => onReorderStash(activeCharacterId, itemIds)}
        onSellItem={(itemId) => onSellItem(activeCharacterId, itemId)}
        onInvalidSlot={onInvalidSlot}
        onTransferItem={(itemId, toCharacterId) =>
          onTransferItem(itemId, activeCharacterId, toCharacterId)
        }
        onMoveChestItemToCharacter={onMoveChestItemToCharacter}
        onMoveCharacterItemToChest={(itemId) =>
          onMoveCharacterItemToChest(itemId, activeCharacterId)
        }
        onPickModOffer={(_kind, carrierId, slotIndex, modTemplateId) =>
          onPickModOffer(activeCharacterId, 'item', carrierId, slotIndex, modTemplateId)
        }
        onRemoveMod={(_kind, carrierId, slotIndex) =>
          onRemoveMod(activeCharacterId, 'item', carrierId, slotIndex)
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
              selectedCharacterId={activeCharacterId}
              transferDisabled={transferDisabled}
              onSelectCharacter={handleSelectCharacter}
              onEditAppearance={setAppearanceCharacterId}
              onReleaseCharacter={onReleaseCharacter}
              canReleaseCharacter={canReleaseCharacter}
            />
          ),
          buildColumn: (
            <>
              <CharacterBuildPanel
                campaign={campaign}
                characterId={activeCharacterId}
                focus={focus}
                previewItemId={previewItemId}
              />
              <CardsInventoryView
                campaign={campaign}
                characterId={activeCharacterId}
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
                    activeCharacterId,
                    carrierKind,
                    carrierId,
                    slotIndex,
                    modTemplateId,
                  )
                }
                onRemoveMod={(carrierKind, carrierId, slotIndex) =>
                  onRemoveMod(activeCharacterId, carrierKind, carrierId, slotIndex)
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
